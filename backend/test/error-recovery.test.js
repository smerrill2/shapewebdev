const mongoose = require('mongoose');
const { connectDB, fallbackCache } = require('../database');
const { setupSSE, sendSSEMessage, resumeSession, activeSessions } = require('../utils/sseHelpers');

describe('Error Recovery System', () => {
  describe('Database Fallback', () => {
    let originalConnect;

    beforeEach(() => {
      originalConnect = mongoose.connect;
      fallbackCache.clear();
    });

    afterEach(() => {
      mongoose.connect = originalConnect;
    });

    it('should fall back to in-memory cache when MongoDB is down', async () => {
      // Mock MongoDB connection failure
      mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const connected = await connectDB(1, 100); // Quick retry for testing
      expect(connected).toBe(false);

      // Should still be able to use fallback cache
      await fallbackCache.set('test', 'value');
      const value = await fallbackCache.get('test');
      expect(value).toBe('value');
    });

    it('should retry connection before falling back', async () => {
      const mockConnect = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(true);
      
      mongoose.connect = mockConnect;

      const connected = await connectDB(2, 100);
      expect(connected).toBe(true);
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('SSE Session Recovery', () => {
    let req, res;

    beforeEach(() => {
      req = {
        query: {},
        headers: {},
        on: jest.fn()
      };
      res = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        writeable: true
      };
    });

    it('should maintain session state', async () => {
      const sessionId = setupSSE(req, res);
      expect(activeSessions.has(sessionId)).toBe(true);
      
      const session = activeSessions.get(sessionId);
      expect(session.lastEventId).toBe('0');
      expect(session.components).toEqual([]);
    });

    it('should cache components during streaming', async () => {
      const sessionId = setupSSE(req, res);
      
      const mockComponent = {
        type: 'content_block_delta',
        delta: {
          code: 'const Test = () => <div>Test</div>;',
          name: 'Test'
        }
      };

      await sendSSEMessage(res, mockComponent, '1');
      
      const cached = await fallbackCache.get('component_1');
      expect(cached).toBeDefined();
      expect(JSON.parse(cached)).toMatchObject(mockComponent);
    });

    it('should resume session from last event', async () => {
      // Store some test components
      await fallbackCache.set('component_1', JSON.stringify({ id: 1, data: 'test1' }));
      await fallbackCache.set('component_2', JSON.stringify({ id: 2, data: 'test2' }));

      const components = await resumeSession('test-session', '1');
      expect(components).toHaveLength(1);
      expect(components[0]).toMatchObject({ id: 2, data: 'test2' });
    });

    it('should handle client disconnection', () => {
      const sessionId = setupSSE(req, res);
      expect(activeSessions.has(sessionId)).toBe(true);

      // Simulate client disconnect
      const disconnectHandler = req.on.mock.calls.find(call => call[0] === 'close')[1];
      disconnectHandler();

      expect(activeSessions.has(sessionId)).toBe(false);
    });

    it('should handle write failures gracefully', async () => {
      const sessionId = setupSSE(req, res);
      res.write.mockImplementation(() => { throw new Error('Write failed'); });

      const result = await sendSSEMessage(res, { type: 'test' }, '1');
      expect(result).toBe(false);
    });
  });

  describe('End-to-End Recovery', () => {
    it('should recover from both DB and SSE failures', async () => {
      // 1. Start with DB down
      mongoose.connect = jest.fn().mockRejectedValue(new Error('DB Down'));
      const connected = await connectDB(1, 100);
      expect(connected).toBe(false);

      // 2. Set up SSE
      const req = {
        query: {},
        headers: { 'last-event-id': '2' },
        on: jest.fn()
      };
      const res = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        writeable: true
      };

      // 3. Store some components in fallback cache
      await fallbackCache.set('component_1', JSON.stringify({ id: 1, data: 'test1' }));
      await fallbackCache.set('component_2', JSON.stringify({ id: 2, data: 'test2' }));
      await fallbackCache.set('component_3', JSON.stringify({ id: 3, data: 'test3' }));

      // 4. Set up new session and resume
      const sessionId = setupSSE(req, res);
      const components = await resumeSession(sessionId, '2');

      // 5. Verify recovery
      expect(components).toHaveLength(1);
      expect(components[0]).toMatchObject({ id: 3, data: 'test3' });
    });
  });
}); 