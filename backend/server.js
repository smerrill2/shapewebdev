require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { connectDB, pingDB } = require('./database');
const componentsRoutes = require('./routes/components');
const generateController = require('./controllers/generateController');

const app = express();
const PORT = process.env.PORT || 5001;

// Add environment variable check
console.log('Environment check:', {
  hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  keyLength: process.env.ANTHROPIC_API_KEY?.length,
  port: PORT
});

// Initialize MongoDB connection
connectDB().then(connected => {
  if (!connected) {
    console.warn('Failed to connect to MongoDB, using fallback cache');
  }
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

// Enable compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, {
    body: req.method === 'POST' ? req.body : undefined,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await pingDB();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: dbStatus ? 'connected' : 'disconnected'
  });
});

// Routes
app.post('/api/generate', generateController);
app.use('/api/components', componentsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Clean up SSE connection if exists
  if (req.sseConnection) {
    req.sseConnection.end();
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Handle cleanup on server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Cleaning up...');
  // Close any open SSE connections
  if (app.locals.sseConnections) {
    app.locals.sseConnections.forEach(conn => conn.end());
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  app.locals.sseConnections = new Set();
}); 