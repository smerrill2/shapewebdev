/**
 * Manages the streaming states of components
 */
export class StreamingStates {
  constructor() {
    this.states = new Map();
  }

  /**
   * Get the streaming state for a component
   * @param {string} componentId The component's unique identifier
   */
  get(componentId) {
    return this.states.get(componentId);
  }

  /**
   * Set the streaming state for a component
   * @param {string} componentId The component's unique identifier
   * @param {Object} state The streaming state to set
   */
  set(componentId, state) {
    this.states.set(componentId, state);
  }

  /**
   * Start streaming for a component
   * @param {string} componentId The component's unique identifier
   */
  startStreaming(componentId) {
    this.states.set(componentId, {
      isStreaming: true,
      isComplete: false,
      startTime: Date.now(),
      lastUpdate: Date.now()
    });
  }

  /**
   * Stop streaming for a component
   * @param {string} componentId The component's unique identifier
   */
  stopStreaming(componentId) {
    const state = this.states.get(componentId);
    if (state) {
      state.isStreaming = false;
      state.isComplete = true;
      state.endTime = Date.now();
      state.duration = state.endTime - state.startTime;
      this.states.set(componentId, state);
    }
  }

  /**
   * Update the streaming state for a component
   * @param {string} componentId The component's unique identifier
   * @param {Object} updates Updates to apply to the state
   */
  updateState(componentId, updates) {
    const state = this.states.get(componentId);
    if (state) {
      Object.assign(state, updates, { lastUpdate: Date.now() });
      this.states.set(componentId, state);
    }
  }

  /**
   * Check if a component is currently streaming
   * @param {string} componentId The component's unique identifier
   */
  isStreaming(componentId) {
    const state = this.states.get(componentId);
    return state ? state.isStreaming : false;
  }

  /**
   * Check if a component is complete
   * @param {string} componentId The component's unique identifier
   */
  isComplete(componentId) {
    const state = this.states.get(componentId);
    return state ? state.isComplete : false;
  }

  /**
   * Get the number of states being tracked
   */
  get size() {
    return this.states.size;
  }

  /**
   * Clear all streaming states
   */
  clear() {
    this.states.clear();
  }
} 