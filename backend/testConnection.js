require('dotenv').config();
const mongoose = require('mongoose');

// Set strict query mode for mongoose 7
mongoose.set('strictQuery', true);

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    const uri = process.env.MONGODB_URI;
    console.log('Using URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

    await mongoose.connect(uri, {
      serverApi: { version: '1', strict: true, deprecationErrors: true }
    });

    console.log('Connected successfully!');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // Try to list collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('Disconnected successfully');
  } catch (error) {
    console.error('Connection error:', error.name);
    console.error('Error message:', error.message);
    if (error.cause) console.error('Cause:', error.cause);
  }
}

testConnection(); 