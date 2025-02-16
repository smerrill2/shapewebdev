/**
 * Manages the registration and layout of streaming components
 */
export class StreamRegistry {
  constructor() {
    this.components = new Map();
    this.layout = {
      sections: {
        header: [],
        main: [],
        footer: []
      }
    };
  }

  /**
   * Register a new component
   * @param {string} componentId Unique identifier for the component
   * @param {Object} metadata Component metadata including name and position
   */
  registerComponent(componentId, metadata) {
    if (!componentId || !metadata.componentName) {
      console.warn('⚠️ Invalid component registration:', { componentId, metadata });
      return;
    }

    this.components.set(componentId, {
      id: componentId,
      name: metadata.componentName,
      position: metadata.position || 'main',
      code: '',
      isComplete: false
    });
  }

  /**
   * Update the layout sections based on component metadata
   * @param {Object} metadata Component metadata containing section information
   */
  updateLayout(metadata) {
    if (!metadata.sections) return;

    Object.entries(metadata.sections).forEach(([section, components]) => {
      if (Array.isArray(components)) {
        this.layout.sections[section] = components;
      }
    });
  }

  /**
   * Get a component by its ID
   * @param {string} componentId The component's unique identifier
   */
  getComponent(componentId) {
    return this.components.get(componentId);
  }

  /**
   * Update a component's properties
   * @param {string} componentId The component's unique identifier
   * @param {Object} updates Updates to apply to the component
   */
  updateComponent(componentId, updates) {
    const component = this.components.get(componentId);
    if (component) {
      Object.assign(component, updates);
      this.components.set(componentId, component);
    }
  }

  /**
   * Clear all registered components and layout
   */
  clear() {
    this.components.clear();
    this.layout.sections = {
      header: [],
      main: [],
      footer: []
    };
  }
} 