require('dotenv').config();
const express = require('express');
const cors = require('cors');
const generateRoutes = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 5001;

// Add environment variable check
console.log('Environment check:', {
  hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  keyLength: process.env.ANTHROPIC_API_KEY?.length,
  port: PORT
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/generate', generateRoutes);

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