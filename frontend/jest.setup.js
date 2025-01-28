import '@testing-library/jest-dom';
import { ReadableStream, TransformStream, WritableStream } from 'web-streams-polyfill/dist/ponyfill.es2018.js';
import { TextEncoder, TextDecoder } from 'util';
const mockServer = require('./src/test/mockServer');

// Configure polyfills
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Configure mock server
let serverInstance;

beforeAll(() => {
  serverInstance = mockServer.listen(3001);
});

afterEach(() => {
  // No reset needed for simple HTTP server
});

afterAll(() => {
  serverInstance.close();
});
