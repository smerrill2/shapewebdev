/**
 * Process a component start event
 * @param {Object} event The start event
 * @param {StreamRegistry} registry The component registry
 * @param {StreamingStates} streamingStates The streaming states manager
 */
export function processComponentStart(event, registry, streamingStates) {
  if (!event.metadata?.componentId || !event.metadata?.componentName) {
    console.warn('⚠️ Invalid component_start event:', event);
    return;
  }

  const { componentId, componentName, position } = event.metadata;

  // Register the component
  registry.registerComponent(componentId, {
    componentName,
    position: position || 'main'
  });

  // Start streaming state
  streamingStates.startStreaming(componentId);
}

/**
 * Process a component stop event
 * @param {Object} event The stop event
 * @param {StreamRegistry} registry The component registry
 * @param {StreamingStates} streamingStates The streaming states manager
 */
export function processComponentStop(event, registry, streamingStates) {
  if (!event.metadata?.componentId) {
    console.warn('⚠️ Invalid component_stop event:', event);
    return;
  }

  const { componentId } = event.metadata;

  // Check if component exists
  if (!registry.getComponent(componentId)) {
    console.warn('⚠️ Attempting to stop non-existent component:', componentId);
    return;
  }

  // Update component completion status
  registry.updateComponent(componentId, { isComplete: true });

  // Update layout if sections are provided
  if (event.metadata.sections) {
    registry.updateLayout(event.metadata);
  }

  // Stop streaming state
  streamingStates.stopStreaming(componentId);
}

/**
 * Process a component content event
 * @param {Object} event The content event
 * @param {StreamRegistry} registry The component registry
 * @param {StreamingStates} streamingStates The streaming states manager
 */
export function processComponentContent(event, registry, streamingStates) {
  if (!event.metadata?.componentId || !event.delta?.text) {
    console.warn('⚠️ Invalid component_content event:', event);
    return;
  }

  const { componentId } = event.metadata;
  const component = registry.getComponent(componentId);

  if (!component) {
    console.warn('⚠️ Content received for non-existent component:', componentId);
    return;
  }

  // Update component code
  registry.updateComponent(componentId, {
    code: component.code + event.delta.text
  });

  // Update streaming state
  streamingStates.updateState(componentId, {
    lastUpdate: Date.now()
  });
}

/**
 * Process a component finished event
 * @param {Object} event The finished event
 * @param {StreamRegistry} registry The component registry
 * @param {StreamingStates} streamingStates The streaming states manager
 */
export function processComponentFinished(event, registry, streamingStates) {
  if (!event.metadata?.componentId || !event.code) {
    console.warn('⚠️ Invalid component_finished event:', event);
    return;
  }

  const { componentId } = event.metadata;
  const component = registry.getComponent(componentId);

  if (!component) {
    console.warn('⚠️ Finished event for non-existent component:', componentId);
    return;
  }

  // Update component with final code
  registry.updateComponent(componentId, {
    code: event.code,
    isComplete: true
  });

  // Stop streaming state
  streamingStates.stopStreaming(componentId);
} 