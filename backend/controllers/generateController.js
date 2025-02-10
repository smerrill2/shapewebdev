const { generate } = require('../utils/aiClient');

// Constants for validation and safety
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB max buffer size
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

// Add validation for component names with H prefix
const VALID_COMPONENT_NAME = /^(?!H+[A-Z])[A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?$/;

// Add test ID validation
const isTestId = (id) => id.startsWith('test-');

// Add component alias mapping
const COMPONENT_ALIASES = {
  'Navigation': 'Header',
  'Nav': 'Header',
  'NavigationBar': 'Header',
  'Navbar': 'Header'
};

/**
 * MarkerValidator: A unified class to handle all marker validation logic
 */
class MarkerValidator {
  static MARKER_PATTERN = /\/\/\/\s*(START|END)\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*(?:position=([\w]+))?\s*$/m;
  static INCOMPLETE_MARKER = /\/\/\/\s*(START|END)\s*$/m;
  static VALID_COMPONENT_NAME = /^(?!H+[A-Z])[A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?$/;

  /**
   * Validates a marker string and returns a structured result
   * @param {string} markerStr - The full marker string to validate
   * @param {string} currentComponentName - The name of the current active component (for END markers)
   * @param {string} buffer - The full code buffer (for context validation)
   * @param {number} matchIndex - The index where the marker was found
   * @returns {{ isValid: boolean, type: string, name: string, position: string, error?: string }}
   */
  static validateMarker(markerStr, currentComponentName = null, buffer = '', matchIndex = 0) {
    // Default invalid result
    const invalidResult = { isValid: false, type: '', name: '', position: '', error: 'Invalid marker format' };

    if (!markerStr || typeof markerStr !== 'string') {
      return { ...invalidResult, error: 'Marker must be a non-empty string' };
    }

    // Check for incomplete markers first
    if (this.INCOMPLETE_MARKER.test(markerStr)) {
      return { ...invalidResult, error: 'Incomplete marker detected' };
    }

    // Extract marker components
    const match = markerStr.match(this.MARKER_PATTERN);
    if (!match) {
      return { ...invalidResult, error: 'Marker does not match required pattern' };
    }

    const [, type, name, position = 'main'] = match;
    
    // Clean the component name (remove H prefixes)
    const cleanName = name.replace(/^H+/, '');

    // Validate component name format
    if (!this.VALID_COMPONENT_NAME.test(cleanName)) {
      return { ...invalidResult, error: `Invalid component name format: ${name}` };
    }

    // For END markers, validate against current component
    if (type === 'END') {
      if (!currentComponentName) {
        return { ...invalidResult, error: 'END marker without active component' };
      }

      const cleanCurrentName = currentComponentName.replace(/^H+/, '');
      if (cleanName !== cleanCurrentName) {
        return { ...invalidResult, error: `END marker mismatch: expected ${cleanCurrentName}, got ${cleanName}` };
      }
    }

    // For START markers, validate the following code context
    if (type === 'START' && buffer) {
      const afterMatch = buffer.slice(matchIndex).split('\n')[1];
      if (afterMatch && afterMatch.trim().startsWith('export')) {
        const functionMatch = afterMatch.match(/export\s+(?:default\s+)?function\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*\(/);
        if (functionMatch && functionMatch[1] !== cleanName) {
          return { ...invalidResult, error: `Component name does not match function name: ${functionMatch[1]}` };
        }
      }
    }

    // All validations passed
    return {
      isValid: true,
      type,
      name: cleanName,
      position: position.toLowerCase(),
      error: null
    };
  }

  /**
   * Helper method to validate just the component name
   */
  static isValidComponentName(name) {
    if (!name || typeof name !== 'string') return false;
    const cleanName = name.replace(/^H+/, '');
    return this.VALID_COMPONENT_NAME.test(cleanName);
  }

  /**
   * Helper method to normalize component names
   */
  static normalizeComponentName(name) {
    return name.replace(/^H+/, '');
  }
}

// Replace the old validation functions with the new unified approach
const validateMarkers = (markerType, markerName, currentComponentName, buffer, matchIndex) => {
  const result = MarkerValidator.validateMarker(
    `/// ${markerType} ${markerName}`,
    currentComponentName,
    buffer,
    matchIndex
  );
  return result.isValid;
};

const validateMarker = (marker, currentComponentName) => {
  const result = MarkerValidator.validateMarker(marker, currentComponentName);
  return result.isValid;
};

const isCompleteComponentName = (name, buffer, matchIndex) => {
  return MarkerValidator.isValidComponentName(name);
};

// Update the getComponentMetadata function to use the new validator
const getComponentMetadata = (chunk, existingMetadata = null) => {
  if (chunk.metadata?.componentName && chunk.metadata.componentName !== 'UnknownComponent') {
    return {
      ...chunk.metadata,
      position: chunk.metadata.position?.toLowerCase().trim() || 'main'
    };
  }

  const startMarkerText = chunk.delta?.text?.match(/\/\/\/\s*START\s+\w+(?:\s+position=\w+)?/)?.[0];
  if (startMarkerText) {
    const result = MarkerValidator.validateMarker(startMarkerText);
    if (result.isValid) {
      return {
        componentName: result.name,
        position: result.position,
        componentId: result.name === 'RootLayout' ? 'root_layout' : `comp_${result.name.toLowerCase()}`
      };
    }
  }

  return {
    componentName: 'UnknownComponent',
    position: existingMetadata?.position?.toLowerCase().trim() || 'main',
    componentId: 'comp_unknown'
  };
};

// Update BufferManager to use the new validator
class BufferManager {
  constructor() {
    this.buffer = '';
    this.lastProcessedIndex = 0;
  }

  append(text) {
    this.buffer += text;
  }

  findNextMarker() {
    const match = MarkerValidator.MARKER_PATTERN.exec(this.buffer.slice(this.lastProcessedIndex));
    if (!match) return -1;
    return match.index + this.lastProcessedIndex;
  }

  getContentUpTo(index) {
    const content = this.buffer.slice(this.lastProcessedIndex, index);
    this.lastProcessedIndex = index;
    return content;
  }

  consumeProcessedContent() {
    // Remove processed content and reset index
    this.buffer = this.buffer.slice(this.lastProcessedIndex);
    this.lastProcessedIndex = 0;
  }

  clear() {
    this.buffer = '';
    this.lastProcessedIndex = 0;
  }

  get length() {
    return this.buffer.length;
  }

  get remainingContent() {
    return this.buffer.slice(this.lastProcessedIndex);
  }
}

// Simplify position handling to just pass through whatever the AI generates
const normalizePosition = (position) => {
  return position?.toLowerCase().trim() || 'main';
};

// Update sections tracking to be completely dynamic
const sections = new Map([
  ['header', new Set()],
  ['main', new Set()],
  ['footer', new Set()]
]);

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

// Add carry-over buffer tracking
const CARRY_OVER_MAX_SIZE = 1024; // 1KB max carry-over size

const processComponent = (chunk, currentComponent) => {
  // Extract marker information
  const markerMatch = chunk.match(MARKER_PATTERN);
  if (!markerMatch) return null;
  
  const [_, type, name, position] = markerMatch;
  let cleanName = name.replace(/^H+/, '');
  cleanName = COMPONENT_ALIASES[cleanName] || cleanName;
  
  // Create component ID using clean name
  const componentId = `comp_${cleanName.toLowerCase()}`;
  
  // For START markers, initialize component tracking
  if (type === 'START') {
    return {
      type: 'content_block_start',
      metadata: {
        componentName: cleanName,
        position: position || 'main',
        componentId
      }
    };
  }
  
  // For END markers, validate and finalize component
  if (type === 'END' && currentComponent) {
    const cleanCurrentName = currentComponent.name.replace(/^H+/, '');
    const aliasedCurrentName = COMPONENT_ALIASES[cleanCurrentName] || cleanCurrentName;
    
    if (cleanName === aliasedCurrentName) {
      return {
        type: 'content_block_stop',
        metadata: {
          componentId,
          isComplete: true
        }
      };
    }
  }
  
  return null;
};

// Add new buffer management class with deduplication
class ComponentBuffer {
  constructor() {
    this.components = new Map();
    this.currentComponent = null;
  }

  startComponent(componentId, name, position) {
    this.currentComponent = {
      id: componentId,
      name,
      position,
      buffer: '',
      isComplete: false
    };
    this.components.set(componentId, this.currentComponent);
  }

  appendToComponent(componentId, content) {
    const component = this.components.get(componentId);
    if (component) {
      // Only append if this isn't a duplicate function declaration
      if (!this.isDuplicateDeclaration(component.buffer, content)) {
        component.buffer += content;
      }
    }
  }

  isDuplicateDeclaration(existingBuffer, newContent) {
    // Check if the new content starts with a function declaration we already have
    const functionDeclaration = /(?:export\s+)?(?:function|const)\s+[A-Z][A-Za-z0-9]*\s*(?:\(|=)/;
    if (functionDeclaration.test(newContent)) {
      const match = newContent.match(functionDeclaration);
      if (match && existingBuffer.includes(match[0])) {
        return true;
      }
    }
    return false;
  }

  completeComponent(componentId) {
    const component = this.components.get(componentId);
    if (component) {
      component.isComplete = true;
      this.currentComponent = null;
    }
  }

  getComponent(componentId) {
    return this.components.get(componentId);
  }

  clear() {
    this.components.clear();
    this.currentComponent = null;
  }
}

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

      // Safely get section contents
      const getSectionComponents = (sectionName) => {
        const section = sections.get(sectionName);
        return section ? Array.from(section) : [];
      };

      return {
        componentId: state.id,
        componentName: state.name,
        position: state.position,
        isComplete: type === 'stop' ? true : undefined,
        isCritical,
        isCompoundComplete,
        error: !isCompoundComplete && type === 'stop' ? 'INCOMPLETE_COMPOUND' : undefined,
        sections: type === 'stop' ? {
          header: getSectionComponents('header'),
          main: getSectionComponents('main'),
          footer: getSectionComponents('footer')
        } : undefined
      };
    };

    let buffer = '';
    let currentComponentId = null;
    let currentComponentName = null;
    let accumulatedCode = '';
    let componentStartTime = null;

    // Helper function to start a component
    const startComponent = (name, position, componentId) => {
      console.log(`🎬 Starting component ${name} in position ${position}`);
      componentStartTime = Date.now();
      currentComponentName = name;
      currentComponentId = componentId;

      // Add position to sections if it doesn't exist
      if (!sections.has(position)) {
        sections.set(position, new Set());
      }
      sections.get(position).add(componentId);

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

    // Initialize both buffer managers
    const bufferManager = new BufferManager();
    const componentBuffer = new ComponentBuffer();

    // Handle stream events
    stream.on('data', (chunk) => {
      try {
        if (!res.writable) {
          console.log('❌ Response no longer writable');
          stream.destroy();
          return;
        }

        // Parse Anthropic's format
        const event = JSON.parse(chunk.toString());
        console.log('📦 Processing chunk:', event.type, event);

        // Handle different event types
        switch (event.type) {
          case 'message_start':
            console.log('🎬 Message started');
            // Initialize stream state
            currentComponentId = null;
            currentComponentName = null;
            bufferManager.clear();
            componentBuffer.clear();
            componentStartTime = null;
            
            // Send message_start event to client
            res.write(`data: ${JSON.stringify({
              type: 'message_start',
              metadata: {
                ...event.metadata,
                streamStarted: true,
                timestamp: Date.now()
              }
            })}\n\n`);

            // Ensure the stream stays alive
            if (typeof res.flush === 'function') {
              res.flush();
            }
            break;

          case 'content_block_start':
            console.log('📝 Content block started');
            if (event.content_block?.text?.trim()) {
              bufferManager.append(event.content_block.text);
            }
            break;

          case 'content_block_delta':
            if (event.delta?.text) {
              console.log('✍️ Content delta received:', event.delta.text.slice(0, 50) + '...');
              bufferManager.append(event.delta.text);

              // Process markers
              let markerIndex;
              while ((markerIndex = bufferManager.findNextMarker()) !== -1) {
                // Get content before marker
                const contentBeforeMarker = bufferManager.getContentUpTo(markerIndex);
                
                // Emit content if we have an active component
                if (currentComponentId && contentBeforeMarker.trim()) {
                  // Use ComponentBuffer to prevent duplicates
                  componentBuffer.appendToComponent(currentComponentId, contentBeforeMarker);
                  const component = componentBuffer.getComponent(currentComponentId);
                  
                  res.write(`data: ${JSON.stringify({
                    type: 'content_block_delta',
                    metadata: createMetadata(currentComponentId, 'delta'),
                    delta: { text: contentBeforeMarker }
                  })}\n\n`);
                }

                // Find the end of the marker line
                const markerEndIndex = bufferManager.buffer.indexOf('\n', markerIndex);
                if (markerEndIndex === -1) {
                  break;
                }

                // Extract marker content
                const markerContent = bufferManager.buffer.slice(markerIndex, markerEndIndex);
                console.log('🏷️ Processing marker:', markerContent);

                // Process START marker
                if (markerContent.startsWith('/// START')) {
                  if (currentComponentId) {
                    componentBuffer.completeComponent(currentComponentId);
                    stopComponent();
                  }
                  const match = markerContent.match(/\/\/\/\s*START\s+(\w+)(?:\s+position=(\w+))?/);
                  if (match) {
                    const [, name, position = 'main'] = match;
                    const componentId = `comp_${name.toLowerCase()}`;
                    componentBuffer.startComponent(componentId, name, position);
                    startComponent(name, position, componentId);
                  }
                } 
                // Process END marker
                else if (markerContent.startsWith('/// END')) {
                  const componentDuration = Date.now() - componentStartTime;
                  componentBuffer.completeComponent(currentComponentId);
                  stopComponent(componentDuration);
                }

                // Update buffer manager
                bufferManager.lastProcessedIndex = markerEndIndex + 1;
                bufferManager.consumeProcessedContent();
              }

              // If we have an active component, accumulate remaining content
              if (currentComponentId && bufferManager.remainingContent.trim()) {
                componentBuffer.appendToComponent(currentComponentId, bufferManager.remainingContent);
                const component = componentBuffer.getComponent(currentComponentId);
                
                res.write(`data: ${JSON.stringify({
                  type: 'content_block_delta',
                  metadata: createMetadata(currentComponentId, 'delta'),
                  delta: { text: bufferManager.remainingContent }
                })}\n\n`);
              }
            }
            break;

          case 'message_stop':
            console.log('🏁 Message completed');
            // Handle any remaining content
            if (currentComponentId && bufferManager.buffer.trim()) {
              const finalContent = bufferManager.buffer.slice(bufferManager.lastProcessedIndex);
              if (finalContent.trim()) {
                componentBuffer.appendToComponent(currentComponentId, finalContent);
                const component = componentBuffer.getComponent(currentComponentId);
                
                res.write(`data: ${JSON.stringify({
                  type: 'content_block_delta',
                  metadata: createMetadata(currentComponentId, 'delta'),
                  delta: { text: finalContent }
                })}\n\n`);
              }
              componentBuffer.completeComponent(currentComponentId);
              stopComponent();
            }
            break;

          default:
            console.log('⚠️ Unhandled event type:', event.type);
        }

        // Flush SSE to client
        if (typeof res.flush === 'function') {
          res.flush();
        }
      } catch (error) {
        handleStreamError(error, res, currentComponentId, currentComponentName, bufferManager.buffer, stopComponent);
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

      // Safely get section contents
      const getSectionComponents = (sectionName) => {
        const section = sections.get(sectionName);
        return section ? Array.from(section) : [];
      };

      // Calculate total components safely
      const getTotalComponents = () => {
        return ['header', 'main', 'footer'].reduce((total, sectionName) => {
          const section = sections.get(sectionName);
          return total + (section ? section.size : 0);
        }, 0);
      };

      // Send final completion signal with complete metadata
      res.write(`data: ${JSON.stringify({
        type: 'message_stop',
        metadata: {
          sections: {
            header: getSectionComponents('header'),
            main: getSectionComponents('main'),
            footer: getSectionComponents('footer')
          },
          totalComponents: getTotalComponents(),
          components: finalState
        }
      })}\n\n`);

      res.end();

      // Clean up buffer manager
      bufferManager.clear();
    });

    // Handle stream errors
    stream.on('error', (err) => {
      handleStreamError(err, res, currentComponentId, currentComponentName, bufferManager.buffer, stopComponent);
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