// backend/utils/markerValidator.js

class MarkerValidator {
  // Updated pattern to be more strict with whitespace
  static MARKER_PATTERN = /^\/\/\/\s+(START|END)\s+([A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?)\s*(?:position=([a-z]+))?\s*$/m;
  static INCOMPLETE_MARKER = /^\/\/\/\s*(START|END)\s*$/m;
  static VALID_COMPONENT_NAME = /^[A-Z][a-zA-Z0-9]*(?:Section|Layout|Component)?$/;

  // Common whitespace characters to normalize
  static WHITESPACE_CHARS = /[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

  /**
   * Normalizes whitespace in a string, handling various Unicode whitespace characters
   * @param {string} str - String to normalize
   * @returns {string} - Normalized string
   */
  static normalizeWhitespace(str) {
    return str
      .replace(this.WHITESPACE_CHARS, ' ')  // Convert all whitespace to simple spaces
      .trim()                               // Remove leading/trailing whitespace
      .replace(/\s+/g, ' ');               // Collapse multiple spaces
  }

  /**
   * Validates a marker string and returns a structured result
   * @param {string} markerStr - The full marker string to validate
   * @param {string} currentComponentName - The name of the current active component (for END markers)
   * @returns {{ isValid: boolean, type: string, name: string, position: string, error?: string }}
   */
  static validateMarker(markerStr, currentComponentName = null) {
    // Default invalid result
    const invalidResult = { 
      isValid: false, 
      type: '', 
      name: '', 
      position: '', 
      error: 'Invalid marker format' 
    };

    try {
      if (!markerStr || typeof markerStr !== 'string') {
        return { ...invalidResult, error: 'Marker must be a non-empty string' };
      }

      // Normalize whitespace first
      const normalizedMarker = this.normalizeWhitespace(markerStr);

      // Check for incomplete markers
      if (this.INCOMPLETE_MARKER.test(normalizedMarker)) {
        return { ...invalidResult, error: 'Incomplete marker detected' };
      }

      // Extract marker components
      const match = normalizedMarker.match(this.MARKER_PATTERN);
      if (!match) {
        return { ...invalidResult, error: 'Marker does not match required pattern' };
      }

      const [ , type, name, position = 'main' ] = match;

      // Additional validation for position
      const normalizedPosition = position.toLowerCase();
      if (!['main', 'header', 'footer'].includes(normalizedPosition)) {
        return {
          ...invalidResult,
          error: `Invalid position: '${position}'. Must be one of: main, header, footer`
        };
      }

      // Validate name
      if (!this.VALID_COMPONENT_NAME.test(name)) {
        return { 
          ...invalidResult, 
          error: `Invalid component name format: '${name}'` 
        };
      }

      // For END markers, ensure it matches the current active component
      if (type === 'END' && currentComponentName) {
        const normalizedCurrent = this.normalizeComponentName(currentComponentName);
        const normalizedNew = this.normalizeComponentName(name);
        
        if (normalizedCurrent !== normalizedNew) {
          return { 
            ...invalidResult, 
            error: `END marker mismatch: expected '${currentComponentName}', got '${name}'` 
          };
        }
      }

      return {
        isValid: true,
        type,
        name,
        position: normalizedPosition,
        error: null
      };
    } catch (error) {
      return {
        ...invalidResult,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validates just the component name
   * @param {string} name - The component name to validate
   * @returns {boolean} - Whether the name is valid
   */
  static isValidComponentName(name) {
    if (!name || typeof name !== 'string') return false;
    return this.VALID_COMPONENT_NAME.test(this.normalizeComponentName(name));
  }

  /**
   * Normalizes a component name by removing any 'H' prefix and extra whitespace
   * @param {string} name - The component name to normalize
   * @returns {string} - The normalized name
   */
  static normalizeComponentName(name) {
    if (!name || typeof name !== 'string') return '';
    return this.normalizeWhitespace(name)
      .replace(/^H+(?=[A-Z])/, '')  // Remove H prefix if followed by capital letter
      .trim();
  }
}

module.exports = MarkerValidator; 