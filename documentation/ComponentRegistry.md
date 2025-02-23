# Component Registry Documentation

## Overview
The Component Registry is a central state management system for handling streaming component generation. It manages the lifecycle of components as they are created, updated, and completed during the streaming process.

## Core Functionality

### State Structure
```typescript
interface ComponentState {
  code: string;
  isComplete: boolean;
  metadata: Record<string, any>;
}

interface RegistryState {
  components: {
    [componentId: string]: ComponentState;
  };
}
```

### Available Methods
- `startComponent(componentId: string, metadata: object)`: Initializes a new component
- `appendToComponent(componentId: string, codeDelta: string)`: Adds code to an existing component
- `completeComponent(componentId: string)`: Marks a component as complete
- `getComponents()`: Returns all registered components

## Implementation Details

### Hook Usage
```jsx
const {
  startComponent,
  appendToComponent,
  completeComponent,
  getComponents
} = useComponentRegistry();
```

### State Management
- Uses React's `useReducer` for predictable state updates
- Maintains immutable state updates for React's change detection
- Handles component lifecycle through actions:
  - `START_COMPONENT`
  - `APPEND_TO_COMPONENT`
  - `COMPLETE_COMPONENT`

### Error Handling
The registry includes built-in error handling for common scenarios:
- Attempting to append to non-existent components
- Trying to modify completed components
- Invalid component operations

## Integration with SSE

### Event Flow
1. SSE event arrives (`content_block_start`)
2. Component Registry creates new component
3. Code deltas stream in (`content_block_delta`)
4. Registry accumulates code
5. Stream completes (`content_block_stop`)
6. Registry marks component as complete

### Example Usage with SSE
```javascript
// In your SSE listener
eventSource.addEventListener('content_block_start', (event) => {
  const { componentId, metadata } = JSON.parse(event.data);
  startComponent(componentId, metadata);
});

eventSource.addEventListener('content_block_delta', (event) => {
  const { componentId, code } = JSON.parse(event.data);
  appendToComponent(componentId, code);
});

eventSource.addEventListener('content_block_stop', (event) => {
  const { componentId } = JSON.parse(event.data);
  completeComponent(componentId);
});
```

## Testing

### Test Coverage
The Component Registry includes comprehensive tests for:
- Component initialization
- Code accumulation
- Completion state
- Error scenarios
- Multiple component handling

### Example Test
```javascript
it('should handle component lifecycle', () => {
  const { result } = renderHook(() => useComponentRegistry());
  
  // Start component
  act(() => {
    result.current.startComponent('header', { position: 'top' });
  });
  
  // Append code
  act(() => {
    result.current.appendToComponent('header', 'const Header = () => {};');
  });
  
  // Complete component
  act(() => {
    result.current.completeComponent('header');
  });
  
  const components = result.current.getComponents();
  expect(components.header.isComplete).toBe(true);
});
```

## Best Practices

### Component Naming
- Use descriptive, unique IDs for components
- Consider prefixing with component type (e.g., 'header', 'footer')
- Avoid special characters in IDs

### Metadata Usage
- Include positioning information
- Add render order if needed
- Store any component-specific configuration

### Error Handling
- Always check component existence before operations
- Verify component state before modifications
- Handle edge cases gracefully

## Integration Guidelines

### With Live Preview
```jsx
function LivePreview() {
  const { getComponents } = useComponentRegistry();
  const components = getComponents();
  
  return (
    <div>
      {Object.entries(components).map(([id, component]) => (
        <PreviewComponent
          key={id}
          code={component.code}
          isComplete={component.isComplete}
          metadata={component.metadata}
        />
      ))}
    </div>
  );
}
```

### With Transform Pipeline
```jsx
function TransformComponent({ component }) {
  const transformedCode = useTransformPipeline(component.code);
  
  return (
    <LivePreview
      code={transformedCode}
      position={component.metadata.position}
    />
  );
}
```

## Performance Considerations

### State Updates
- Components are updated independently
- State is normalized for efficient updates
- Immutable updates prevent unnecessary re-renders

### Memory Management
- Component code is accumulated efficiently
- No duplicate code storage
- Clean state structure

## Future Enhancements

### Potential Additions
- Component dependency tracking
- Automatic cleanup of completed components
- Snapshot/restore functionality
- Real-time validation
- Transform pipeline integration

### Planned Features
- Component versioning
- Undo/redo support
- Component relationships
- Enhanced error recovery 