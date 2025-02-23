const ComponentBuffer = require('../../utils/componentBuffer');

describe('ComponentBuffer', () => {
  let buffer;
  
  beforeEach(() => {
    buffer = new ComponentBuffer();
  });

  describe('Basic Component Operations', () => {
    test('startComponent and getComponent', () => {
      buffer.startComponent('comp_hero', 'HeroSection', 'header');
      const comp = buffer.getComponent('comp_hero');
      expect(comp).toBeDefined();
      expect(comp.name).toBe('HeroSection');
      expect(comp.position).toBe('header');
      expect(comp.isComplete).toBe(false);
    });

    test('appendToComponent adds code', () => {
      buffer.startComponent('comp_hero', 'HeroSection', 'header');
      buffer.appendToComponent('comp_hero', 'export function HeroSection() {}');
      const comp = buffer.getComponent('comp_hero');
      expect(comp.code).toContain('export function HeroSection() {}');
    });

    test('completeComponent sets isComplete = true', () => {
      buffer.startComponent('comp_footer', 'FooterSection', 'footer');
      buffer.completeComponent('comp_footer');
      const comp = buffer.getComponent('comp_footer');
      expect(comp.isComplete).toBe(true);
    });

    test('clear removes all components', () => {
      buffer.startComponent('comp1', 'CompOne', 'main');
      buffer.startComponent('comp2', 'CompTwo', 'main');
      expect(buffer.getAllComponents().length).toBe(2);
      buffer.clear();
      expect(buffer.getAllComponents().length).toBe(0);
    });
  });

  describe('Validation and Hooks', () => {
    test('validation hooks are called', () => {
      const mockHook = jest.fn().mockReturnValue(true);
      buffer.addValidationHook(mockHook);
      
      buffer.startComponent('comp_test', 'TestComponent', 'main');
      buffer.appendToComponent('comp_test', 'some code');
      
      expect(mockHook).toHaveBeenCalledWith('comp_test', 'some code');
    });

    test('failed validation hook prevents append', () => {
      const mockHook = jest.fn().mockReturnValue(false);
      buffer.addValidationHook(mockHook);
      
      buffer.startComponent('comp_test', 'TestComponent', 'main');
      const result = buffer.appendToComponent('comp_test', 'some code');
      
      expect(result).toBe(false);
      expect(buffer.getComponent('comp_test').code).toBe('');
    });

    test('validation hook errors are tracked', () => {
      const errorHook = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });
      buffer.addValidationHook(errorHook);
      
      buffer.startComponent('comp_test', 'TestComponent', 'main');
      buffer.appendToComponent('comp_test', 'some code');
      
      const comp = buffer.getComponent('comp_test');
      expect(comp.metadata.validationErrors.length).toBeGreaterThan(0);
      expect(comp.metadata.validationErrors[0]).toMatch(/Validation error/);
    });
  });

  describe('Size Management', () => {
    test('size limits are enforced', () => {
      buffer.startComponent('comp_test', 'TestComponent', 'main');
      
      // Create a string larger than MAX_COMPONENT_SIZE (1MB)
      const largeString = 'x'.repeat(2 * 1024 * 1024);
      buffer.appendToComponent('comp_test', largeString);
      
      const comp = buffer.getComponent('comp_test');
      expect(comp.metadata.size).toBeLessThanOrEqual(1024 * 1024);
      expect(buffer.stats.trimCount).toBe(1);
    });

    test('trims content at newlines when possible', () => {
      buffer.startComponent('comp_test', 'TestComponent', 'main');
      
      // Create a string with newlines that exceeds size limit
      const content = Array(1024 * 1024).fill('line\n').join('');
      buffer.appendToComponent('comp_test', content);
      
      const comp = buffer.getComponent('comp_test');
      expect(comp.code.endsWith('\n')).toBe(true);
    });

    test('handles component limit cleanup', () => {
      // Add more than MAX_COMPONENTS components
      for (let i = 0; i < 120; i++) {
        buffer.startComponent(`comp_${i}`, `Component${i}`, 'main');
        buffer.completeComponent(`comp_${i}`);
      }
      
      // Should have cleaned up old components
      expect(buffer.getAllComponents().length).toBeLessThanOrEqual(100);
    });
  });

  describe('Metadata and Statistics', () => {
    test('tracks component metadata', () => {
      buffer.startComponent('comp_test', 'TestComponent', 'main');
      buffer.appendToComponent('comp_test', 'some code');
      
      const comp = buffer.getComponent('comp_test');
      expect(comp.metadata).toEqual(expect.objectContaining({
        size: expect.any(Number),
        lastModified: expect.any(Number),
        validationErrors: expect.any(Array)
      }));
    });

    test('maintains accurate buffer statistics', () => {
      buffer.startComponent('comp1', 'CompOne', 'main');
      buffer.appendToComponent('comp1', 'code1');
      buffer.startComponent('comp2', 'CompTwo', 'main');
      buffer.appendToComponent('comp2', 'code2');
      
      const stats = buffer.getStats();
      expect(stats).toEqual(expect.objectContaining({
        totalSize: expect.any(Number),
        componentCount: 2,
        trimCount: expect.any(Number),
        averageComponentSize: expect.any(Number)
      }));
    });
  });
}); 