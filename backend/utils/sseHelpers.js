exports.setupSSE = (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send an initial connection message
  res.write('data: {"connected": true}\n\n');
};

exports.sendSSEMessage = (res, data) => {
  if (res.writableEnded) {
    console.warn('Attempted to write to a closed SSE connection');
    return false;
  }

  try {
    // If data is already a string (pre-formatted SSE data), send it directly
    if (typeof data === 'string') {
      res.write(`data: ${data}\n\n`);
      return true;
    }
    
    // Otherwise format the data
    const message = JSON.stringify(data);
    res.write(`data: ${message}\n\n`);
    return true;
  } catch (error) {
    console.error('Error sending SSE message:', error);
    return false;
  }
};

exports.sendSSEError = (res, error) => {
  return exports.sendSSEMessage(res, {
    type: 'error',
    message: error.message || 'An error occurred',
    timestamp: new Date().toISOString()
  });
}; 