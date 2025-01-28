const TestArea = ({ components }) => {
  if (!components?.length) return null;
  
  return (
    <div className="mt-8 p-4 bg-slate-900/50 rounded-lg">
      <h3 className="text-sm font-medium text-slate-200 mb-4">Test Area - Raw Component Code</h3>
      <div className="space-y-4">
        {components.map((component, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">{component.name}</span>
              <span className="text-xs text-slate-500">
                {component.isComplete ? '(Complete)' : '(Streaming)'}
              </span>
            </div>
            <pre className="text-xs bg-slate-900 p-4 rounded overflow-auto max-h-[300px] whitespace-pre-wrap">
              <code className="text-slate-300">{component.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

const handleStreamMessage = (message) => {
  console.log('Received stream message:', message);
  
  if (message.type === 'content_block_delta') {
    const { delta } = message;
    
    if (delta.type === 'component_delta') {
      const { name, text, isComplete } = delta;
      console.log(`Processing component ${name}, isComplete: ${isComplete}`);
      
      dispatch({
        type: 'UPDATE_COMPONENT',
        payload: {
          name,
          text,
          isComplete,
          streaming: !isComplete
        }
      });
      
      if (isComplete) {
        console.log(`Component ${name} complete - ready for LivePreview`);
      }
    }
  }
};

return (
  <div className="flex-1 overflow-hidden flex flex-col">
    {/* ... existing preview window code ... */}
    <div className="flex-1 overflow-auto">
      <div className="max-w-[2100px] mx-auto">
        <LivePreview components={components} />
        <TestArea components={components} />
      </div>
    </div>
  </div>
); 