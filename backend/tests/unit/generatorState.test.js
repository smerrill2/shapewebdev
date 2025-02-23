const GeneratorState = require('../../utils/generatorState');
const { COMPOUND_COMPONENTS, CRITICAL_COMPONENTS } = require('../../utils/constants');

describe('GeneratorState', () => {
  let state;
  
  beforeEach(() => {
    state = new GeneratorState();
  });

  describe('Basic Chunk Processing', () => {
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

    test('handles multiple components in single chunk', () => {
      const chunk = [
        '/// START HeaderNav position=header',
        'const HeaderNav = () => <nav>Nav</nav>;',
        '/// END HeaderNav',
        '/// START MainContent position=main',
        'const MainContent = () => <main>Content</main>;',
        '/// END MainContent'
      ].join('\n');

      const events = state.processChunk(chunk);
      const components = events.filter(e => e.type === 'content_block_start');
      expect(components.length).toBe(2);
      expect(components[0].metadata.componentName).toBe('HeaderNav');
      expect(components[1].metadata.componentName).toBe('MainContent');
    });

    test('handles nested markers correctly', () => {
      const chunk = [
        '/// START OuterComponent',
        'const OuterComponent = () => {',
        '/// START InnerComponent', // This should be treated as code, not a marker
        '  return <div>Content</div>;',
        '/// END InnerComponent',   // This should be treated as code, not a marker
        '};',
        '/// END OuterComponent'
      ].join('\n');

      const events = state.processChunk(chunk);
      const starts = events.filter(e => e.type === 'content_block_start');
      expect(starts.length).toBe(1);
      expect(starts[0].metadata.componentName).toBe('OuterComponent');
    });

    test('properly tracks nesting level', () => {
      const chunk = [
        '/// START OuterComponent',
        'const OuterComponent = () => {',  // +1 nesting
        '  if (true) {',                   // +1 nesting
        '    /// START InnerComponent',     // Should be ignored (nesting = 2)
        '    return <div>{',               // +1 nesting
        '      /// END InnerComponent',     // Should be ignored (nesting = 3)
        '    }</div>;',                    // -1 nesting
        '  }',                             // -1 nesting
        '};',                              // -1 nesting
        '/// END OuterComponent'           // Should be valid (nesting = 0)
      ].join('\n');

      const state = new GeneratorState();
      const events = state.processChunk(chunk);

      // Check nesting level tracking
      expect(state.nestingLevel).toBe(0);  // Should end at 0

      // Verify only outer markers were processed
      const starts = events.filter(e => e.type === 'content_block_start');
      const ends = events.filter(e => e.type === 'content_block_stop');
      expect(starts.length).toBe(1);
      expect(ends.length).toBe(1);
      expect(starts[0].metadata.componentName).toBe('OuterComponent');
      expect(ends[0].metadata.componentName).toBe('OuterComponent');

      // Verify the content includes the ignored markers
      const component = state.componentBuffer.getComponent('comp_outercomponent');
      expect(component.code).toContain('/// START InnerComponent');
      expect(component.code).toContain('/// END InnerComponent');
    });

    test('handles complex nesting scenarios', () => {
      const state = new GeneratorState();
      
      // Test incremental chunks with nested braces
      const chunks = [
        '/// START OuterComponent\nconst x = {',  // nesting: 1
        'a: { b: {',                              // nesting: 3
        '/// START IgnoredComponent\n}',          // nesting: 2
        '/// END IgnoredComponent\n},',           // nesting: 1
        '/// START StillIgnored\n};',             // nesting: 0
        '/// END StillIgnored',                   // nesting: 0
        '/// END OuterComponent'                  // nesting: 0
      ];

      let allEvents = [];
      chunks.forEach(chunk => {
        const events = state.processChunk(chunk);
        allEvents = allEvents.concat(events);
      });

      // Verify nesting level is tracked correctly across chunks
      expect(state.nestingLevel).toBe(0);

      // Only the outer markers should be processed
      const starts = allEvents.filter(e => e.type === 'content_block_start');
      const ends = allEvents.filter(e => e.type === 'content_block_stop');
      expect(starts.length).toBe(1);
      expect(ends.length).toBe(1);
      expect(starts[0].metadata.componentName).toBe('OuterComponent');
      expect(ends[0].metadata.componentName).toBe('OuterComponent');

      // The ignored markers should be in the content
      const component = state.componentBuffer.getComponent('comp_outercomponent');
      expect(component.code).toContain('/// START IgnoredComponent');
      expect(component.code).toContain('/// END IgnoredComponent');
      expect(component.code).toContain('/// START StillIgnored');
      expect(component.code).toContain('/// END StillIgnored');
    });
  });

  describe('Compound Component Validation', () => {
    test('validates NavigationMenu subcomponents', () => {
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

    test('detects missing compound subcomponents', () => {
      const chunk = [
        '/// START NavigationMenu position=header',
        'export function NavigationMenu() {',
        '  return (',
        '    <div>',
        '      <NavigationMenuList>List Content</NavigationMenuList>',
        '      <NavigationMenuItem>Item Content</NavigationMenuItem>',
        '      {/* Missing other required subcomponents */}',
        '    </div>',
        '  );',
        '}',
        '/// END NavigationMenu'
      ].join('\n');

      const events = state.processChunk(chunk);
      const stopEvent = events.find(e => e.type === 'content_block_stop');
      expect(stopEvent.metadata.isCompoundComplete).toBe(false);
    });
  });

  describe('Critical Component Handling', () => {
    test('flags critical components', () => {
      const chunk = '/// START Header position=header\ncode\n/// END Header';
      const events = state.processChunk(chunk);
      
      const startEvent = events.find(e => e.type === 'content_block_start');
      const stopEvent = events.find(e => e.type === 'content_block_stop');
      
      expect(startEvent.metadata.isCritical).toBe(true);
      expect(stopEvent.metadata.isCritical).toBe(true);
    });

    test('handles non-critical components', () => {
      const chunk = '/// START CustomComponent position=main\ncode\n/// END CustomComponent';
      const events = state.processChunk(chunk);
      
      const startEvent = events.find(e => e.type === 'content_block_start');
      expect(startEvent.metadata.isCritical).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles partial line buffering', () => {
      // Send marker in two chunks
      const chunk1 = '/// STA';
      const chunk2 = 'RT TestComponent\nsome code\n/// END TestComponent';
      
      const events1 = state.processChunk(chunk1);
      expect(events1.length).toBe(0); // Should buffer the partial line
      
      const events2 = state.processChunk(chunk2);
      expect(events2.length).toBeGreaterThan(0);
      expect(events2[0].type).toBe('content_block_start');
    });

    test('handles malformed markers gracefully', () => {
      const malformedChunks = [
        '/// START\ncode',
        '/// END\ncode',
        '///START Component\ncode',
        '/// START Component position=invalid\ncode'
      ];

      malformedChunks.forEach(chunk => {
        state = new GeneratorState(); // Reset state
        const events = state.processChunk(chunk);
        // Should not throw, should handle gracefully
        expect(events).toBeDefined();
      });
    });

    test('maintains state between chunks', () => {
      const chunk1 = '/// START TestComponent\n';
      const chunk2 = 'const Test = () => <div>Test</div>;\n';
      const chunk3 = '/// END TestComponent';

      const events1 = state.processChunk(chunk1);
      const events2 = state.processChunk(chunk2);
      const events3 = state.processChunk(chunk3);

      expect(events1[0].type).toBe('content_block_start');
      expect(events2[0].type).toBe('content_block_delta');
      expect(events3[0].type).toBe('content_block_stop');
    });
  });
}); 