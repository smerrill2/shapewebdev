const { generate } = require('../utils/aiClient');

// Constants for validation and safety
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB max buffer size
const VALID_POSITIONS = [
  // Layout positions
  'header',
  'main',
  'footer',
  'nav',
  'sidebar',
  // Content sections
  'hero',
  'features',
  'testimonials',
  'pricing',
  'cta',
  'contact',
  'content',
  'stats',
  'faq',
  'team',
  // Special handling
  'custom'
];
const MAX_COMPONENT_TIME = 30000; // 30s timeout
const MAX_COMPOUND_WAIT_TIME = 10000; // 10s max wait for subcomponents

// Define compound component relationships with validation patterns
const COMPOUND_COMPONENTS = {
  NavigationMenu: {
    subcomponentPatterns: {
      List: /NavigationMenu\.List/,
      Item: /NavigationMenu\.Item/,
      Link: /NavigationMenu\.Link/,
      Content: /NavigationMenu\.Content/,
      Trigger: /NavigationMenu\.Trigger/,
      Viewport: /NavigationMenu\.Viewport/
    }
  },
  Card: {
    subcomponentPatterns: {
      Header: /Card\.Header/,
      Title: /Card\.Title/,
      Description: /Card\.Description/,
      Content: /Card\.Content/,
      Footer: /Card\.Footer/
    }
  },
  Dialog: {
    subcomponentPatterns: {
      Trigger: /Dialog\.Trigger/,
      Content: /Dialog\.Content/,
      Header: /Dialog\.Header/,
      Footer: /Dialog\.Footer/,
      Title: /Dialog\.Title/,
      Description: /Dialog\.Description/,
      Close: /Dialog\.Close/
    }
  },
  DropdownMenu: {
    subcomponentPatterns: {
      Trigger: /DropdownMenu\.Trigger/,
      Content: /DropdownMenu\.Content/,
      Item: /DropdownMenu\.Item/,
      CheckboxItem: /DropdownMenu\.CheckboxItem/,
      RadioItem: /DropdownMenu\.RadioItem/,
      Label: /DropdownMenu\.Label/,
      Separator: /DropdownMenu\.Separator/,
      Shortcut: /DropdownMenu\.Shortcut/,
      SubTrigger: /DropdownMenu\.SubTrigger/,
      SubContent: /DropdownMenu\.SubContent/,
      Group: /DropdownMenu\.Group/
    }
  }
};

// Critical components that need error recovery
const CRITICAL_COMPONENTS = new Set([
  'Header',
  'NavigationMenu',
  'RootLayout'
]);

// Debug mode flag
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// More strict marker pattern that won't include export function
const MARKER_PATTERN = /\/\/\/\s*(START|END)\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*(?:position=([\w]+))?\s*$/m;
const INCOMPLETE_MARKER = /\/\/\/\s*(START|END)\s*$/m;

// Add validation for component names
const VALID_COMPONENT_NAME = /^[A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?$/;

// Add test ID validation
const isTestId = (id) => id.startsWith('test-');

// Validate complete component names with improved checks
const isCompleteComponentName = (name, buffer, matchIndex) => {
  // Basic validation
  if (!name || typeof name !== 'string') return false;
  
  // Must match our valid component name pattern
  if (!VALID_COMPONENT_NAME.test(name)) {
    console.warn('❌ Invalid component name format:', name);
    return false;
  }
  
  // Check for export function following the marker
  const afterMatch = buffer.slice(matchIndex).split('\n')[1];
  if (afterMatch && afterMatch.trim().startsWith('export')) {
    // Verify the function name matches our component name exactly
    const functionMatch = afterMatch.match(/export\s+(?:default\s+)?function\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*\(/);
    if (functionMatch && functionMatch[1] !== name) {
      console.warn('❌ Component name does not match function name:', {
        componentName: name,
        functionName: functionMatch[1]
      });
      return false;
    }
  }

  return true;
};

// Enhanced marker validation
const validateMarkers = (markerType, markerName, currentComponentName, buffer, matchIndex) => {
  if (!markerName || !markerType) {
    console.warn('❌ Invalid marker format:', { markerType, markerName });
    return false;
  }

  // Validate component name format
  if (!VALID_COMPONENT_NAME.test(markerName)) {
    console.warn('❌ Invalid component name format:', markerName);
    return false;
  }

  if (markerType === 'END' && !currentComponentName) {
    console.warn('❌ END marker without active component');
    return false;
  }

  if (markerType === 'END' && markerName !== currentComponentName) {
    console.warn('❌ END marker mismatch:', {
      expected: currentComponentName,
      received: markerName
    });
    return false;
  }

  // Check for incomplete markers
  if (INCOMPLETE_MARKER.test(markerName)) {
    console.warn('❌ Incomplete marker detected');
    return false;
  }

  // Validate complete component name
  if (!isCompleteComponentName(markerName, buffer, matchIndex)) {
    console.warn('❌ Invalid component name:', markerName);
    return false;
  }

  return true;
};

// Component ID generation with improved normalization
const getComponentId = (componentName) => {
  // Ensure we have a valid component name
  if (!VALID_COMPONENT_NAME.test(componentName)) {
    console.warn('⚠️ Invalid component name format in ID generation:', componentName);
    return `comp_invalid_${Date.now()}`;
  }

  // Special case for RootLayout
  if (componentName === 'RootLayout') {
    return 'comp_rootlayout';
  }

  // Normalize the name
  return `comp_${componentName.toLowerCase()}`;
};

// Position normalization helper
const normalizePosition = (position) => {
  if (!position) {
    if (DEBUG_MODE) console.log('📍 No position provided, defaulting to main');
    return 'main';
  }

  // Special handling for test components
  if (position.startsWith('test-') || position.toLowerCase().includes('test')) {
    if (DEBUG_MODE) console.log('📍 Test component detected, using main position');
    return 'main';
  }
  
  const normalized = position.toLowerCase().trim();
  const final = VALID_POSITIONS.includes(normalized) ? normalized : 'custom';
  
  if (DEBUG_MODE) {
    console.log('📍 Position normalization:', {
      original: position,
      normalized,
      final,
      isValid: VALID_POSITIONS.includes(normalized),
      isTestComponent: position.startsWith('test-')
    });
  }
  
  return final;
};

// Update getComponentMetadata to use normalized positions
const getComponentMetadata = (chunk, existingMetadata = null) => {
  if (DEBUG_MODE) {
    console.log('🔍 Processing component metadata:', {
      hasExistingMetadata: !!existingMetadata,
      chunkMetadata: chunk.metadata,
      text: chunk.delta?.text?.slice(0, 100) // First 100 chars for context
    });
  }

  // If chunk already has metadata, validate and return it
  if (chunk.metadata?.componentName && chunk.metadata.componentName !== 'UnknownComponent') {
    const position = normalizePosition(chunk.metadata.position);
    if (DEBUG_MODE) {
      console.log('✅ Using existing metadata with normalized position:', {
        componentName: chunk.metadata.componentName,
        originalPosition: chunk.metadata.position,
        normalizedPosition: position
      });
    }
    return {
      ...chunk.metadata,
      position
    };
  }

  // Try to extract from content if no metadata
  const startMatch = chunk.delta?.text?.match(/\/\/\/\s*START\s+(\w+)(?:\s+position=(\w+))?/);
  if (startMatch) {
    const position = normalizePosition(startMatch[2]);
    const metadata = {
      componentName: startMatch[1],
      position,
      componentId: startMatch[1] === 'RootLayout' ? 'root_layout' : `comp_${startMatch[1].toLowerCase()}`
    };
    
    if (DEBUG_MODE) {
      console.log('✅ Extracted metadata from content:', {
        match: startMatch[0],
        componentName: metadata.componentName,
        originalPosition: startMatch[2],
        normalizedPosition: position
      });
    }
    
    return metadata;
  }

  // Fallback to existing metadata or generate temporary
  const fallbackMetadata = {
    componentName: 'UnknownComponent',
    position: normalizePosition(existingMetadata?.position),
    componentId: 'comp_unknown'
  };

  if (DEBUG_MODE) {
    console.log('⚠️ Using fallback metadata:', fallbackMetadata);
  }

  return fallbackMetadata;
};

// Helper function to check if we should accumulate more code for compound components
const shouldAccumulateMore = (componentName, accumulatedCode, startTime) => {
  const compoundDef = COMPOUND_COMPONENTS[componentName];
  if (!compoundDef) return false;

  // Check if we've exceeded the max wait time
  const waitTime = Date.now() - startTime;
  if (waitTime > MAX_COMPOUND_WAIT_TIME) {
    console.warn(`⚠️ Exceeded max wait time (${MAX_COMPOUND_WAIT_TIME}ms) for ${componentName}`);
    return false;
  }

  // Check for actual component definitions using patterns
  return Object.entries(compoundDef.subcomponentPatterns).some(([name, pattern]) => {
    const hasDefinition = pattern.test(accumulatedCode);
    if (!hasDefinition && DEBUG_MODE) {
      console.log(`🔍 Missing subcomponent definition for ${name}`);
    }
    return !hasDefinition;
  });
};

// Validate component code structure
const validateComponent = (code, componentName) => {
  try {
    // Check for basic syntax requirements
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid component code');
    }

    // Check for export statement
    if (!code.includes('export default') && !code.includes('export function')) {
      throw new Error('Component must have an export statement');
    }

    // Check for function definition
    if (!code.includes('function')) {
      throw new Error('Component must be a function');
    }

    // Check for return statement with JSX
    const hasJSXReturn = code.includes('return') && (
      code.includes('<') ||
      code.includes('React.createElement') ||
      code.includes('jsx')
    );
    if (!hasJSXReturn) {
      throw new Error('Component must return JSX');
    }

    // For compound components, check for required subcomponents
    const compoundDef = COMPOUND_COMPONENTS[componentName];
    if (compoundDef) {
      const missingSubcomponents = Object.entries(compoundDef.subcomponentPatterns)
        .filter(([name, pattern]) => !pattern.test(code))
        .map(([name]) => name);

      if (missingSubcomponents.length > 0) {
        throw new Error(`Missing required subcomponents: ${missingSubcomponents.join(', ')}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Component validation failed:', error.message);
    return false;
  }
};

// Enhanced error handling
const handleStreamError = (error, res, currentComponentId, currentComponentName, accumulatedCode, stopComponent) => {
  console.error('❌ Stream error:', error);
  if (currentComponentId && accumulatedCode.trim()) {
    // Try to salvage current component
    console.log('⚠️ Attempting to salvage component before error handling');
    stopComponent();
  }
  if (res.writable) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      code: 'STREAM_ERROR',
      message: error.message,
      retryable: false
    })}\n\n`);
    res.end();
  }
};

const generateController = async (req, res) => {
  try {
    // Validate project and version IDs
    const { projectId, versionId } = req.query;
    if (!projectId || !versionId) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        code: 'MISSING_IDS',
        message: 'Missing projectId or versionId',
        retryable: false
      })}\n\n`);
      res.end();
      return;
    }

    // Allow test IDs to bypass database validation
    if (!isTestId(projectId) || !isTestId(versionId)) {
      console.log('⚠️ Non-test IDs would be validated against database');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
    console.log('📡 SSE headers set');

    const { prompt, style, requirements } = req.body;
    const stream = await generate(prompt, style, requirements);

    // Handle client disconnect
    req.on('close', () => {
      console.log('❌ Client disconnected');
      stream.destroy();
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Component state management
    const componentStates = new Map();
    
    const updateComponentState = (id, updates) => {
      const current = componentStates.get(id) || {};
      const updated = {
        ...current,
        ...updates,
        lastUpdated: Date.now()
      };

      // Handle compound component relationships
      if (updates.name) {
        // Check if this is a subcomponent
        for (const [parent, children] of Object.entries(COMPOUND_COMPONENTS)) {
          if (Array.isArray(children) && children.includes(updates.name)) {
            const parentId = getComponentId(parent);
            updated.parentId = parentId;
            
            // Update parent's children list
            const parentState = componentStates.get(parentId) || {};
            if (!parentState.children) parentState.children = new Set();
            parentState.children.add(id);
            componentStates.set(parentId, parentState);

            if (DEBUG_MODE) {
              console.log(`🔗 Linked subcomponent ${updates.name} to parent ${parent}`);
            }
            break;
          }
        }
      }

      componentStates.set(id, updated);
      return updated;
    };

    const createMetadata = (componentId, type) => {
      const state = componentStates.get(componentId);
      if (!state) return null;

      // Check if this is a critical component
      const isCritical = CRITICAL_COMPONENTS.has(state.name);

      // For compound components, check if all required subcomponents are present
      let isCompoundComplete = true;
      if (COMPOUND_COMPONENTS[state.name]) {
        const requiredSubcomponents = new Set(COMPOUND_COMPONENTS[state.name].subcomponents);
        const actualSubcomponents = state.children ? Array.from(state.children).map(id => componentStates.get(id)?.name) : [];
        
        for (const required of requiredSubcomponents) {
          if (!actualSubcomponents.includes(required)) {
            isCompoundComplete = false;
            if (DEBUG_MODE) {
              console.warn(`⚠️ Missing required subcomponent ${required} for ${state.name}`);
            }
            break;
          }
        }
      }

      return {
        componentId: state.id,
        componentName: state.name,
        position: state.position,
        isComplete: type === 'stop' ? true : undefined,
        isCritical,
        isCompoundComplete,
        error: !isCompoundComplete && type === 'stop' ? 'INCOMPLETE_COMPOUND' : undefined,
        sections: type === 'stop' ? {
          header: Array.from(sections.header),
          main: Array.from(sections.main),
          footer: Array.from(sections.footer)
        } : undefined
      };
    };

    let buffer = '';
    let currentComponentId = null;
    let currentComponentName = null;
    let accumulatedCode = '';
    let componentStartTime = null;
    const sections = { header: new Set(), main: new Set(), footer: new Set() };

    // Helper function to start a component
    const startComponent = (name, position, componentId) => {
      console.log(`🎬 Starting component ${name} in position ${position}`);
      componentStartTime = Date.now();
      currentComponentName = name;
      currentComponentId = componentId;

      if (!VALID_POSITIONS.includes(position)) {
        position = 'main';
      }
      sections[position].add(componentId);

      // Initialize component state
      updateComponentState(componentId, {
        id: componentId,
        name: name,
        position: position,
        isStreaming: true,
        isComplete: false,
        code: '',
        startTime: Date.now(),
        isCompound: !!COMPOUND_COMPONENTS[name]
      });

      // Notify frontend of new component
      res.write(`data: ${JSON.stringify({
        type: 'content_block_start',
        metadata: createMetadata(componentId, 'start')
      })}\n\n`);

      if (typeof res.flush === 'function') {
        res.flush();
      }
    };

    // Helper function to finalize a component
    const stopComponent = (componentDuration) => {
      if (!currentComponentId) return;

      console.log(`✅ Completing component ${currentComponentName} with ${accumulatedCode.length} bytes`);
      
      if (!accumulatedCode.trim()) {
        console.log(`⚠️ No code accumulated for ${currentComponentName}, skipping.`);
      } else {
        // For compound components, ensure we have all subcomponents before stopping
        if (COMPOUND_COMPONENTS[currentComponentName]) {
          const shouldWait = shouldAccumulateMore(currentComponentName, accumulatedCode, componentStartTime);
          
          if (shouldWait) {
            if (DEBUG_MODE) {
              console.log(`🔄 Waiting for more subcomponents for ${currentComponentName}`);
            }
            return; // Don't stop yet, wait for more code
          } else if (Date.now() - componentStartTime > MAX_COMPOUND_WAIT_TIME) {
            // If we've exceeded wait time, mark as error
            updateComponentState(currentComponentId, {
              isStreaming: false,
              isComplete: false,
              error: 'COMPOUND_TIMEOUT',
              code: accumulatedCode
            });

            res.write(`data: ${JSON.stringify({
              type: 'error',
              code: 'COMPOUND_TIMEOUT',
              message: `Component ${currentComponentName} timed out waiting for subcomponents`,
              metadata: createMetadata(currentComponentId, 'error')
            })}\n\n`);

            // Reset state and return
            currentComponentId = null;
            currentComponentName = null;
            accumulatedCode = '';
            componentStartTime = null;
            return;
          }
        }

        if (validateComponent(accumulatedCode, currentComponentName)) {
          // Update component state
          updateComponentState(currentComponentId, {
            isStreaming: false,
            isComplete: true,
            code: accumulatedCode,
            duration: componentDuration || Date.now() - componentStartTime
          });

          // Send accumulated code
          res.write(`data: ${JSON.stringify({
            type: 'content_block_delta',
            metadata: createMetadata(currentComponentId, 'delta'),
            delta: { text: accumulatedCode }
          })}\n\n`);

          // Mark as complete
          res.write(`data: ${JSON.stringify({
            type: 'content_block_stop',
            metadata: createMetadata(currentComponentId, 'stop')
          })}\n\n`);
        } else {
          console.warn(`❌ Invalid component code for ${currentComponentName}`);
          // Update state to reflect validation failure
          updateComponentState(currentComponentId, {
            isStreaming: false,
            isComplete: false,
            error: 'VALIDATION_FAILED'
          });
        }
      }
      
      // Reset state
      currentComponentId = null;
      currentComponentName = null;
      accumulatedCode = '';
      componentStartTime = null;
    };

    // Handle stream events
    stream.on('data', (chunk) => {
      try {
        if (!res.writable) {
          console.log('❌ Response no longer writable');
          stream.destroy();
          return;
        }

        // Check for component timeout
        if (currentComponentId && componentStartTime && 
            (Date.now() - componentStartTime > MAX_COMPONENT_TIME)) {
          console.warn(`⚠️ Component ${currentComponentName} timed out after ${MAX_COMPONENT_TIME}ms`);
          stopComponent();
        }

        // Avoid huge memory usage
        if (buffer.length > MAX_BUFFER_SIZE) {
          console.warn('🚨 Buffer overflow - clearing');
          if (currentComponentId) {
            // Try to salvage current component before clearing
            stopComponent();
          }
          buffer = '';
          accumulatedCode = '';
        }

        // Parse Anthropic's format
        const event = JSON.parse(chunk.toString());

        if (event.type === 'content_block_delta' && event.delta?.text) {
          // Accumulate text in buffer
          buffer += event.delta.text;
          console.log(`📝 Accumulated ${event.delta.text.length} bytes in buffer`);
        }

        // Skip processing if we detect an incomplete marker
        if (INCOMPLETE_MARKER.test(buffer)) {
          console.log('⏳ Detected incomplete marker, waiting for more data');
          return;
        }

        // Keep searching for complete markers
        let match;
        while ((match = buffer.match(MARKER_PATTERN))) {
          const markerFull = match[0];
          const markerType = match[1];          // START or END
          const markerName = match[2].trim();   // e.g. Header, RootLayout, etc.
          const markerPosition = match[3] || ''; // e.g. header, main, etc.

          // Instead of halting on an incomplete marker, we flush a partial update
          if (!validateMarkers(markerType, markerName, currentComponentName, buffer, match.index)) {
            console.warn('⚠️ Incomplete marker detected; emitting partial update.');
            if (currentComponentId && accumulatedCode.trim()) {
              res.write(`data: ${JSON.stringify({
                type: 'content_block_delta',
                metadata: createMetadata(currentComponentId, 'delta'),
                delta: { text: accumulatedCode }
              })}\n\n`);
            }
            // Remove the problematic marker from buffer and continue processing
            const markerLength = markerFull.length;
            buffer = buffer.slice(match.index + markerLength);
            continue;
          }

          const matchIndex = match.index;
          const codeBeforeMarker = buffer.slice(0, matchIndex);

          // If we see a new START while still inside a component, emit current code and stop
          if (currentComponentId && markerType === 'START') {
            console.log(`⚠️ New component ${markerName} started while ${currentComponentName} is active - emitting current`);
            accumulatedCode += codeBeforeMarker;
            
            // Emit the accumulated code before stopping
            res.write(`data: ${JSON.stringify({
              type: 'content_block_delta',
              metadata: createMetadata(currentComponentId, 'delta'),
              delta: { text: accumulatedCode }
            })}\n\n`);
            
            stopComponent();
          }

          if (currentComponentId) {
            accumulatedCode += codeBeforeMarker;
            
            // Emit accumulated code as a delta update
            if (accumulatedCode.trim()) {
              res.write(`data: ${JSON.stringify({
                type: 'content_block_delta',
                metadata: createMetadata(currentComponentId, 'delta'),
                delta: { text: accumulatedCode }
              })}\n\n`);
              accumulatedCode = ''; // Reset after emitting
            }
          }

          // Remove consumed portion from buffer
          buffer = buffer.slice(matchIndex + markerFull.length);

          if (markerType === 'START') {
            const componentId = getComponentId(markerName);
            console.log(`🎯 Starting component ${markerName} with ID ${componentId}`);
            startComponent(markerName, markerPosition, componentId);
          } else if (markerType === 'END') {
            if (markerName === currentComponentName) {
              const componentDuration = Date.now() - componentStartTime;
              console.log(`✅ Ending component ${markerName} after ${componentDuration}ms`);
              
              // Emit any remaining code before stopping
              if (accumulatedCode.trim()) {
                res.write(`data: ${JSON.stringify({
                  type: 'content_block_delta',
                  metadata: createMetadata(currentComponentId, 'delta'),
                  delta: { text: accumulatedCode }
                })}\n\n`);
              }
              
              stopComponent(componentDuration);
            } else {
              console.warn(`❌ END marker for ${markerName} but current is ${currentComponentName}`);
            }
          }
        }

        // If in a component, accumulate any leftover buffer
        if (currentComponentId) {
          accumulatedCode += buffer;
          buffer = '';
        }

        // Flush SSE to client
        if (typeof res.flush === 'function') {
          res.flush();
        }
      } catch (error) {
        handleStreamError(error, res, currentComponentId, currentComponentName, accumulatedCode, stopComponent);
        stream.destroy();
      }
    });

    // When the stream ends
    stream.on('end', () => {
      console.log('✅ Stream complete');

      // If we still have a component open, close it
      if (currentComponentId && accumulatedCode.trim()) {
        accumulatedCode += buffer;
        buffer = '';

        if (validateComponent(accumulatedCode, currentComponentName)) {
          const componentDuration = Date.now() - componentStartTime;
          
          // Update final component state
          updateComponentState(currentComponentId, {
            isStreaming: false,
            isComplete: true,
            code: accumulatedCode,
            duration: componentDuration
          });

          // Final block delta
          res.write(`data: ${JSON.stringify({
            type: 'content_block_delta',
            metadata: createMetadata(currentComponentId, 'delta'),
            delta: { text: accumulatedCode }
          })}\n\n`);

          // Mark as complete
          res.write(`data: ${JSON.stringify({
            type: 'content_block_stop',
            metadata: createMetadata(currentComponentId, 'stop')
          })}\n\n`);
        }
      }

      // Get final state of all components
      const finalState = Array.from(componentStates.values()).map(state => ({
        id: state.id,
        name: state.name,
        position: state.position,
        isComplete: state.isComplete,
        duration: state.duration
      }));

      // Send final completion signal with complete metadata
      res.write(`data: ${JSON.stringify({
        type: 'message_stop',
        metadata: {
          sections: {
            header: Array.from(sections.header),
            main: Array.from(sections.main),
            footer: Array.from(sections.footer)
          },
          totalComponents: sections.header.size + sections.main.size + sections.footer.size,
          components: finalState
        }
      })}\n\n`);
      res.end();
    });

    // Handle stream errors
    stream.on('error', (err) => {
      handleStreamError(err, res, currentComponentId, currentComponentName, accumulatedCode, stopComponent);
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
    if (res.writable) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        code: error.code || 'GENERATION_ERROR',
        message: error.message,
        retryable: error.retryable ?? false
      })}\n\n`);
      res.end();
    }
  }
};

module.exports = generateController; 