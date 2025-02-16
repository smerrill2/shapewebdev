import { jest } from '@jest/globals';
import { StreamRegistry } from '../streamRegistry';
import { StreamingStates } from '../streamingStates';
import { 
  processComponentStart, 
  processComponentStop,
  processComponentContent,
  processComponentFinished
} from '../streamPipeline';

describe('Streaming Pipeline Tests', () => {
  let registry;
  let streamingStates;
  let consoleSpy;

  beforeEach(() => {
    registry = new StreamRegistry();
    streamingStates = new StreamingStates();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Component Start Event Tests', () => {
    test('Start Event with Valid Metadata', () => {
      // Arrange
      const event = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_header',
          componentName: 'Header',
          position: 'header'
        }
      };

      // Act
      processComponentStart(event, registry, streamingStates);

      // Assert
      expect(registry.components.has('comp_header')).toBe(true);
      const component = registry.components.get('comp_header');
      expect(component.name).toBe('Header');
      expect(component.position).toBe('header');
      
      const streamingState = streamingStates.get('comp_header');
      expect(streamingState.isStreaming).toBe(true);
      expect(streamingState.isComplete).toBe(false);
    });

    test('Start Event Missing Metadata', () => {
      // Arrange
      const event = { type: 'content_block_start', index: 0 };

      // Act
      processComponentStart(event, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Invalid component_start event:',
        event
      );
      expect(registry.components.size).toBe(0);
      expect(streamingStates.size).toBe(0);
    });

    test('Start Event with Missing ComponentName', () => {
      // Arrange
      const event = {
        type: 'content_block_start',
        metadata: { componentId: 'comp_header', position: 'header' }
      };

      // Act
      processComponentStart(event, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Invalid component_start event:',
        event
      );
      expect(registry.components.size).toBe(0);
      expect(streamingStates.size).toBe(0);
    });
  });

  describe('Component Stop Event Tests', () => {
    test('Stop Event with Valid Metadata', () => {
      // Arrange
      const startEvent = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_hero',
          componentName: 'HeroSection',
          position: 'main'
        }
      };
      processComponentStart(startEvent, registry, streamingStates);

      const stopEvent = {
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_hero',
          componentName: 'HeroSection',
          position: 'main',
          sections: {
            header: [],
            main: ['comp_hero'],
            footer: []
          }
        }
      };

      // Act
      processComponentStop(stopEvent, registry, streamingStates);

      // Assert
      const streamingState = streamingStates.get('comp_hero');
      expect(streamingState.isStreaming).toBe(false);
      expect(streamingState.isComplete).toBe(true);
      expect(registry.layout.sections.main).toContain('comp_hero');
    });

    test('Stop Event Missing ComponentId', () => {
      // Arrange
      const event = { type: 'content_block_stop', metadata: {} };

      // Act
      processComponentStop(event, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Invalid component_stop event:',
        event
      );
      expect(registry.components.size).toBe(0);
      expect(streamingStates.size).toBe(0);
    });

    test('Stop Event for Non-Existent Component', () => {
      // Arrange
      const event = {
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_nonexistent',
          componentName: 'NonExistent',
          position: 'main'
        }
      };

      // Act
      processComponentStop(event, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Attempting to stop non-existent component:',
        'comp_nonexistent'
      );
      expect(registry.components.size).toBe(0);
      expect(streamingStates.size).toBe(0);
    });
  });

  describe('Component Content Event Tests', () => {
    test('Content Event with Valid Data', () => {
      // Arrange
      const startEvent = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main'
        }
      };
      processComponentStart(startEvent, registry, streamingStates);

      const contentEvent = {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_button'
        },
        delta: {
          text: 'export function Button() { return <button>Click me</button>; }'
        }
      };

      // Act
      processComponentContent(contentEvent, registry, streamingStates);

      // Assert
      const component = registry.getComponent('comp_button');
      expect(component.code).toBe(contentEvent.delta.text);
      
      const streamingState = streamingStates.get('comp_button');
      expect(streamingState.lastUpdate).toBe(Date.now());
    });

    test('Content Event for Non-Existent Component', () => {
      // Arrange
      const contentEvent = {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_nonexistent'
        },
        delta: {
          text: 'Some code'
        }
      };

      // Act
      processComponentContent(contentEvent, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Content received for non-existent component:',
        'comp_nonexistent'
      );
    });

    test('Content Event Missing Delta Text', () => {
      // Arrange
      const startEvent = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_button',
          componentName: 'Button',
          position: 'main'
        }
      };
      processComponentStart(startEvent, registry, streamingStates);

      const contentEvent = {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_button'
        }
      };

      // Act
      processComponentContent(contentEvent, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Invalid component_content event:',
        contentEvent
      );
    });
  });

  describe('Component Finished Event Tests', () => {
    test('Finished Event with Valid Data', () => {
      // Arrange
      const startEvent = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main'
        }
      };
      processComponentStart(startEvent, registry, streamingStates);

      const finishedEvent = {
        type: 'component_finished',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card'
        },
        code: 'export function Card() { return <div>Final card component</div>; }'
      };

      // Act
      processComponentFinished(finishedEvent, registry, streamingStates);

      // Assert
      const component = registry.getComponent('comp_card');
      expect(component.code).toBe(finishedEvent.code);
      expect(component.isComplete).toBe(true);

      const streamingState = streamingStates.get('comp_card');
      expect(streamingState.isStreaming).toBe(false);
      expect(streamingState.isComplete).toBe(true);
      expect(streamingState.duration).toBe(0); // Because we mocked Date.now()
    });

    test('Finished Event for Non-Existent Component', () => {
      // Arrange
      const finishedEvent = {
        type: 'component_finished',
        metadata: {
          componentId: 'comp_nonexistent',
          componentName: 'NonExistent'
        },
        code: 'Some code'
      };

      // Act
      processComponentFinished(finishedEvent, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Finished event for non-existent component:',
        'comp_nonexistent'
      );
    });

    test('Finished Event Missing Code', () => {
      // Arrange
      const startEvent = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card',
          position: 'main'
        }
      };
      processComponentStart(startEvent, registry, streamingStates);

      const finishedEvent = {
        type: 'component_finished',
        metadata: {
          componentId: 'comp_card',
          componentName: 'Card'
        }
      };

      // Act
      processComponentFinished(finishedEvent, registry, streamingStates);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Invalid component_finished event:',
        finishedEvent
      );
    });
  });

  describe('End-to-End Component Lifecycle', () => {
    test('Complete Component Lifecycle', () => {
      // Start Component
      const startEvent = {
        type: 'content_block_start',
        metadata: {
          componentId: 'comp_form',
          componentName: 'Form',
          position: 'main'
        }
      };
      processComponentStart(startEvent, registry, streamingStates);

      // Add Content
      const contentEvent = {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_form'
        },
        delta: {
          text: 'export function Form() { return <form>Initial form</form>; }'
        }
      };
      processComponentContent(contentEvent, registry, streamingStates);

      // More Content
      const contentEvent2 = {
        type: 'content_block_delta',
        metadata: {
          componentId: 'comp_form'
        },
        delta: {
          text: '\n  // Add submit handler\n'
        }
      };
      processComponentContent(contentEvent2, registry, streamingStates);

      // Finish Component
      const finishedEvent = {
        type: 'component_finished',
        metadata: {
          componentId: 'comp_form',
          componentName: 'Form'
        },
        code: 'export function Form() { return <form onSubmit={handleSubmit}>Complete form</form>; }'
      };
      processComponentFinished(finishedEvent, registry, streamingStates);

      // Stop Component
      const stopEvent = {
        type: 'content_block_stop',
        metadata: {
          componentId: 'comp_form',
          componentName: 'Form',
          position: 'main',
          sections: {
            header: [],
            main: ['comp_form'],
            footer: []
          }
        }
      };
      processComponentStop(stopEvent, registry, streamingStates);

      // Assert Final State
      const component = registry.getComponent('comp_form');
      expect(component.isComplete).toBe(true);
      expect(component.code).toBe(finishedEvent.code);

      const streamingState = streamingStates.get('comp_form');
      expect(streamingState.isStreaming).toBe(false);
      expect(streamingState.isComplete).toBe(true);
      expect(registry.layout.sections.main).toContain('comp_form');
    });
  });
}); 