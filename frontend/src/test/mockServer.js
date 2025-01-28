const http = require('http');

const mockServer = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Send parent component
      res.write(`data: ${JSON.stringify({
        type: 'jsx_chunk',
        code: `function ParentComponent() {
  return (
    <div>
      <h1>Parent Content</h1>
      <ChildComponent />
    </div>
  );
}`,
        metadata: {
          componentName: 'ParentComponent',
          parentComponent: null,
          childComponents: ['ChildComponent'],
          timestamp: Date.now()
        }
      })}\n\n`);

      // Send child component
      res.write(`data: ${JSON.stringify({
        type: 'jsx_chunk',
        code: `function ChildComponent() {
  return <p>Child Content</p>;
}`,
        metadata: {
          componentName: 'ChildComponent',
          parentComponent: 'ParentComponent',
          childComponents: [],
          timestamp: Date.now()
        }
      })}\n\n`);

      // End stream
      res.write('data: {"type":"message_stop"}\n\n');
      res.end();
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

module.exports = mockServer;
