const { generate } = require('../utils/aiClient');
const GeneratePageService = require('../services/generatePageService');
const { isTestId } = require('../utils/testHelpers');

/**
 * Sends an error event through the SSE stream
 */
const sendError = (res, code, message, error = null, retryable = false) => {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      code,
      message,
      error,
      retryable
    })}\n\n`);
  }
};

/**
 * Sends a status event through the SSE stream
 */
const sendStatus = (res, status, metadata = {}) => {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({
      type: 'status',
      status,
      metadata
    })}\n\n`);
  }
};

const generateController = async (req, res) => {
  let service = null;
  let stream = null;

  try {
    // Validate project and version IDs
    const { projectId, versionId } = req.query;
    if (!projectId || !versionId) {
      sendError(res, 'MISSING_IDS', 'Missing projectId or versionId');
      res.end();
      return;
    }

    // Allow test IDs to bypass database validation
    if (!isTestId(projectId) || !isTestId(versionId)) {
      console.log('⚠️ Non-test IDs would be validated against database');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
    console.log('📡 SSE headers set');

    const { prompt, style, requirements } = req.body;
    
    // Create service and start timeout
    service = new GeneratePageService();
    const timeoutPromise = service.startTimeout();

    // Send initial status
    sendStatus(res, 'started', { timestamp: Date.now() });

    // Start generation
    stream = await generate(prompt, style, requirements);

    // Handle client disconnect
    req.on('close', () => {
      console.log('❌ Client disconnected');
      if (!res.writableEnded) {
        res.end();
      }
      if (service) {
        service.finalize();
      }
      if (stream) {
        stream.destroy();
      }
    });

    // Handle stream events
    stream.on('data', (chunk) => {
        if (!res.writable) {
        console.log('❌ Response no longer writable');
          stream.destroy();
        if (service) {
          service.finalize();
        }
        return;
        }

        const data = chunk.toString();
      console.log('📥 Received chunk:', data);

      try {
        // Process chunk via service
        const events = service.handleChunk(data);

        // Send the resulting events to the client
        for (const evt of events) {
          // For error events, use our helper
          if (evt.type === 'error') {
            sendError(res, evt.code, evt.message, evt.error, true);
          } else {
            res.write(`data: ${JSON.stringify(evt)}\n\n`);
          }
        }

        // Periodically send stats
        if (service.stats.totalChunks % 10 === 0) {
          sendStatus(res, 'generating', service.getStats());
        }
      } catch (writeError) {
        console.error('❌ Error writing response:', writeError);
        sendError(res, 'WRITE_ERROR', 'Failed to write response', writeError.message);
        stream.destroy();
        service.finalize();
      }
    });

    // Handle stream end
    stream.on('end', () => {
      console.log('✅ Stream ended');
      if (service) {
        service.finalize();
      }
      
      if (!res.writableEnded) {
        // Send final stats
        sendStatus(res, 'completed', service.getStats());
        // Send message_stop event before ending
        res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
        res.end();
      }
    });

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      if (service) {
        service.finalize();
      }
      
      sendError(res, 'STREAM_ERROR', 'Stream error occurred', error.message);
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Wait for either completion or timeout
    await Promise.race([
      new Promise((resolve) => stream.on('end', resolve)),
      timeoutPromise
    ]);

  } catch (error) {
    console.error('❌ Controller error:', error);
    
    // Determine if it's a timeout error
    const isTimeout = error.message?.includes('timed out');
    
    sendError(
      res,
      isTimeout ? 'TIMEOUT_ERROR' : 'CONTROLLER_ERROR',
      isTimeout ? 'Generation timed out' : 'Controller error occurred',
      error.message,
      !isTimeout // Only mark as retryable if it's not a timeout
    );

    // Clean up
    if (service) {
      service.finalize();
    }
    if (stream) {
      stream.destroy();
    }
    if (!res.writableEnded) {
      res.end();
    }
  }
};

module.exports = generateController;