const { fallbackCache } = require('../database');

// Store active SSE sessions
const activeSessions = new Map();

const setupSSE = (req, res) => {
  const sessionId = req.query.sessionId || `session_${Date.now()}`;

  // Set headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Store session info
  activeSessions.set(sessionId, {
    lastEventId: req.headers['last-event-id'] || '0',
    components: [],
    res
  });

  // Clean up on client disconnect
  req.on('close', () => {
    console.log(`Client disconnected from session ${sessionId}`);
    activeSessions.delete(sessionId);
  });

  return sessionId;
};

const sendSSEMessage = async (res, data, eventId) => {
  if (!res.writeable) return false;

  try {
    // Store component in fallback cache if it's a component
    if (data.type === 'content_block_delta' && data.delta?.code) {
      await fallbackCache.set(
        `component_${eventId}`,
        JSON.stringify(data)
      );
    }

    const message = `id: ${eventId}\ndata: ${JSON.stringify(data)}\n\n`;
    return res.write(message);
  } catch (error) {
    console.error('Error sending SSE message:', error);
    return false;
  }
};

const resumeSession = async (sessionId, lastEventId) => {
  try {
    // Get all cached components after lastEventId
    const components = [];
    for (let i = parseInt(lastEventId) + 1; ; i++) {
      const component = await fallbackCache.get(`component_${i}`);
      if (!component) break;
      components.push(JSON.parse(component));
    }
    return components;
  } catch (error) {
    console.error('Error resuming session:', error);
    return [];
  }
};

module.exports = {
  setupSSE,
  sendSSEMessage,
  resumeSession,
  activeSessions
}; 