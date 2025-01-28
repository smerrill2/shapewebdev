const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear all collections before each test
beforeEach(async () => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected. Check your test setup.');
  }
  
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

// Reset mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
}); 