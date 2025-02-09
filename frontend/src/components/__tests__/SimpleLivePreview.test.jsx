import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as babel from '@babel/standalone';
import SimpleLivePreview from '../SimpleLivePreview';

// Mock cn function
jest.mock('../utils/cn', () => ({
  cn: (...args) => args.filter(Boolean).join(' ')
}));

// Mock modules
jest.mock('lucide-react', () => ({}));

jest.mock('react-live', () => {
  const React = require('react');
  const babel = require('@babel/standalone');

  // Helper function for className concatenation
  const cn = (...args) => args.filter(Boolean).join(' ');

  // Real UI components (minimal implementations)
  const Button = ({ children, className, ...props }) => (
    <button className={cn("button", className)} {...props} data-testid="button">{children}</button>
  );

  const Card = ({ children, className, ...props }) => (
    <div className={cn("card", className)} {...props} data-testid="card">{children}</div>
  );

  const Link = ({ children, to, className, ...props }) => (
    <a href={to} className={cn("link", className)} {...props} data-testid="link">{children}</a>
  );

  // Mock components
  const DarkModeProvider = ({ children }) => <div data-testid="dark-mode-provider">{children}</div>;
  const NavigationMenu = ({ children, ...props }) => <nav data-testid="navigation-menu" {...props}>{children}</nav>;
  const LucideIcons = {};

  const LivePreview = ({ children }) => {
    return (
      <div className="flex flex-col min-h-screen w-full" data-testid="preview-wrapper">
        <div data-testid="preview-content">
          {children}
        </div>
      </div>
    );
  };

  const LiveProvider = jest.fn(({ code: providedCode, scope, children }) => {
    try {
      // Get the registry and streaming states from scope
      const registry = scope?.registry;
      const streamingStates = scope?.streamingStates;
      
      if (!registry?.components) {
        return <LivePreview>{null}</LivePreview>;
      }

      // Get complete components
      const completeComponents = Array.from(registry.components.entries())
        .filter(([id, comp]) => {
          const state = streamingStates?.get(id);
          // Consider a component complete if it has proper markers and state is complete
          const startMarker = comp.code.match(/\/\/\/\s*START\s+(\w+)\s*(?:position=(\w+))?/);
          const endMarker = comp.code.match(/\/\/\/\s*END\s+(\w+)/);
          const functionMatch = comp.code.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
          
          const hasValidMarkers = startMarker && endMarker && functionMatch;
          const namesMatch = startMarker?.[1] === functionMatch?.[1] && functionMatch?.[1] === comp.name;
          
          return hasValidMarkers && namesMatch && state?.isComplete;
        })
        .map(([_, component]) => component);

      if (completeComponents.length === 0) {
        return <LivePreview>{null}</LivePreview>;
      }

      // Create a streaming wrapper for all components
      const componentCode = completeComponents
        .map(comp => {
          // Clean the code by removing markers but preserve the function
          const cleanedCode = comp.code
            .replace(/\/\/\/\s*START.*\n/g, '')
            .replace(/\/\/\/\s*END.*\n/g, '')
            .trim();
          return cleanedCode;
        })
        .join('\n\n');

      // Transform JSX to JavaScript using Babel
      const transformedCode = babel.transform(componentCode, {
        presets: ['react'],
        filename: 'live.js'
      }).code;

      // Create a function that returns the components
      const fn = new Function('React', 'scope', `
        with (scope) {
          ${transformedCode}
          return function StreamingPreview() {
            return React.createElement(DarkModeProvider, null, 
              React.createElement('div', { className: 'flex flex-col min-h-screen w-full' },
                [${completeComponents.map(comp => {
                  const position = comp.code.match(/position=(\w+)/)?.[1] || 'main';
                  return `React.createElement('div', {
                    key: '${comp.name}',
                    'data-testid': 'preview-${comp.name}',
                    'data-position': '${position}',
                    className: 'w-full'
                  }, React.createElement(${comp.name}, null))`;
                }).join(',\n')}]
              )
            );
          }
        }
      `);

      // Create an enhanced scope with all necessary components
      const enhancedScope = {
        React,
        Button,
        Card,
        Link,
        DarkModeProvider,
        NavigationMenu,
        LucideIcons,
        cn,
        ...scope // Include all scope passed from the component
      };

      // Execute the function with enhanced scope
      const ComponentDef = fn(React, enhancedScope);
      const StreamingPreview = ComponentDef();

      // Return the component wrapped in the preview container
      return <LivePreview><StreamingPreview /></LivePreview>;
    } catch (error) {
      console.error('Error in LiveProvider mock:', error);
      console.error('Error details:', error.stack);
      return <LivePreview>{null}</LivePreview>;
    }
  });

  return {
    LiveProvider,
    LivePreview,
    LiveError: jest.fn(({ children }) => <div>{children}</div>),
  };
});

// Mock the createUniversalNamespace function
jest.mock('../utils/createUniversalNamespace', () => ({
  createUniversalNamespace: jest.fn(() => ({
    Button,
    Card,
    Link,
    LucideIcons: {},
    NavigationMenu: jest.fn(() => null),
    DarkModeProvider: jest.fn(({ children }) => children)
  }))
}));

// Mock the config constants
jest.mock('../utils/config', () => ({
  DEBUG_MODE: false,
  CRITICAL_COMPONENTS: [],
  NAMESPACED_COMPONENTS: [],
  ERROR_STATES: {
    COMPOUND_TIMEOUT: 'COMPOUND_TIMEOUT'
  },
  COMPONENT_STATUS: {
    COMPLETE: 'COMPLETE',
    STREAMING: 'STREAMING',
    ERROR: 'ERROR'
  }
}));

// Create a mock scope for the LiveProvider
const mockScope = {
  Button,
  Card,
  Link,
  DarkModeProvider,
  NavigationMenu,
  LucideIcons,
  React: require('react')
};

describe('SimpleLivePreview', () => {
  it('should render a navigation component', async () => {
    const mockRegistry = {
      components: new Map([
        ['Navigation', {
          id: 'Navigation',
          name: 'Navigation',
          code: `
/// START Navigation position=header
function Navigation() {
  return (
    <nav data-testid="navigation">
      <Link to="/">Logo</Link>
      <NavigationMenu>
        <Link to="/">Home</Link>
      </NavigationMenu>
    </nav>
  );
}
/// END Navigation
          `.trim()
        }]
      ])
    };

    const mockStreamingStates = new Map([
      ['Navigation', { isComplete: true, isStreaming: false }]
    ]);

    const { container } = render(
      <SimpleLivePreview
        registry={mockRegistry}
        streamingStates={mockStreamingStates}
      />
    );

    console.log('Container HTML:', container.innerHTML);

    const previewContainer = screen.getByTestId('preview-container');
    expect(previewContainer).toBeInTheDocument();
    
    const previewWrapper = await screen.findByTestId('preview-wrapper');
    expect(previewWrapper).toBeInTheDocument();
    
    const navigationComponent = await screen.findByTestId('preview-Navigation');
    expect(navigationComponent).toBeInTheDocument();
    expect(navigationComponent).toHaveAttribute('data-position', 'header');

    const nav = await screen.findByTestId('navigation');
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('should render a hero section with button', async () => {
    const mockRegistry = {
      components: new Map([
        ['HeroSection', {
          id: 'HeroSection',
          name: 'HeroSection',
          code: `
/// START HeroSection position=hero
function HeroSection() {
  return (
    <section data-testid="hero">
      <h1>Welcome to Our Site</h1>
      <Button>Get Started</Button>
    </section>
  );
}
/// END HeroSection
          `.trim()
        }]
      ])
    };

    const mockStreamingStates = new Map([
      ['HeroSection', { isComplete: true, isStreaming: false }]
    ]);

    const { container } = render(
      <SimpleLivePreview
        registry={mockRegistry}
        streamingStates={mockStreamingStates}
      />
    );

    console.log('Container HTML:', container.innerHTML);

    const previewContainer = screen.getByTestId('preview-container');
    expect(previewContainer).toBeInTheDocument();
    
    const previewWrapper = await screen.findByTestId('preview-wrapper');
    expect(previewWrapper).toBeInTheDocument();
    
    const heroComponent = await screen.findByTestId('preview-HeroSection');
    expect(heroComponent).toBeInTheDocument();
    expect(heroComponent).toHaveAttribute('data-position', 'hero');

    const hero = await screen.findByTestId('hero');
    expect(hero).toBeInTheDocument();
    expect(screen.getByText('Welcome to Our Site')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should render a features section with cards', async () => {
    const mockRegistry = {
      components: new Map([
        ['Features', {
          id: 'Features',
          name: 'Features',
          code: `
/// START Features position=main
function Features() {
  return (
    <div data-testid="features" className="grid grid-cols-3 gap-8">
      <Card>
        <h3>Feature 1</h3>
        <p>Description 1</p>
      </Card>
      <Card>
        <h3>Feature 2</h3>
        <p>Description 2</p>
      </Card>
      <Card>
        <h3>Feature 3</h3>
        <p>Description 3</p>
      </Card>
    </div>
  );
}
/// END Features
          `.trim()
        }]
      ])
    };

    const mockStreamingStates = new Map([
      ['Features', { isComplete: true, isStreaming: false }]
    ]);

    const { container } = render(
      <SimpleLivePreview
        registry={mockRegistry}
        streamingStates={mockStreamingStates}
      />
    );

    console.log('Container HTML:', container.innerHTML);

    const previewContainer = screen.getByTestId('preview-container');
    expect(previewContainer).toBeInTheDocument();
    
    const previewWrapper = await screen.findByTestId('preview-wrapper');
    expect(previewWrapper).toBeInTheDocument();
    
    const featuresComponent = await screen.findByTestId('preview-Features');
    expect(featuresComponent).toBeInTheDocument();
    expect(featuresComponent).toHaveAttribute('data-position', 'main');

    const features = await screen.findByTestId('features');
    expect(features).toBeInTheDocument();
    expect(screen.getByText('Feature 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Feature 2')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
    expect(screen.getByText('Feature 3')).toBeInTheDocument();
    expect(screen.getByText('Description 3')).toBeInTheDocument();
  });
});

describe('SimpleLivePreview Component Marker System', () => {
  let mockRegistry;
  let mockStreamingStates;

  beforeEach(() => {
    mockRegistry = {
      components: new Map()
    };
    
    mockStreamingStates = new Map();
  });

  it('validates and renders components with proper markers', async () => {
    const headerDef = {
      id: 'Header',
      name: 'Header',
      code: `
/// START Header position=header
function Header() {
  return <header>Test Header</header>;
}
/// END Header
      `.trim()
    };

    const heroDef = {
      id: 'Hero',
      name: 'Hero',
      code: `
/// START Hero position=hero
function Hero() {
  return <section>Test Hero</section>;
}
/// END Hero
      `.trim()
    };

    mockRegistry.components.set('Header', headerDef);
    mockRegistry.components.set('Hero', heroDef);
    mockStreamingStates.set('Header', { isComplete: true, isStreaming: false });
    mockStreamingStates.set('Hero', { isComplete: true, isStreaming: false });

    render(
      <SimpleLivePreview 
        registry={mockRegistry} 
        streamingStates={mockStreamingStates}
      />
    );

    const previewContainer = await screen.findByTestId('preview-container');
    expect(previewContainer).toBeInTheDocument();
    
    const previewWrapper = await screen.findByTestId('preview-wrapper');
    expect(previewWrapper).toBeInTheDocument();
    
    const renderedHeader = await screen.findByTestId('preview-Header');
    expect(renderedHeader).toBeInTheDocument();
    expect(renderedHeader).toHaveAttribute('data-position', 'header');
    
    const renderedHero = await screen.findByTestId('preview-Hero');
    expect(renderedHero).toBeInTheDocument();
    expect(renderedHero).toHaveAttribute('data-position', 'hero');
  });

  it('handles component positions correctly', async () => {
    const headerDef = {
      id: 'Header',
      name: 'Header',
      code: `
/// START Header position=header
function Header() {
  return <header>Test Header</header>;
}
/// END Header
      `.trim()
    };

    const heroDef = {
      id: 'Hero',
      name: 'Hero',
      code: `
/// START Hero position=hero
function Hero() {
  return <section>Test Hero</section>;
}
/// END Hero
      `.trim()
    };

    mockRegistry.components.set('Header', headerDef);
    mockRegistry.components.set('Hero', heroDef);
    mockStreamingStates.set('Header', { isComplete: true, isStreaming: false });
    mockStreamingStates.set('Hero', { isComplete: true, isStreaming: false });

    render(
      <SimpleLivePreview 
        registry={mockRegistry} 
        streamingStates={mockStreamingStates}
      />
    );

    const previewContainer = await screen.findByTestId('preview-container');
    expect(previewContainer).toBeInTheDocument();
    
    const previewWrapper = await screen.findByTestId('preview-wrapper');
    expect(previewWrapper).toBeInTheDocument();
    
    const renderedHeader = await screen.findByTestId('preview-Header');
    expect(renderedHeader).toBeInTheDocument();
    expect(renderedHeader).toHaveAttribute('data-position', 'header');
    
    const renderedHero = await screen.findByTestId('preview-Hero');
    expect(renderedHero).toBeInTheDocument();
    expect(renderedHero).toHaveAttribute('data-position', 'hero');
  });

  it('validates marker format', () => {
    const invalidComponent = {
      id: 'Invalid',
      name: 'Invalid',
      code: `
function Invalid() {
  return <div>No Markers</div>;
}
      `.trim()
    };

    mockRegistry.components.set('Invalid', invalidComponent);
    mockStreamingStates.set('Invalid', { isComplete: true, isStreaming: false });

    render(
      <SimpleLivePreview 
        registry={mockRegistry} 
        streamingStates={mockStreamingStates}
      />
    );

    expect(screen.getByTestId('preview-container')).toBeInTheDocument();
    expect(screen.queryByText('No Markers')).not.toBeInTheDocument();
  });
});
