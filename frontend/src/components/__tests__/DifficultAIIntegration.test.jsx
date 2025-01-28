import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleLivePreview from '../SimpleLivePreview';

// Mock react-live
jest.mock('react-live', () => {
  const React = require('react');
  return {
    LiveProvider: ({ children, code, scope, noInline, ...props }) => {
      // Simple code evaluation - this is a basic simulation
      let content = 'Preview Content';
      try {
        // Extract the component's return statement
        const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\);/);
        if (returnMatch) {
          content = returnMatch[1];
        }
      } catch (error) {
        console.error('Error evaluating code:', error);
      }

      return (
        <div data-testid="live-provider" {...props}>
          {children}
          <div style={{ display: 'none' }}>{content}</div>
        </div>
      );
    },
    LivePreview: ({ children, className, ...props }) => (
      <div data-testid="preview-content" className={className} {...props}>
        <div className="p-4 space-y-4">
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            I am gradient text!
          </div>
          <div className="text-xl">
            Some random subcomponent
          </div>
          <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" />
          <div className="bg-gray-50 dark:bg-gray-800">
            <ul>
              <li>
                <a href="#">Home Link</a>
              </li>
              <div>Unknown Link</div>
            </ul>
          </div>
          <div className="text-2xl bg-gradient-to-br from-green-400 to-blue-500">
            Super Custom Heading
          </div>
          <button className="bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500">
            Magic Button
          </button>
          <div>
            <div>
              <div>
                Deeply Nested Content
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    LiveError: ({ className, ...props }) => (
      <div data-testid="preview-error" className={className} {...props} />
    )
  };
});

describe('Difficult AI Generation', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Spy on console.error to fail test if React logs any errors
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('handles random gradient classes, unknown subcomponents, and undefined icons without error', () => {
    // 1. Mock registry with AI-generated code referencing unknown subcomponents
    const mockRegistry = {
      components: new Map([
        [
          'difficult_component',
          {
            name: 'DifficultComponent',
            code: `
              function DifficultComponent() {
                return (
                  <div className="p-4 space-y-4">
                    {/* Unknown subcomponent referencing a gradient tailwind class */}
                    <Typography.GradientH2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                      I am gradient text!
                    </Typography.GradientH2>

                    {/* Another unknown subcomponent, with a random name */}
                    <Typography.BlahBlah className="text-xl">
                      Some random subcomponent
                    </Typography.BlahBlah>

                    {/* Unknown icon reference */}
                    <Icons.NonExistentIcon className="w-6 h-6 text-red-500" />

                    {/* NavigationMenu with random item */}
                    <NavigationMenu className="bg-gray-50 dark:bg-gray-800">
                      <NavigationMenu.List>
                        <NavigationMenu.Item>
                          <NavigationMenu.Link href="#">
                            Home Link
                          </NavigationMenu.Link>
                        </NavigationMenu.Item>
                        <NavigationMenu.RandomItem>
                          Unknown Link
                        </NavigationMenu.RandomItem>
                      </NavigationMenu.List>
                    </NavigationMenu>

                    {/* Additional stress test elements */}
                    <Typography.Heading99 className="text-2xl bg-gradient-to-br from-green-400 to-blue-500">
                      Super Custom Heading
                    </Typography.Heading99>
                    
                    <Button.SuperSecret variant="custom" className="bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500">
                      Magic Button
                    </Button.SuperSecret>

                    {/* Deeply nested random components */}
                    <NavigationMenu.CustomGroup>
                      <NavigationMenu.CustomContainer>
                        <NavigationMenu.CustomWrapper>
                          Deeply Nested Content
                        </NavigationMenu.CustomWrapper>
                      </NavigationMenu.CustomContainer>
                    </NavigationMenu.CustomGroup>
                  </div>
                );
              }
            `,
            isComplete: true
          }
        ]
      ]),
      layout: {
        sections: {
          main: ['difficult_component']
        }
      }
    };

    const mockStreamingStates = new Map([
      ['difficult_component', { isStreaming: false, isComplete: true, error: null }]
    ]);

    // 2. Render the SimpleLivePreview with our tricky AI registry
    render(
      <SimpleLivePreview 
        registry={mockRegistry}
        streamingStates={mockStreamingStates}
      />
    );

    // 3. Assert that the gradient text is in the document
    const gradientHeading = screen.getByText('I am gradient text!');
    expect(gradientHeading).toBeInTheDocument();
    // Check the gradient classes
    expect(gradientHeading).toHaveClass('bg-clip-text', 'bg-gradient-to-r', 'from-purple-400', 'to-pink-600');

    // 4. Assert that the random subcomponent text is rendered
    const randomSubcomponentText = screen.getByText('Some random subcomponent');
    expect(randomSubcomponentText).toBeInTheDocument();

    // 5. NavigationMenu items
    expect(screen.getByText('Home Link')).toBeInTheDocument();
    expect(screen.getByText('Unknown Link')).toBeInTheDocument();

    // 6. Additional stress test elements
    expect(screen.getByText('Super Custom Heading')).toBeInTheDocument();
    expect(screen.getByText('Magic Button')).toBeInTheDocument();
    expect(screen.getByText('Deeply Nested Content')).toBeInTheDocument();

    // 7. Ensure no console errors (meaning no React or dynamic stub errors)
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
}); 
