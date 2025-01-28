import { ReadableStream, TransformStream, WritableStream } from 'web-streams-polyfill/dist/ponyfill.js';

// Initialize polyfills in async context
(async () => {
  global.ReadableStream = ReadableStream;
  global.TransformStream = TransformStream;
  global.WritableStream = WritableStream;
  
  // Add delay to ensure polyfills are applied
  await new Promise(resolve => setTimeout(resolve, 100));
})();
