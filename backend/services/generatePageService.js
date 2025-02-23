const GeneratorState = require('../utils/generatorState');

// Configuration
const SERVICE_CONFIG = {
  TIMEOUT_MS: 30000, // 30 second timeout
  MAX_ERRORS: 3, // Maximum number of parse errors before failing
  ERROR_WINDOW_MS: 5000 // Time window for counting errors
};

/**
 * This service receives the SSE data chunks from your AI stream,
 * processes them for marker-based code blocks, and returns events
 * that your controller can forward to the client.
 */
class GeneratePageService {
  constructor() {
    this.state = new GeneratorState();
    this.startTime = Date.now();
    this.parseErrors = [];
    this.timeoutId = null;
    this.stats = {
      totalChunks: 0,
      parseErrors: 0,
      lastChunkTime: null
    };
  }

  /**
   * Start the generation timeout
   * @returns {Promise} Resolves when generation completes or rejects on timeout
   */
  startTimeout() {
    return new Promise((resolve, reject) => {
      this.timeoutId = setTimeout(() => {
        const duration = Date.now() - this.startTime;
        reject(new Error(`Generation timed out after ${duration}ms`));
      }, SERVICE_CONFIG.TIMEOUT_MS);
    });
  }

  /**
   * Clear the timeout if generation completes successfully
   */
  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Check if we've hit too many parse errors in our time window
   */
  _checkErrorThreshold() {
    const now = Date.now();
    // Remove old errors outside our window
    this.parseErrors = this.parseErrors.filter(
      time => (now - time) <= SERVICE_CONFIG.ERROR_WINDOW_MS
    );
    
    return this.parseErrors.length > SERVICE_CONFIG.MAX_ERRORS;
  }

  /**
   * Process a single chunk of data from the AI. 
   * If it's JSON, parse it and handle accordingly.
   */
  handleChunk(rawChunk) {
    const eventsToSend = [];
    this.stats.totalChunks++;
    this.stats.lastChunkTime = Date.now();

    try {
      const event = JSON.parse(rawChunk);
      
      // If it's a content delta with text, parse for markers
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const newEvents = this.state.processChunk(event.delta.text);
        eventsToSend.push(...newEvents);
      }

      // Return the original event as well, unless it's a content delta
      // (since we've processed those into more specific events)
      if (event.type !== 'content_block_delta') {
        eventsToSend.push(event);
      }
    } catch (err) {
      // Track parse error
      this.parseErrors.push(Date.now());
      this.stats.parseErrors++;

      // Check if we've hit our error threshold
      if (this._checkErrorThreshold()) {
        eventsToSend.push({
          type: 'error',
          code: 'PARSE_ERROR_THRESHOLD',
          message: 'Too many parse errors occurred',
          error: 'Generation quality degraded'
        });
      } else {
        eventsToSend.push({
          type: 'error',
          code: 'PARSE_ERROR',
          message: 'Failed to parse stream data',
          error: err.message
        });
      }
    }

    return eventsToSend;
  }

  /**
   * Called when the AI stream is done ("end" event).
   * Optionally finalize or do any post-processing.
   */
  finalize() {
    // Clear any pending timeout
    this.clearTimeout();

    // Get all components from the buffer for final validation
    const allComponents = this.state.componentBuffer.getAllComponents();
    const duration = Date.now() - this.startTime;
    
    // Log completion info
    console.log('✅ Generation completed:', {
      duration: `${duration}ms`,
      stats: {
        totalChunks: this.stats.totalChunks,
        parseErrors: this.stats.parseErrors,
        averageChunkTime: duration / this.stats.totalChunks
      },
      components: allComponents.map(c => ({
        name: c.name,
        position: c.position,
        isComplete: c.isComplete,
        codeLength: c.code.length,
        metadata: c.metadata
      }))
    });

    // Reset state
    this.state.reset();
    this.parseErrors = [];
    this.stats = {
      totalChunks: 0,
      parseErrors: 0,
      lastChunkTime: null
    };
  }

  /**
   * Get current generation statistics
   */
  getStats() {
    return {
      duration: Date.now() - this.startTime,
      ...this.stats,
      components: this.state.componentBuffer.getAllComponents().length
    };
  }
}

module.exports = GeneratePageService; 