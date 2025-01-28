const mongoose = require('mongoose');

// Enable mongoose debug mode
mongoose.set('debug', true);

// Add connection event listeners
mongoose.connection.on('connecting', () => {
  console.log('Mongoose: Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose: Connected to MongoDB');
});

mongoose.connection.on('disconnecting', () => {
  console.log('Mongoose: Disconnecting from MongoDB...');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose: Disconnected from MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

// Add ping function
const pingDB = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('Successfully connected to MongoDB!');
    console.log('Database name:', mongoose.connection.db.databaseName);
    return true;
  } catch (error) {
    console.error('MongoDB ping failed:', error);
    return false;
  }
};

class InMemoryCache {
  constructor() {
    this.store = new Map();
  }

  async set(key, value) {
    this.store.set(key, value);
  }

  async get(key) {
    return this.store.get(key);
  }

  async clear() {
    this.store.clear();
  }
}

// Fallback cache when DB is unavailable
const fallbackCache = new InMemoryCache();

const connectWithRetry = async (retries = 5, delay = 5000) => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/shapeweb";
    console.log('Attempting to connect to MongoDB...');
    console.log('Using URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
    
    const clientOptions = { 
      serverApi: { version: '1', strict: true, deprecationErrors: true },
      maxPoolSize: 10,
      minPoolSize: 5
    };

    console.log('Connecting with options:', JSON.stringify(clientOptions, null, 2));
    
    try {
      await mongoose.connect(uri, clientOptions);
      console.log('Initial connection successful');
      
      // Test the connection with more specific error handling
      try {
        const adminDb = mongoose.connection.db.admin();
        console.log('Got admin DB');
        const result = await adminDb.ping();
        console.log('MongoDB ping result:', result);
        console.log('Connected to database:', mongoose.connection.db.databaseName);
        
        // List all databases to verify permissions
        const dbs = await adminDb.listDatabases();
        console.log('Available databases:', dbs.databases.map(db => db.name));
      } catch (pingError) {
        console.error('Ping/Admin operation failed:');
        console.error('Message:', pingError.message);
        console.error('Code:', pingError.code);
        console.error('Name:', pingError.name);
        if (pingError.errmsg) console.error('Error msg:', pingError.errmsg);
        throw pingError;
      }
    } catch (connError) {
      console.error('Connection failed:');
      console.error('Message:', connError.message);
      console.error('Code:', connError.code);
      console.error('Name:', connError.name);
      if (connError.errmsg) console.error('Error msg:', connError.errmsg);
      throw connError;
    }

    // Reset fallback cache if we reconnect
    await fallbackCache.clear();

    // Handle connection errors after initial connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, attempting reconnect...');
      setTimeout(() => connectWithRetry(retries, delay), delay);
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return true;
  } catch (error) {
    console.error(`MongoDB connection error (attempts left: ${retries}):`, error);
    if (retries > 0) {
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retries - 1, delay);
    }
    console.log('Using fallback in-memory cache');
    return false;
  }
};

// Export both the connection function and fallback cache
module.exports = { 
  connectDB: connectWithRetry,
  fallbackCache,
  pingDB
}; 