const GeneratePageService = require('../../services/generatePageService');

describe('GeneratePageService', () => {
  let service;
  
  beforeEach(() => {
    service = new GeneratePageService();
  });

  describe('Chunk Processing', () => {
    test('handleChunk with content_block_delta', () => {
      const rawChunk = JSON.stringify({
        type: 'content_block_delta',
        delta: {
          text: '/// START HeroSection\nconsole.log("Hello");\n/// END HeroSection'
        }
      });

      const events = service.handleChunk(rawChunk);
      const startEvent = events.find(e => e.type === 'content_block_start');
      const deltaEvent = events.find(e => e.type === 'content_block_delta');
      const stopEvent = events.find(e => e.type === 'content_block_stop');

      expect(startEvent).toBeDefined();
      expect(deltaEvent).toBeDefined();
      expect(stopEvent).toBeDefined();
    });

    test('handleChunk with unparseable JSON', () => {
      const rawChunk = 'NOT-VALID-JSON';
      const events = service.handleChunk(rawChunk);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('error');
      expect(events[0].code).toBe('PARSE_ERROR');
    });

    test('processes multiple chunks in sequence', () => {
      const chunks = [
        JSON.stringify({
          type: 'content_block_delta',
          delta: { text: '/// START TestComponent\n' }
        }),
        JSON.stringify({
          type: 'content_block_delta',
          delta: { text: 'const Test = () => <div>Test</div>;\n' }
        }),
        JSON.stringify({
          type: 'content_block_delta',
          delta: { text: '/// END TestComponent' }
        })
      ];

      let allEvents = [];
      chunks.forEach(chunk => {
        allEvents = allEvents.concat(service.handleChunk(chunk));
      });

      expect(allEvents.some(e => e.type === 'content_block_start')).toBe(true);
      expect(allEvents.some(e => e.type === 'content_block_delta')).toBe(true);
      expect(allEvents.some(e => e.type === 'content_block_stop')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('error threshold tracking', () => {
      // Send multiple invalid chunks quickly
      for (let i = 0; i < 4; i++) {
        const events = service.handleChunk('INVALID-JSON');
        if (i < 3) {
          expect(events[0].code).toBe('PARSE_ERROR');
        } else {
          expect(events[0].code).toBe('PARSE_ERROR_THRESHOLD');
        }
      }
    });

    test('error threshold resets after window', async () => {
      // Mock Date.now to control time
      const realDateNow = Date.now;
      let currentTime = 0;
      Date.now = jest.fn(() => currentTime);

      // Generate 3 errors
      for (let i = 0; i < 3; i++) {
        service.handleChunk('INVALID-JSON');
      }

      // Advance time beyond error window
      currentTime = 6000; // 6 seconds
      const events = service.handleChunk('INVALID-JSON');
      
      // Should be treated as a new error, not threshold exceeded
      expect(events[0].code).toBe('PARSE_ERROR');

      // Restore Date.now
      Date.now = realDateNow;
    });

    test('handles malformed content blocks', () => {
      const malformedChunks = [
        JSON.stringify({ type: 'content_block_delta' }), // Missing delta
        JSON.stringify({ type: 'content_block_delta', delta: {} }), // Empty delta
        JSON.stringify({ type: 'content_block_delta', delta: { text: null } }) // Null text
      ];

      malformedChunks.forEach(chunk => {
        const events = service.handleChunk(chunk);
        expect(events.length).toBe(0); // Should handle gracefully
      });
    });
  });

  describe('Timeout Mechanism', () => {
    test('timeout mechanism', async () => {
      const timeoutPromise = service.startTimeout();
      await expect(timeoutPromise).rejects.toThrow(/timed out/);
    }, 31000); // Set timeout to just over the 30 second timeout in the service

    test('clears timeout on finalize', async () => {
      const timeoutPromise = service.startTimeout();
      service.finalize();
      
      // Should not reject after finalize
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      await delay(100);
      
      expect(service.timeoutId).toBeNull();
    });
  });

  describe('Statistics and Cleanup', () => {
    test('maintains accurate statistics', () => {
      const validChunk = JSON.stringify({
        type: 'content_block_delta',
        delta: { text: 'some code' }
      });

      service.handleChunk(validChunk);
      service.handleChunk('invalid chunk');

      const stats = service.getStats();
      expect(stats).toEqual(expect.objectContaining({
        totalChunks: 2,
        parseErrors: 1,
        lastChunkTime: expect.any(Number)
      }));
    });

    test('finalize cleans up state', () => {
      // Add some test data
      service.handleChunk(JSON.stringify({
        type: 'content_block_delta',
        delta: {
          text: '/// START FooterSection\nSome code\n/// END FooterSection'
        }
      }));

      service.finalize();
      expect(service.state.componentBuffer.getAllComponents().length).toBe(0);
      expect(service.parseErrors.length).toBe(0);
      expect(service.stats.totalChunks).toBe(0);
    });

    test('tracks component completion', () => {
      const chunks = [
        JSON.stringify({
          type: 'content_block_delta',
          delta: { text: '/// START TestComponent position=main\n' }
        }),
        JSON.stringify({
          type: 'content_block_delta',
          delta: { text: 'code\n' }
        }),
        JSON.stringify({
          type: 'content_block_delta',
          delta: { text: '/// END TestComponent' }
        })
      ];

      // Set up spy before processing chunks
      const spy = jest.spyOn(console, 'log');
      
      chunks.forEach(chunk => service.handleChunk(chunk));
      service.finalize();

      // Check the completion log
      expect(spy).toHaveBeenCalledWith(
        '✅ Generation completed:',
        expect.objectContaining({
          duration: expect.any(String),
          stats: expect.any(Object),
          components: expect.arrayContaining([
            expect.objectContaining({
              name: 'TestComponent',
              position: 'main',
              isComplete: true
            })
          ])
        })
      );
      spy.mockRestore();
    });
  });
}); 