const { generate } = require('../utils/aiClient');

// Constants for validation and safety
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB max buffer size
const MAX_COMPONENT_TIME = 30000; // 30s timeout
const MAX_COMPOUND_WAIT_TIME = 10000; // 10s max wait for subcomponents

// Define compound component relationships with validation patterns
const COMPOUND_COMPONENTS = {
  NavigationMenu: {
    subcomponentPatterns: {
      List: /NavigationMenuList/,
      Item: /NavigationMenuItem/,
      Link: /NavigationMenuLink/,
      Content: /NavigationMenuContent/,
      Trigger: /NavigationMenuTrigger/,
      Viewport: /NavigationMenuViewport/
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

// More lenient marker pattern that allows for multi-word names
const MARKER_PATTERN = /\/\/\/\s*(START|END)\s+([A-Za-z][a-zA-Z0-9]*(?:\s+[A-Za-z][a-zA-Z0-9]*)*(?:Section|Layout|Component)?)\s*(?:position=([a-z]+))?\s*$/m;
const INCOMPLETE_MARKER = /\/\/\/\s*(START|END)\s*$/m;

// Update validation for component names to be more lenient
const VALID_COMPONENT_NAME = /^[A-Za-z][a-zA-Z0-9]*(?:\s+[A-Za-z][a-zA-Z0-9]*)*(?:Section|Layout|Component)?$/;

// Add test ID validation
const isTestId = (id) => id.startsWith('test-');

// Add component alias mapping
const COMPONENT_ALIASES = {
  'Navigation': 'Header',
  'Nav': 'Header',
  'NavigationBar': 'Header',
  'Navbar': 'Header'
};

// Add new buffer management class with deduplication
class ComponentBuffer {
  constructor() {
    this.components = new Map();
  }

  startComponent(id, name, position) {
    // Don't start if already started
    if (this.components.has(id)) {
      return;
    }

    log(`🎬 [ComponentBuffer] Starting component:`, {
      id,
      name,
      position,
      timestamp: new Date().toISOString()
    });

    this.components.set(id, {
      id,
      name,
      position,
      code: '',
      isStreaming: true,
      isComplete: false,
      isCompound: false,
      startTime: Date.now(),
      stats: {
        appendCalls: 0,
        totalBytes: 0,
        markers: {
          start: Date.now()
        }
      },
      functionDeclarations: new Set()
    });
  }

  appendToComponent(id, content) {
    const component = this.components.get(id);
    if (!component) return;

    // Check for duplicate function declarations
    if (content.includes('export function')) {
      const functionMatches = content.match(/export\s+function\s+(\w+)/g);
      if (functionMatches) {
        // Extract function names from the new content
        const newFunctions = functionMatches.map(match => match.replace('export function ', '').trim());
        
        // Check if any of these functions already exist in the component's code
        const existingCode = component.code;
        const existingFunctionMatches = existingCode.match(/export\s+function\s+(\w+)/g) || [];
        const existingFunctions = existingFunctionMatches.map(match => match.replace('export function ', '').trim());
        
        // If any of the new functions already exist, skip this content block
        if (newFunctions.some(fn => existingFunctions.includes(fn))) {
          log(`⚠️ Skipping content block with duplicate function declaration(s): ${newFunctions.join(', ')}`);
          return;
        }
        
        // If no duplicates, add all new functions to the tracking set
        newFunctions.forEach(fn => component.functionDeclarations.add(fn));
      }
    }

    component.code += content;
    component.stats.appendCalls++;
    component.stats.totalBytes += content.length;
    component.stats.lastAppendTime = Date.now();
  }

  completeComponent(id) {
    const component = this.components.get(id);
    if (!component) return;

    component.isComplete = true;
    component.isStreaming = false;

    const duration = Date.now() - component.startTime;
    log(`✨ [ComponentBuffer] Completing component ${component.name}:`, {
      duration,
      finalBufferSize: component.code.length,
      totalAppendCalls: component.stats.appendCalls,
      totalBytes: component.stats.totalBytes,
      averageBytesPerAppend: component.stats.totalBytes / component.stats.appendCalls,
      functionDeclarations: Array.from(component.functionDeclarations)
    });
  }

  getComponent(id) {
    return this.components.get(id);
  }

  clear() {
    const stats = {
      appendCalls: Array.from(this.components.values()).reduce((acc, comp) => acc + comp.stats.appendCalls, 0),
      totalBytesAppended: Array.from(this.components.values()).reduce((acc, comp) => acc + comp.stats.totalBytes, 0),
      duplicatesSkipped: Array.from(this.components.values()).reduce((acc, comp) => acc + comp.functionDeclarations.size, 0)
    };

    log(`🧹 [ComponentBuffer] Clearing buffer. Final stats:`, stats);
    this.components.clear();
  }
}

// Update BufferManager to use the new validator
class BufferManager {
  constructor() {
    this.buffer = '';
    this.lastProcessedIndex = 0;
    this.markerPattern = /\/\/\/\s*(START|END)\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*(?:position=([\w]+))?\s*$/m;
    this.currentContent = '';
    this.inComponent = false;
  }

  append(text) {
    this.buffer += text;
    if (this.inComponent) {
      this.currentContent += text;
    }
  }

  findNextMarker() {
    const match = this.markerPattern.exec(this.buffer.slice(this.lastProcessedIndex));
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
    this.currentContent = '';
    this.inComponent = false;
  }

  get length() {
    return this.buffer.length;
  }

  get remainingContent() {
    return this.buffer.slice(this.lastProcessedIndex);
  }

  hasUnprocessedContent() {
    return this.remainingContent.trim().length > 0;
  }

  processMarkers(currentComponentId, componentBuffer, res, startComponent, stopComponent) {
    let markerIndex;
    let hasProcessedContent = false;

    while ((markerIndex = this.findNextMarker()) !== -1) {
      // Get content before marker
      const contentBeforeMarker = this.getContentUpTo(markerIndex);
      
      // Emit content if we have an active component
      if (currentComponentId && this.inComponent && contentBeforeMarker.trim()) {
        componentBuffer.appendToComponent(currentComponentId, contentBeforeMarker);
        hasProcessedContent = true;
        
        // Send delta event to client
        res.write(`data: ${JSON.stringify({
          type: 'content_block_delta',
          metadata: {
            componentId: currentComponentId,
            componentName: componentBuffer.getComponent(currentComponentId)?.name,
            position: componentBuffer.getComponent(currentComponentId)?.position || 'main',
            isCompoundComplete: true,
            isCritical: CRITICAL_COMPONENTS.has(componentBuffer.getComponent(currentComponentId)?.name)
          },
          delta: { text: contentBeforeMarker }
        })}\n\n`);
      }

      // Find the end of the marker line
      const markerEndIndex = this.buffer.indexOf('\n', markerIndex);
      if (markerEndIndex === -1) {
        break;
      }

      // Extract marker content
      const markerContent = this.buffer.slice(markerIndex, markerEndIndex);
      log('🏷️ Processing marker:', markerContent);

      // Process START marker
      if (markerContent.startsWith('/// START')) {
        // Only process a start marker if we are not already inside a component
        if (!this.inComponent) {
          const match = markerContent.match(/\/\/\/\s*START\s+(\w+)(?:\s+position=(\w+))?/);
          if (match) {
            const [, name, position = 'main'] = match;
            const componentId = `comp_${name.toLowerCase()}`;
            // Start the new component only if it isn't already started
            if (!componentBuffer.getComponent(componentId)) {
              componentBuffer.startComponent(componentId, name, position);
              startComponent(name, position, componentId, res);
              this.inComponent = true;
              this.currentContent = '';
            }
          }
        } else {
          // Log that a duplicate START marker was received
          log('⚠️ Duplicate START marker ignored for component:', currentComponentId);
        }
      } 
      // Process END marker
      else if (markerContent.startsWith('/// END')) {
        const match = markerContent.match(/\/\/\/\s*END\s+(\w+)/);
        if (match && match[1] && this.inComponent) {
          const [, name] = match;
          const componentId = `comp_${name.toLowerCase()}`;
          
          // Only end the component if it matches the current one
          if (componentId === currentComponentId) {
            const componentDuration = Date.now() - componentStartTime;
            
            // Send final content delta if we have accumulated content
            if (this.currentContent.trim()) {
              res.write(`data: ${JSON.stringify({
                type: 'content_block_delta',
                metadata: {
                  componentId: currentComponentId,
                  componentName: componentBuffer.getComponent(currentComponentId)?.name,
                  position: componentBuffer.getComponent(currentComponentId)?.position || 'main',
                  isCompoundComplete: true,
                  isCritical: CRITICAL_COMPONENTS.has(componentBuffer.getComponent(currentComponentId)?.name)
                },
                delta: { text: this.currentContent }
              })}\n\n`);
            }

            componentBuffer.completeComponent(currentComponentId);
            stopComponent(res, componentDuration);
            this.currentContent = '';
            this.inComponent = false;
          }
        }
      }

      // Update buffer manager
      this.lastProcessedIndex = markerEndIndex + 1;
      this.consumeProcessedContent();
    }

    // Handle any remaining content for the current component
    if (currentComponentId && this.inComponent && this.remainingContent.trim()) {
      componentBuffer.appendToComponent(currentComponentId, this.remainingContent);
      
      // Send delta event to client
      res.write(`data: ${JSON.stringify({
        type: 'content_block_delta',
        metadata: {
          componentId: currentComponentId,
          componentName: componentBuffer.getComponent(currentComponentId)?.name,
          position: componentBuffer.getComponent(currentComponentId)?.position || 'main',
          isCompoundComplete: true,
          isCritical: CRITICAL_COMPONENTS.has(componentBuffer.getComponent(currentComponentId)?.name)
        },
        delta: { text: this.remainingContent }
      })}\n\n`);
    }

    return hasProcessedContent;
  }
}

// Update logging function to be test-aware
const log = (message, ...args) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(message, ...args);
  }
};

// Global state management
let componentStates = new Map();
let currentComponentId = null;
let currentComponentName = null;
let lineBuffer = '';

// Reset function to clear all state
const resetState = () => {
  componentStates.clear();
  currentComponentId = null;
  currentComponentName = null;
  lineBuffer = '';
};

// Helper function to create metadata for events
const createMetadata = (componentId, type) => {
  // Check if this is a critical component
  const isCritical = CRITICAL_COMPONENTS.has(currentComponentName);

  // For compound components, check if all required subcomponents are present
  let isCompoundComplete = true;
  if (COMPOUND_COMPONENTS[currentComponentName]) {
    const requiredSubcomponents = COMPOUND_COMPONENTS[currentComponentName].subcomponentPatterns;
    const actualCode = accumulatedCode;
    
    for (const [name, pattern] of Object.entries(requiredSubcomponents)) {
      if (!pattern.test(actualCode)) {
        isCompoundComplete = false;
        if (DEBUG_MODE) {
          console.warn(`⚠️ Missing required subcomponent ${name} for ${currentComponentName}`);
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
    componentId,
    componentName: currentComponentName,
    position: sections.get('header')?.has(componentId) ? 'header' :
             sections.get('footer')?.has(componentId) ? 'footer' : 'main',
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

// Helper function to update component state
const updateComponentState = (name, id) => {
  currentComponentName = name;
  currentComponentId = id;
  accumulatedCode = '';
  componentStartTime = Date.now();
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

// Simplify position handling to just pass through whatever the AI generates
const normalizePosition = (position) => {
  return position?.toLowerCase().trim() || 'main';
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

// Update the startComponent function
const startComponent = (name, position, componentId, res) => {
  // Don't start if already started
  if (currentComponentId === componentId) {
    return;
  }

  log('🎬 Starting component:', {
    name,
    position,
    componentId,
    timestamp: new Date().toISOString(),
    existingComponents: Array.from(componentBuffer.components.keys())
  });

  currentComponentId = componentId;
  currentComponentName = name;
  componentStartTime = Date.now();
  accumulatedCode = '';

  // Send start event to client
  res.write(`data: ${JSON.stringify({
    type: 'content_block_start',
    metadata: {
      componentId,
      componentName: name,
      position,
      isCritical: CRITICAL_COMPONENTS.has(name),
      isCompoundComplete: true
    }
  })}\n\n`);
};

// Update the stopComponent function
const stopComponent = (res, componentDuration = 0) => {
  if (!currentComponentId) return;

  const component = componentBuffer.getComponent(currentComponentId);
  const code = component?.code || '';
  const trimmedCode = code.trim();

  const finalStats = {
    componentName: currentComponentName,
    codeLength: code.length,
    duration: componentDuration,
    trimmedCodeLength: trimmedCode.length
  };

  log(`✅ Completing component:`, finalStats);

  // Check for empty component - only if there's no code between markers
  if (!trimmedCode || trimmedCode.length === 0) {
    log(`⚠️ Empty component detected: ${currentComponentName}`);

    // Send error event for empty component
    res.write(`data: ${JSON.stringify({
      type: 'error',
      code: 'VALIDATION_FAILED',
      message: `Component ${currentComponentName} is empty`,
      metadata: {
        componentId: currentComponentId,
        componentName: currentComponentName
      }
    })}\n\n`);
  }

  // Send stop event to client
  res.write(`data: ${JSON.stringify({
    type: 'content_block_stop',
    metadata: {
      componentId: currentComponentId,
      componentName: currentComponentName,
      position: component?.position || 'main',
      isComplete: true,
      isCompoundComplete: true,
      isCritical: CRITICAL_COMPONENTS.has(currentComponentName),
      sections: {
        header: [],
        main: [],
        footer: []
      }
    }
  })}\n\n`);

  // Reset state
  currentComponentId = null;
  currentComponentName = null;
  componentStartTime = null;
  accumulatedCode = '';
};

// Update the processMarkerText function to handle multi-word names
const processMarkerText = (text) => {
  try {
    // Look for START or END markers with more detailed validation
    const startMatch = text.match(/^\/\/\/\s*START\s+([A-Za-z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*(?:position=([a-z]+))?\s*$/);
    const endMatch = text.match(/^\/\/\/\s*(?:END|STOP)\s+([A-Za-z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*$/);
    const incompleteMarker = text.match(/^\/\/\/\s*(?:START|END|STOP)(?:\s*$|\s+[A-Za-z][a-zA-Z0-9]*\s*position=\s*$)/);

    // If we find an incomplete marker, return null to buffer it
    if (incompleteMarker) {
      log('⚠️ Found incomplete marker, buffering:', text);
      return { incomplete: true };
    }

    // Handle split markers that might be incomplete
    if (text.trim() === '/// STA' || text.trim() === '/// ST' || text.trim() === '/// S') {
      return { incomplete: true };
    }
    if (text.trim() === '/// END' || text.trim() === '/// EN' || text.trim() === '/// E') {
      return { incomplete: true };
    }
    if (text.trim() === '/// STOP' || text.trim() === '/// STO' || text.trim() === '/// ST') {
      return { incomplete: true };
    }

    if (startMatch) {
      const [, componentName, position = 'main'] = startMatch;
      if (!componentName) {
        log('⚠️ Invalid START marker - missing component name:', text);
        return null;
      }

      // Clean and normalize the component name
      const cleanName = componentName
        .trim()
        .replace(/^H+(?=[A-Z])/, ''); // Only remove H prefix if followed by capital letter
      const aliasedName = COMPONENT_ALIASES[cleanName] || cleanName;

      log('🔍 Processing START marker:', {
        originalMarker: text,
        originalName: componentName,
        cleanName,
        aliasedName,
        position
      });

      return {
        type: 'content_block_start',
        metadata: {
          componentId: `comp_${aliasedName.toLowerCase()}`,
          componentName: aliasedName,
          position,
          isCompoundComplete: true,
          isCritical: CRITICAL_COMPONENTS.has(aliasedName)
        }
      };
    }

    if (endMatch) {
      const [, componentName] = endMatch;
      if (!componentName) {
        log('⚠️ Invalid END/STOP marker - missing component name:', text);
        return null;
      }

      // Clean and normalize the component name
      const cleanName = componentName
        .trim()
        .replace(/^H+(?=[A-Z])/, ''); // Only remove H prefix if followed by capital letter
      const aliasedName = COMPONENT_ALIASES[cleanName] || cleanName;

      log('🔍 Processing END marker:', {
        originalMarker: text,
        originalName: componentName,
        cleanName,
        aliasedName
      });

      return {
        type: 'content_block_stop',
        metadata: {
          componentId: `comp_${aliasedName.toLowerCase()}`,
          componentName: aliasedName,
          position: 'main', // We'll update this with the actual position from state
          isComplete: true,
          isCompoundComplete: true,
          isCritical: CRITICAL_COMPONENTS.has(aliasedName)
        }
      };
    }

    return null;
  } catch (error) {
    log('❌ Error processing marker:', error);
    return null;
  }
};

// Add helper to create finished event with enhanced metadata
const createFinishedEvent = (componentId, componentName, state, reason = 'normal') => {
  const now = Date.now();
  const duration = state.startTime ? now - state.startTime : 0;
  
  // Clean and validate the code
  const cleanedCode = cleanComponentCode(state.code || '');
  const codeSize = cleanedCode.length;
  const linesOfCode = cleanedCode.split('\n').length;
  
  // Validate compound components
  const { isValid: isCompoundValid, missingSubcomponents } = validateCompoundComponent(componentName, cleanedCode);
  
  // Log completion details
  log('✨ Component finished:', {
    componentId,
    componentName,
    reason,
    duration: `${duration}ms`,
    codeSize: `${codeSize} bytes`,
    linesOfCode,
    position: state.position || 'main',
    timestamp: new Date(now).toISOString(),
    isCompoundValid,
    missingSubcomponents: missingSubcomponents.length ? missingSubcomponents : undefined
  });

  return {
    type: 'component_finished',
    metadata: {
      componentId,
      componentName,
      isComplete: true,
      isCompoundComplete: isCompoundValid,
      isCritical: CRITICAL_COMPONENTS.has(componentName),
      position: state.position || 'main',
      timestamp: now,
      duration,
      reason,
      revision: state.revision || 1,
      stats: {
        codeSize,
        linesOfCode,
        lastModified: state.lastUpdated,
        missingSubcomponents: missingSubcomponents.length ? missingSubcomponents : undefined
      }
    },
    code: cleanedCode
  };
};

// Add helper to process multiple markers in a chunk
const processChunkWithMarkers = (text, currentState) => {
  const events = [];
  const lines = text.split('\n');
  let currentContent = '';
  
  for (let line of lines) {
    // If we have buffered content, prepend it to the current line
    if (this.lineBuffer) {
      line = this.lineBuffer + line;
      this.lineBuffer = '';
    }

    // Try to process the line as a marker
    const markerInfo = processMarkerText(line);

    if (markerInfo?.incomplete) {
      // Store incomplete line in buffer
      this.lineBuffer = line;
      continue;
    }

    if (markerInfo) {
      // Found a valid marker
      if (markerInfo.type === 'content_block_start') {
        // If we have accumulated content before this marker, add it to the current component
        if (currentContent.trim() && currentState.currentComponentId) {
          const state = this.componentStates.get(currentState.currentComponentId);
          if (state) {
            state.code = (state.code || '') + currentContent;
            state.lastUpdated = Date.now();
            this.componentStates.set(currentState.currentComponentId, state);

            // Send content delta event
            events.push({
              type: 'content_block_delta',
              metadata: {
                componentId: currentState.currentComponentId,
                componentName: currentState.currentComponentName,
                position: state.position || 'main',
                isCompoundComplete: true,
                isCritical: CRITICAL_COMPONENTS.has(currentState.currentComponentName)
              },
              delta: { text: currentContent }
            });
          }
        }
        currentContent = '';

        // Save current component as parent before switching to new component
        if (currentState.currentComponentId) {
          currentState.parentComponentId = currentState.currentComponentId;
          currentState.parentComponentName = currentState.currentComponentName;
        }

        // Start new component
        currentState.currentComponentId = markerInfo.metadata.componentId;
        currentState.currentComponentName = markerInfo.metadata.componentName;
        
        // Initialize new component state
        this.updateComponentState(currentState.currentComponentId, {
          code: '',
          position: markerInfo.metadata.position,
          startTime: Date.now()
        });

        // Send start event
        events.push(markerInfo);
      } else if (markerInfo.type === 'content_block_stop') {
        const { componentId, componentName } = markerInfo.metadata;
        
        // Get the final state of the component
        const finishedState = this.componentStates.get(componentId);
        if (finishedState) {
          // Add any remaining content to the current component before completing it
          if (currentContent.trim()) {
            finishedState.code = (finishedState.code || '') + currentContent;
            finishedState.lastUpdated = Date.now();
            this.componentStates.set(componentId, finishedState);
            
            // Send content delta event for the accumulated content
            events.push({
              type: 'content_block_delta',
              metadata: {
                componentId,
                componentName,
                position: finishedState.position || 'main',
                isCompoundComplete: true,
                isCritical: CRITICAL_COMPONENTS.has(componentName)
              },
              delta: { text: currentContent }
            });
          }

          // Update the marker info with the correct position from state
          markerInfo.metadata.position = finishedState.position || 'main';

          // Send the stop event
          events.push(markerInfo);
        }
        
        // Reset content buffer
        currentContent = '';
        
        // If this was a nested component, restore the parent component
        if (currentState.parentComponentId) {
          currentState.currentComponentId = currentState.parentComponentId;
          currentState.currentComponentName = currentState.parentComponentName;
          currentState.parentComponentId = null;
          currentState.parentComponentName = null;
        } else {
          currentState.currentComponentId = null;
          currentState.currentComponentName = null;
        }
      }
    } else if (!line.trim().startsWith('///')) {
      // Accumulate non-marker lines
      currentContent += line + '\n';
    }
  }

  // If we have accumulated content and an active component, send it as a delta
  if (currentContent.trim() && currentState.currentComponentId) {
    const state = this.componentStates.get(currentState.currentComponentId);
    if (state) {
      state.code = (state.code || '') + currentContent;
      state.lastUpdated = Date.now();
      this.componentStates.set(currentState.currentComponentId, state);

      // Send content delta event
      events.push({
        type: 'content_block_delta',
        metadata: {
          componentId: currentState.currentComponentId,
          componentName: currentState.currentComponentName,
          position: state.position || 'main',
          isCompoundComplete: true,
          isCritical: CRITICAL_COMPONENTS.has(currentState.currentComponentName)
        },
        delta: { text: currentContent }
      });
    }
  }

  return {
    events,
    currentState
  };
};

// Helper function to clean and validate component code
const cleanComponentCode = (code) => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  try {
    // Remove any trailing markers that might have been included
    const lines = code.split('\n');
    const cleanedLines = lines.filter(line => !line.trim().startsWith('///'));

    // Clean up empty lines at start and end
    let startIndex = 0;
    let endIndex = cleanedLines.length - 1;

    while (startIndex < cleanedLines.length && !cleanedLines[startIndex].trim()) {
      startIndex++;
    }

    while (endIndex >= 0 && !cleanedLines[endIndex].trim()) {
      endIndex--;
    }

    // Extract the actual component code
    const componentLines = cleanedLines.slice(startIndex, endIndex + 1);

    // Ensure we have actual code content
    if (componentLines.length === 0) {
      return '';
    }

    // Join lines and ensure proper spacing
    const cleanedCode = componentLines.join('\n').trim();

    // Basic validation
    if (!cleanedCode.includes('export') || !cleanedCode.includes('function')) {
      log('⚠️ Cleaned code missing export or function declaration');
      return '';
    }

    return cleanedCode;
  } catch (error) {
    log('❌ Error cleaning component code:', error);
    return '';
  }
};

// Add validation for compound components
const validateCompoundComponent = (componentName, code) => {
  const compoundDef = COMPOUND_COMPONENTS[componentName];
  if (!compoundDef) {
    return { isValid: true, missingSubcomponents: [] };
  }

  const missingSubcomponents = Object.entries(compoundDef.subcomponentPatterns)
    .filter(([name, pattern]) => !pattern.test(code))
    .map(([name]) => name);

  return {
    isValid: missingSubcomponents.length === 0,
    missingSubcomponents
  };
};

class GeneratorState {
  constructor() {
    this.componentStates = new Map();
    this.currentComponentId = null;
    this.currentComponentName = null;
    this.lineBuffer = '';
    this.accumulatedCode = '';
    this.componentStartTime = null;
    this.componentBuffer = new ComponentBuffer();
  }

  updateComponentState(id, updates) {
    const current = this.componentStates.get(id) || {};
    const updated = {
      ...current,
      ...updates,
      lastUpdated: Date.now()
    };
    this.componentStates.set(id, updated);
    return updated;
  }

  processChunkWithMarkers(text, currentState) {
    const events = [];
    const lines = text.split('\n');
    let currentContent = '';
    
    for (let line of lines) {
      // If we have buffered content, prepend it to the current line
      if (this.lineBuffer) {
        line = this.lineBuffer + line;
        this.lineBuffer = '';
      }

      // Try to process the line as a marker
      const markerInfo = processMarkerText(line);

      if (markerInfo?.incomplete) {
        // Store incomplete line in buffer
        this.lineBuffer = line;
        continue;
      }

      if (markerInfo) {
        // Found a valid marker
        if (markerInfo.type === 'content_block_start') {
          // If we have accumulated content before this marker, add it to the current component
          if (currentContent.trim() && currentState.currentComponentId) {
            const state = this.componentStates.get(currentState.currentComponentId);
            if (state) {
              state.code = (state.code || '') + currentContent;
              state.lastUpdated = Date.now();
              this.componentStates.set(currentState.currentComponentId, state);

              // Send content delta event
              events.push({
                type: 'content_block_delta',
                metadata: {
                  componentId: currentState.currentComponentId,
                  componentName: currentState.currentComponentName,
                  position: state.position || 'main',
                  isCompoundComplete: true,
                  isCritical: CRITICAL_COMPONENTS.has(currentState.currentComponentName)
                },
                delta: { text: currentContent }
              });
            }
          }
          currentContent = '';

          // Save current component as parent before switching to new component
          if (currentState.currentComponentId) {
            currentState.parentComponentId = currentState.currentComponentId;
            currentState.parentComponentName = currentState.currentComponentName;
          }

          // Start new component
          currentState.currentComponentId = markerInfo.metadata.componentId;
          currentState.currentComponentName = markerInfo.metadata.componentName;
          
          // Initialize new component state
          this.updateComponentState(currentState.currentComponentId, {
            code: '',
            position: markerInfo.metadata.position,
            startTime: Date.now()
          });

          // Send start event
          events.push(markerInfo);
        } else if (markerInfo.type === 'content_block_stop') {
          const { componentId, componentName } = markerInfo.metadata;
          
          // Get the final state of the component
          const finishedState = this.componentStates.get(componentId);
          if (finishedState) {
            // Add any remaining content to the current component before completing it
            if (currentContent.trim()) {
              finishedState.code = (finishedState.code || '') + currentContent;
              finishedState.lastUpdated = Date.now();
              this.componentStates.set(componentId, finishedState);
              
              // Send content delta event for the accumulated content
              events.push({
                type: 'content_block_delta',
                metadata: {
                  componentId,
                  componentName,
                  position: finishedState.position || 'main',
                  isCompoundComplete: true,
                  isCritical: CRITICAL_COMPONENTS.has(componentName)
                },
                delta: { text: currentContent }
              });
            }

            // Update the marker info with the correct position from state
            markerInfo.metadata.position = finishedState.position || 'main';

            // Send the stop event
            events.push(markerInfo);
          }
          
          // Reset content buffer
          currentContent = '';
          
          // If this was a nested component, restore the parent component
          if (currentState.parentComponentId) {
            currentState.currentComponentId = currentState.parentComponentId;
            currentState.currentComponentName = currentState.parentComponentName;
            currentState.parentComponentId = null;
            currentState.parentComponentName = null;
          } else {
            currentState.currentComponentId = null;
            currentState.currentComponentName = null;
          }
        }
      } else if (!line.trim().startsWith('///')) {
        // Accumulate non-marker lines
        currentContent += line + '\n';
      }
    }

    // If we have accumulated content and an active component, send it as a delta
    if (currentContent.trim() && currentState.currentComponentId) {
      const state = this.componentStates.get(currentState.currentComponentId);
      if (state) {
        state.code = (state.code || '') + currentContent;
        state.lastUpdated = Date.now();
        this.componentStates.set(currentState.currentComponentId, state);

        // Send content delta event
        events.push({
          type: 'content_block_delta',
          metadata: {
            componentId: currentState.currentComponentId,
            componentName: currentState.currentComponentName,
            position: state.position || 'main',
            isCompoundComplete: true,
            isCritical: CRITICAL_COMPONENTS.has(currentState.currentComponentName)
          },
          delta: { text: currentContent }
        });
      }
    }

    return {
      events,
      currentState
    };
  }

  reset() {
    this.componentStates.clear();
    this.currentComponentId = null;
    this.currentComponentName = null;
    this.lineBuffer = '';
    this.accumulatedCode = '';
    this.componentStartTime = null;
    this.componentBuffer = new ComponentBuffer();
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

    // Create state instance for this request
    const state = new GeneratorState();

    // Allow test IDs to bypass database validation
    if (!isTestId(projectId) || !isTestId(versionId)) {
      log('⚠️ Non-test IDs would be validated against database');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
    log('📡 SSE headers set');

    const { prompt, style, requirements } = req.body;
    const stream = await generate(prompt, style, requirements);

    // Handle client disconnect
    req.on('close', () => {
      log('❌ Client disconnected');
      stream.destroy();
      state.reset();
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Handle stream events
    stream.on('data', (chunk) => {
      try {
        if (!res.writable) {
          log('❌ Response no longer writable');
          stream.destroy();
          state.reset();
          return;
        }

        const data = chunk.toString();
        log('📥 Received chunk:', data);
        
        try {
          const event = JSON.parse(data);
          log('🔄 Processing event:', event);
          
          // Process markers in the text content if this is a delta event
          if (event.type === 'content_block_delta' && event.delta?.text) {
            const { events, currentState } = state.processChunkWithMarkers(
              event.delta.text,
              { 
                currentComponentId: state.currentComponentId, 
                currentComponentName: state.currentComponentName
              }
            );
            
            log('✨ Processed events:', events);
            
            // Update component state from processing results
            state.currentComponentId = currentState.currentComponentId;
            state.currentComponentName = currentState.currentComponentName;

            // Send all events to the client
            for (const processedEvent of events) {
              log('📤 Sending event:', processedEvent);
              res.write(`data: ${JSON.stringify(processedEvent)}\n\n`);
            }
          } else {
            // Forward non-delta events directly
            log('📤 Forwarding event:', event);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (parseError) {
          log('❌ Error parsing chunk:', parseError);
          res.write(`data: ${JSON.stringify({
            type: 'error',
            code: 'PARSE_ERROR',
            message: 'Failed to parse stream data',
            error: parseError.message
          })}\n\n`);
          stream.destroy();
          state.reset();
        }
      } catch (writeError) {
        log('❌ Error writing response:', writeError);
        stream.destroy();
        state.reset();
      }
    });

    // Handle stream end
    stream.on('end', () => {
      log('✅ Stream ended');
      
      // Send message_stop event before ending
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'message_stop'
        })}\n\n`);
        res.end();
      }
      
      state.reset();
    });

    // Handle stream errors
    stream.on('error', (error) => {
      log('❌ Stream error:', error);
      state.reset();
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          code: 'STREAM_ERROR',
          message: 'Stream error occurred',
          error: error.message
        })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    log('❌ Controller error:', error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        code: 'CONTROLLER_ERROR',
        message: 'Controller error occurred',
        error: error.message
      })}\n\n`);
      res.end();
    }
  }
};

module.exports = generateController;