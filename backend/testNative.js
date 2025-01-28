require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testNativeConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('Testing connection with native driver...');
  console.log('Using URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

  const client = new MongoClient(uri, {
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true,
    },
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true
  });

  try {
    await client.connect();
    console.log('Connected successfully!');
    
    // Test the connection
    const adminDb = client.db().admin();
    const result = await adminDb.ping();
    console.log('Ping result:', result);
    
    const dbs = await adminDb.listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name));
  } catch (err) {
    console.error('Connection error:', err);
    if (err.cause) console.error('Cause:', err.cause);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

testNativeConnection(); 