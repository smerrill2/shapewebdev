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

// Marker detection patterns
const MARKER_PATTERN = /\/\/\/\s*(START|END)\s+([\w]+(?:\s*[\w]+)*)(?:\s+position=([\w]+))?\s*$/m;
const INCOMPLETE_MARKER = /\/\/\/\s*(START|END)\s*$/m;

// Add test ID validation
const isTestId = (id) => id.startsWith('test-');

// Validate complete component names
const isCompleteComponentName = (name, buffer, matchIndex) => {
  // Handle cases where we might have a partial name
  if (name.length < 2) return false;
  
  // Check if there's more alphanumeric content immediately after
  const afterMatch = buffer.slice(matchIndex).match(/^[\w\s]+/);
  if (afterMatch && !afterMatch[0].includes('position=')) {
    return false; // More content follows that might be part of the name
  }
  
  return true;
};

// Component ID generation with normalization
const getComponentId = (componentName) => {
  // Remove any whitespace and normalize the name
  const normalizedName = componentName.replace(/\s+/g, '');
  if (normalizedName === 'RootLayout') {
    return 'root_layout';
  }
  return `comp_${normalizedName.toLowerCase()}`;
};

// Enhanced validation for markers
const validateMarkers = (markerType, markerName, currentComponentName, buffer, matchIndex) => {
  if (!markerName || !markerType) {
    console.warn('❌ Invalid marker format:', { markerType, markerName });
    return false;
  }
  if (markerType === 'END' && !currentComponentName) {
    console.warn('❌ END marker without active component');
    return false;
  }
  // Check for incomplete markers
  if (INCOMPLETE_MARKER.test(markerName)) {
    console.warn('❌ Incomplete marker detected');
    return false;
  }
  // Validate complete component name
  if (!isCompleteComponentName(markerName, buffer, matchIndex)) {
    console.warn('❌ Incomplete component name detected:', markerName);
    return false;
  }
  return true;
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

// Validate component code structure with more flexibility
const validateComponent = (code, componentName) => {
  try {
    // Basic syntax check: must be a valid function or const component
    if (!code.match(/(export\s+)?(default\s+)?(function|const)\s+\w+/)) {
      console.warn(`Invalid component format for ${componentName}: Missing component definition`);
      return false;
    }

    // Check for component name consistency, but be more flexible
    const nameMatch = code.match(/(function|const)\s+(\w+)/);
    if (!nameMatch) {
      console.warn(`Unable to identify component name in code`);
      return false;
    }

    // Allow for more flexible component patterns
    const hasJSXReturn = code.includes('return') && (
      code.includes('<') || 
      code.includes('React.createElement') || 
      code.includes('jsx')
    );

    if (!hasJSXReturn) {
      console.warn(`Invalid component format for ${componentName}: No JSX return detected`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Component validation failed:', error);
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
      componentStates.set(id, updated);
      return updated;
    };

    const createMetadata = (componentId, type) => {
      const state = componentStates.get(componentId);
      if (!state) return null;

      return {
        componentId: state.id,
        componentName: state.name,
        position: state.position,
        isComplete: type === 'stop' ? true : undefined,
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
        startTime: Date.now()
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
            error: 'Component validation failed'
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
          const markerName = match[2].trim();   // e.g. RootLayout, Hero, etc. (now with trim)
          const markerPosition = match[3] || ''; // e.g. header, main, etc.

          // Validate markers with improved checks
          if (!validateMarkers(markerType, markerName, currentComponentName, buffer, match.index)) {
            console.log('⏳ Waiting for complete component name');
            return; // Wait for more data instead of skipping
          }

          const matchIndex = match.index;
          const codeBeforeMarker = buffer.slice(0, matchIndex);

          // If we see a new START while still inside a component, stop the old one
          if (currentComponentId && markerType === 'START') {
            console.log(`⚠️ New component ${markerName} started while ${currentComponentName} is active - stopping current`);
            accumulatedCode += codeBeforeMarker;
            stopComponent();
          }

          if (currentComponentId) {
            accumulatedCode += codeBeforeMarker;
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