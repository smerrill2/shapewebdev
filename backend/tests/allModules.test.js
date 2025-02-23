/**
 * @file allModules.test.js
 * A single Jest test file to cover:
 * 1. MarkerValidator
 * 2. ComponentBuffer
 * 3. GeneratorState
 * 4. GeneratePageService
 */

const MarkerValidator = require('../utils/markerValidator');
const ComponentBuffer = require('../utils/componentBuffer');
const GeneratorState = require('../utils/generatorState');
const GeneratePageService = require('../services/generatePageService');

// For testing compound logic:
const { COMPOUND_COMPONENTS, CRITICAL_COMPONENTS } = require('../utils/constants');

/**
 * MARKER VALIDATOR TESTS
 */
describe('MarkerValidator', () => {
  test('valid START marker', () => {
    const markerStr = '/// START HeroSection position=header';
    const result = MarkerValidator.validateMarker(markerStr);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe('START');
    expect(result.name).toBe('HeroSection');
    expect(result.position).toBe('header');
  });

  test('valid END marker with matching name', () => {
    const markerStr = '/// END HeroSection';
    const result = MarkerValidator.validateMarker(markerStr, 'HeroSection');
    expect(result.isValid).toBe(true);
    expect(result.type).toBe('END');
    expect(result.name).toBe('HeroSection');
  });

  test('invalid marker format', () => {
    const markerStr = '/// STARTHeroSection';
    const result = MarkerValidator.validateMarker(markerStr);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/does not match required pattern/i);
  });

  test('END marker mismatch', () => {
    const markerStr = '/// END FooterSection';
    const result = MarkerValidator.validateMarker(markerStr, 'HeaderSection');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/END marker mismatch/i);
  });

  test('whitespace normalization', () => {
    const markerWithWeirdSpaces = '///    START    HeroSection    position=header   ';
    const result = MarkerValidator.validateMarker(markerWithWeirdSpaces);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe('START');
    expect(result.name).toBe('HeroSection');
    expect(result.position).toBe('header');
  });

  test('invalid position value', () => {
    const markerStr = '/// START HeroSection position=invalid';
    const result = MarkerValidator.validateMarker(markerStr);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/Invalid position/);
  });

  test('component name normalization', () => {
    const name = 'HHeroSection';
    const normalized = MarkerValidator.normalizeComponentName(name);
    expect(normalized).toBe('HeroSection');
  });
});

/**
 * COMPONENT BUFFER TESTS
 */
describe('ComponentBuffer', () => {
  let buffer;
  beforeEach(() => {
    buffer = new ComponentBuffer();
  });

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

  test('validation hooks are called', () => {
    const mockHook = jest.fn().mockReturnValue(true);
    buffer.addValidationHook(mockHook);
    
    buffer.startComponent('comp_test', 'TestComponent', 'main');
    buffer.appendToComponent('comp_test', 'some code');
    
    expect(mockHook).toHaveBeenCalledWith('comp_test', 'some code');
  });

  test('size limits are enforced', () => {
    buffer.startComponent('comp_test', 'TestComponent', 'main');
    
    // Create a string larger than MAX_COMPONENT_SIZE
    const largeString = 'x'.repeat(2 * 1024 * 1024); // 2MB
    buffer.appendToComponent('comp_test', largeString);
    
    const comp = buffer.getComponent('comp_test');
    expect(comp.metadata.size).toBeLessThanOrEqual(1024 * 1024); // 1MB limit
    expect(buffer.stats.trimCount).toBe(1);
  });
});

/**
 * GENERATOR STATE TESTS
 */
describe('GeneratorState', () => {
  let state;
  beforeEach(() => {
    state = new GeneratorState();
  });

  test('processChunk with START & END markers', () => {
    const chunk = [
      '/// START HeroSection position=header',
      'export function HeroSection() {',
      '  return <div>Hello</div>;',
      '}',
      '/// END HeroSection'
    ].join('\n');

    const events = state.processChunk(chunk);

    const startEvent = events.find(e => e.type === 'content_block_start');
    const stopEvent = events.find(e => e.type === 'content_block_stop');
    const deltas = events.filter(e => e.type === 'content_block_delta');

    expect(startEvent).toBeDefined();
    expect(startEvent.metadata.componentName).toBe('HeroSection');
    expect(startEvent.metadata.position).toBe('header');

    expect(deltas.length).toBeGreaterThan(0);
    expect(stopEvent).toBeDefined();
    expect(stopEvent.metadata.componentName).toBe('HeroSection');
    expect(stopEvent.metadata.isComplete).toBe(true);
  });

  test('compound component validation', () => {
    const chunk = [
      '/// START NavigationMenu position=header',
      'export function NavigationMenu() {',
      '  return (',
      '    <div>',
      '      <NavigationMenuList>List Content</NavigationMenuList>',
      '      <NavigationMenuItem>Item Content</NavigationMenuItem>',
      '      <NavigationMenuLink>Link Content</NavigationMenuLink>',
      '      <NavigationMenuContent>Content</NavigationMenuContent>',
      '      <NavigationMenuTrigger>Trigger</NavigationMenuTrigger>',
      '      <NavigationMenuViewport>Viewport</NavigationMenuViewport>',
      '    </div>',
      '  );',
      '}',
      '/// END NavigationMenu'
    ].join('\n');

    const events = state.processChunk(chunk);
    const stopEvent = events.find(e => e.type === 'content_block_stop');
    expect(stopEvent.metadata.isCompoundComplete).toBe(true);
  });

  test('critical component flag is set', () => {
    const chunk = '/// START Header position=header\ncode\n/// END Header';
    const events = state.processChunk(chunk);
    
    const startEvent = events.find(e => e.type === 'content_block_start');
    const stopEvent = events.find(e => e.type === 'content_block_stop');
    
    expect(startEvent.metadata.isCritical).toBe(true);
    expect(stopEvent.metadata.isCritical).toBe(true);
  });
});

/**
 * GENERATE PAGE SERVICE TESTS
 */
describe('GeneratePageService', () => {
  let service;
  beforeEach(() => {
    service = new GeneratePageService();
  });

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

  test('timeout mechanism', async () => {
    const timeoutPromise = service.startTimeout();
    await expect(timeoutPromise).rejects.toThrow(/timed out/);
  }, 31000); // Set timeout to just over the 30 second timeout in the service

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
}); 