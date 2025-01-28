const { jest } = require('@jest/globals');

// Setup TextEncoder/TextDecoder polyfills for Jest
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add additional polyfills for Node.js environment
const { ReadableStream, WritableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;

// Mock fetch implementation
global.fetch = require('node-fetch');

// Setup MongoDB mock
const mongoose = require('mongoose');
mongoose.set('strictQuery', true);

// Setup mock server
const mockServer = require('../frontend/src/test/mockServer');
let serverInstance;

// Increase timeout for setup
jest.setTimeout(60000);

beforeAll(async () => {
  try {
    // Start mock server on a random port to avoid conflicts
    serverInstance = mockServer.listen(0);
    
    // Use in-memory MongoDB for tests
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Close mock server
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
    }
    
    // Disconnect from database
    await mongoose.connection.close();
  } catch (error) {
    console.error('Test cleanup failed:', error);
    throw error;
  }
});

afterEach(async () => {
  try {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    console.error('Test cleanup failed:', error);
    throw error;
  }
});

// Mock the database module
jest.mock('./database');

// Set up environment variables for testing
process.env.MONGODB_URI = 'mongodb://test:27017/test';
process.env.ANTHROPIC_API_KEY = 'test-key';
