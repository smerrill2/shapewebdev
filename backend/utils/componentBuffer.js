// backend/utils/componentBuffer.js

/**
 * Configuration for buffer limits and validation
 */
const BUFFER_CONFIG = {
  MAX_COMPONENT_SIZE: 1024 * 1024, // 1MB max per component
  MAX_COMPONENTS: 100, // Maximum number of components to store
  TRIM_SIZE: 1024 * 512, // Size to trim to if max is exceeded (512KB)
};

class ComponentBuffer {
  constructor() {
    /**
     * Holds all components by an ID, e.g.:
     * {
     *   comp_hero: {
     *     id: 'comp_hero',
     *     name: 'HeroSection',
     *     position: 'header',
     *     code: '...',
     *     isComplete: false,
     *     metadata: {
     *       size: 0,
     *       lastModified: Date,
     *       validationErrors: []
     *     }
     *   }
     * }
     */
    this.components = new Map();
    this.validationHooks = new Set();
    this.stats = {
      totalSize: 0,
      componentCount: 0,
      trimCount: 0
    };
  }

  /**
   * Add a validation hook that will be called before appending content
   * @param {Function} hook - Function(id, content) that returns true if valid
   */
  addValidationHook(hook) {
    this.validationHooks.add(hook);
  }

  /**
   * Start tracking a new component
   */
  startComponent(id, name, position) {
    // Check if we've hit the component limit
    if (this.components.size >= BUFFER_CONFIG.MAX_COMPONENTS) {
      this._cleanOldComponents();
    }

    if (!this.components.has(id)) {
      this.components.set(id, {
        id,
        name,
        position,
        code: '',
        isComplete: false,
        startTime: Date.now(),
        metadata: {
          size: 0,
          lastModified: Date.now(),
          validationErrors: []
        }
      });
      this.stats.componentCount++;
    }
  }

  /**
   * Append content to a component, with size validation
   */
  appendToComponent(id, content) {
    const component = this.components.get(id);
    if (!component) return false;

    // Run validation hooks
    const validationErrors = [];
    for (const hook of this.validationHooks) {
      try {
        const isValid = hook(id, content);
        if (!isValid) {
          validationErrors.push(`Validation failed for hook: ${hook.name}`);
        }
      } catch (error) {
        validationErrors.push(`Validation error: ${error.message}`);
      }
    }

    // Update metadata
    component.metadata.validationErrors = validationErrors;
    
    // If validation failed, don't append content
    if (validationErrors.length > 0) {
      return false;
    }
    
    // Check size limits
    const newSize = component.code.length + content.length;
    if (newSize > BUFFER_CONFIG.MAX_COMPONENT_SIZE) {
      // If the new content alone is too big, trim it first
      const trimmedContent = content.length > BUFFER_CONFIG.TRIM_SIZE 
        ? this._trimContent(content, BUFFER_CONFIG.TRIM_SIZE)
        : content;

      // If we still need to trim existing content
      if (component.code.length + trimmedContent.length > BUFFER_CONFIG.MAX_COMPONENT_SIZE) {
        const remainingSpace = BUFFER_CONFIG.MAX_COMPONENT_SIZE - trimmedContent.length;
        component.code = this._trimContent(component.code, Math.max(0, remainingSpace));
      }

      component.code += trimmedContent;
      component.metadata.size = component.code.length;
      this.stats.trimCount++;
    } else {
      component.code += content;
      component.metadata.size = newSize;
    }

    component.metadata.lastModified = Date.now();
    this.stats.totalSize = this._calculateTotalSize();

    return validationErrors.length === 0;
  }

  /**
   * Mark a component as complete
   */
  completeComponent(id) {
    const component = this.components.get(id);
    if (!component) return;

    component.isComplete = true;
    component.metadata.lastModified = Date.now();
  }

  /**
   * Get a component by ID
   */
  getComponent(id) {
    return this.components.get(id);
  }

  /**
   * Get all components
   */
  getAllComponents() {
    return Array.from(this.components.values());
  }

  /**
   * Get buffer statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageComponentSize: this.stats.totalSize / this.stats.componentCount || 0
    };
  }

  /**
   * Clear the buffer
   */
  clear() {
    this.components.clear();
    this.stats = {
      totalSize: 0,
      componentCount: 0,
      trimCount: 0
    };
  }

  /**
   * Internal: Trim content to a specific size, trying to keep it valid
   */
  _trimContent(content, targetSize) {
    if (content.length <= targetSize) return content;

    // Try to trim at a newline to keep the code structure
    let trimPoint = content.lastIndexOf('\n', targetSize);
    if (trimPoint === -1) trimPoint = targetSize;

    // Include the newline in the trimmed content
    return content.slice(0, trimPoint + 1);
  }

  /**
   * Internal: Calculate total size of all components
   */
  _calculateTotalSize() {
    return Array.from(this.components.values())
      .reduce((total, comp) => total + comp.metadata.size, 0);
  }

  /**
   * Internal: Remove old completed components if we hit the limit
   */
  _cleanOldComponents() {
    const components = Array.from(this.components.values());
    const completedComponents = components
      .filter(c => c.isComplete)
      .sort((a, b) => a.metadata.lastModified - b.metadata.lastModified);

    // Remove the oldest 20% of completed components
    const toRemove = Math.ceil(completedComponents.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      const component = completedComponents[i];
      this.components.delete(component.id);
      this.stats.componentCount--;
      this.stats.totalSize -= component.metadata.size;
    }
  }
}

module.exports = ComponentBuffer; 