export const createMockStream = () => {
  let controller;
  const stream = new ReadableStream({
    start(c) { controller = c; },
  });

  // Simulated AI response with known issues
  const mockEvents = [
    { 
      type: 'content_block_start',
      metadata: { 
        componentName: 'HeroSection',
        position: 'main',
        componentId: 'comp_herosection'
      },
      content: '/// START HeroSection position=main'
    },
    {
      type: 'content_block_delta',
      delta: { 
        text: `function HeroSection() {
  return (
    <div className="bg-blue-500">
      <h1>Welcome</h1>
    </div>
  );
}`
      },
      metadata: { componentId: 'comp_herosection' }
    },
    {
      type: 'content_block_stop',
      metadata: { componentId: 'comp_herosection', isComplete: true }
    },
    {
      type: 'content_block_start',
      metadata: { 
        componentName: 'RootLayout',
        position: 'layout',
        componentId: 'root_layout'
      },
      content: '/// START RootLayout position=layout'
    },
    {
      type: 'content_block_delta',
      delta: { 
        text: `const RootLayout = () => {
  return (
    <main>
      <HeroSection />
    </main>
  );
};

render(<RootLayout />);`
      },
      metadata: { componentId: 'root_layout' }
    },
    {
      type: 'content_block_stop',
      metadata: { componentId: 'root_layout', isComplete: true }
    }
  ];

  // Feed events with realistic timing
  mockEvents.forEach((event, index) => {
    setTimeout(() => {
      const sseData = `data: ${JSON.stringify({
        ...event,
        // Include raw text content for parser validation
        content_block: { text: event.content || '' },
        delta: event.delta ? { text: event.delta.text } : undefined
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(sseData));
      
      if (index === mockEvents.length - 1) {
        controller.close();
      }
    }, index * 100);
  });

  return stream;
}; 