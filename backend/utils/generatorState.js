const ComponentBuffer = require('./componentBuffer');
const MarkerValidator = require('./markerValidator');
const { COMPOUND_COMPONENTS, CRITICAL_COMPONENTS } = require('./constants');

class GeneratorState {
  constructor() {
    this.componentBuffer = new ComponentBuffer();

    // Track the currently active component ID (if any)
    this.currentComponentId = null;
    this.currentComponentName = null;

    // Just a line buffer in case markers come in broken up across chunks
    this.lineBuffer = '';

    // Track nesting level to handle nested markers
    this.nestingLevel = 0;
  }

  reset() {
    this.componentBuffer.clear();
    this.currentComponentId = null;
    this.currentComponentName = null;
    this.lineBuffer = '';
    this.nestingLevel = 0;
  }

  /**
   * Process lines from the streaming text. Splits lines and checks for markers.
   */
  processChunk(text) {
    // Return an array of "events" that the service/controller can push
    const events = [];
    
    // Handle line buffer from previous chunk
    let processText = text;
    if (this.lineBuffer) {
      processText = this.lineBuffer + text;
      this.lineBuffer = '';
    }

    const lines = processText.split('\n');
    let accumulatedContent = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Track nesting level based on braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      this.nestingLevel += openBraces - closeBraces;
      
      // Check if line is a marker
      const maybeMarker = this._checkMarker(line);

      if (maybeMarker?.incomplete) {
        // Only buffer if it's the last line
        if (i === lines.length - 1) {
          this.lineBuffer = line;
          continue;
        }
      }

      if (maybeMarker?.isValid) {
        // We found a valid marker
        if (maybeMarker.type === 'START') {
          // If we have some leftover content for a currently active component, append it
          if (accumulatedContent.trim() && this.currentComponentId) {
            this.componentBuffer.appendToComponent(this.currentComponentId, accumulatedContent);
            events.push(this._makeDeltaEvent(accumulatedContent));
          }
          accumulatedContent = '';

          // Start new component
          const componentId = `comp_${maybeMarker.name.toLowerCase()}`;
          this.currentComponentId = componentId;
          this.currentComponentName = maybeMarker.name;
          this.componentBuffer.startComponent(componentId, maybeMarker.name, maybeMarker.position);

          // Send "start" event
          events.push({
            type: 'content_block_start',
            metadata: {
              componentId,
              componentName: maybeMarker.name,
              position: maybeMarker.position,
              isCompoundComplete: true,
              isCritical: CRITICAL_COMPONENTS.has(maybeMarker.name)
            }
          });
        } else if (maybeMarker.type === 'END') {
          // If there's leftover content, append it
          if (accumulatedContent.trim() && this.currentComponentId) {
            this.componentBuffer.appendToComponent(this.currentComponentId, accumulatedContent);
            events.push(this._makeDeltaEvent(accumulatedContent));
          }
          accumulatedContent = '';

          // Mark current component complete
          if (this.currentComponentId) {
            this.componentBuffer.completeComponent(this.currentComponentId);
            
            // Get final component state for validation
            const component = this.componentBuffer.getComponent(this.currentComponentId);
            const isCompoundComplete = this._validateCompoundComponent(this.currentComponentName, component?.code || '');
            
            events.push({
              type: 'content_block_stop',
              metadata: {
                componentId: this.currentComponentId,
                componentName: this.currentComponentName,
                position: component?.position || 'main',
                isComplete: true,
                isCompoundComplete,
                isCritical: CRITICAL_COMPONENTS.has(this.currentComponentName)
              }
            });
          }

          // Reset current
          this.currentComponentId = null;
          this.currentComponentName = null;
        }
      } else {
        // Not a marker – accumulate the line
        accumulatedContent += line + '\n';
      }
    }

    // After iterating lines:
    // If we still have content and an active component, queue as delta
    if (accumulatedContent.trim() && this.currentComponentId) {
      this.componentBuffer.appendToComponent(this.currentComponentId, accumulatedContent);
      events.push(this._makeDeltaEvent(accumulatedContent));
    }

    return events;
  }

  /**
   * Internal: checks if a line looks like a marker ("/// START Foo"), returns structured info
   */
  _checkMarker(line) {
    // Only match lines that are EXACTLY markers with optional whitespace
    // This prevents matching markers inside code blocks or strings
    const markerRegex = /^\s*\/\/\/\s+(START|END)\s+[A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?(?:\s+position=[a-z]+)?\s*$/;
    
    // First check if it's a potential marker line
    if (!line.trim().startsWith('///')) {
      return null;
    }

    // Ignore markers if we're inside a code block (nesting level > 0)
    if (this.nestingLevel > 0) {
      return null;
    }

    // Now check if it's a valid marker
    if (!markerRegex.test(line)) {
      // Check for partial markers
      const partialRegex = /^\s*\/\/\/\s*(STA|ST|EN|E|END?)\s*$/;
      if (partialRegex.test(line)) {
        return { incomplete: true };
      }
      return null;
    }

    // Validate fully
    const result = MarkerValidator.validateMarker(
      line.trim(),
      this.currentComponentName
    );

    return result;
  }

  /**
   * Creates a "content_block_delta" event for SSE
   */
  _makeDeltaEvent(content) {
    const component = this.componentBuffer.getComponent(this.currentComponentId);
    const isCompoundComplete = this._validateCompoundComponent(this.currentComponentName, component?.code || '');

    return {
      type: 'content_block_delta',
      metadata: {
        componentId: this.currentComponentId,
        componentName: this.currentComponentName,
        position: component?.position || 'main',
        isCompoundComplete,
        isCritical: CRITICAL_COMPONENTS.has(this.currentComponentName)
      },
      delta: { text: content }
    };
  }

  /**
   * Validates if a compound component has all required subcomponents
   */
  _validateCompoundComponent(componentName, code) {
    const compoundDef = COMPOUND_COMPONENTS[componentName];
    if (!compoundDef) {
      return true; // Not a compound component, so it's valid
    }

    // Check if all required subcomponents are present
    return Object.entries(compoundDef.subcomponentPatterns)
      .every(([_, pattern]) => pattern.test(code));
  }
}

module.exports = GeneratorState; 