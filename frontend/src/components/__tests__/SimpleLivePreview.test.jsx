import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleLivePreview from '../SimpleLivePreview';

// Use the mock file
jest.mock('react-live');

describe('SimpleLivePreview', () => {
  let mockRegistry;

  beforeEach(() => {
    mockRegistry = {
      components: new Map(),
      layout: {
        sections: {
          header: [],
          main: [],
          footer: []
        },
        globalStyles: []
      }
    };
  });

  it('should render a navigation component', () => {
    mockRegistry.components.set('Navigation', {
      name: 'Navigation',
      code: `
        function Navigation() {
          return (
            <nav className="bg-slate-800 p-4">
              <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-white text-xl font-bold">Logo</h1>
                <div className="flex gap-4">
                  <a href="#" className="text-white hover:text-purple-400">Home</a>
                  <a href="#" className="text-white hover:text-purple-400">About</a>
                  <a href="#" className="text-white hover:text-purple-400">Contact</a>
                </div>
              </div>
            </nav>
          );
        }
      `,
      isComplete: true
    });
    mockRegistry.layout.sections.header.push('Navigation');

    const { getByTestId, getByText } = render(
      <SimpleLivePreview registry={mockRegistry} />
    );

    expect(getByTestId('live-preview-content')).toBeInTheDocument();
    expect(getByText('Logo')).toBeInTheDocument();
    expect(getByText('Home')).toBeInTheDocument();
  });

  it('should render a hero section with button', () => {
    mockRegistry.components.set('HeroSection', {
      name: 'HeroSection',
      code: `
        function HeroSection() {
          return (
            <div className="py-20 text-center">
              <h1 className="text-4xl font-bold text-white mb-4">Welcome to Our Site</h1>
              <p className="text-purple-200 mb-8">Experience the future of web development</p>
              <Button>Get Started</Button>
            </div>
          );
        }
      `,
      isComplete: true
    });
    mockRegistry.layout.sections.main.push('HeroSection');

    const { getByTestId, getByText } = render(
      <SimpleLivePreview registry={mockRegistry} />
    );

    expect(getByTestId('live-preview-content')).toBeInTheDocument();
    expect(getByText('Welcome to Our Site')).toBeInTheDocument();
    expect(getByText('Get Started')).toBeInTheDocument();
  });

  it('should render a features section with cards', () => {
    mockRegistry.components.set('FeaturesSection', {
      name: 'FeaturesSection',
      code: `
        function FeaturesSection() {
          return (
            <div className="py-16 bg-slate-800/50">
              <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Feature 1</h3>
                  <p className="text-purple-200">Amazing feature description</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Feature 2</h3>
                  <p className="text-purple-200">Incredible feature details</p>
                </Card>
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Feature 3</h3>
                  <p className="text-purple-200">Outstanding feature highlights</p>
                </Card>
              </div>
            </div>
          );
        }
      `,
      isComplete: true
    });
    mockRegistry.layout.sections.main.push('FeaturesSection');

    const { getByTestId, getAllByText } = render(
      <SimpleLivePreview registry={mockRegistry} />
    );

    expect(getByTestId('live-preview-content')).toBeInTheDocument();
    expect(getAllByText(/Feature \d/).length).toBe(3);
  });

  it('should handle component updates', () => {
    mockRegistry.components.set('UpdatedComponent', {
      name: 'UpdatedComponent',
      code: `
        function UpdatedComponent() {
          const [count, setCount] = React.useState(0);
          return (
            <div className="p-4 text-center">
              <p className="text-white mb-4">Count: {count}</p>
              <Button onClick={() => setCount(c => c + 1)}>Increment</Button>
            </div>
          );
        }
      `,
      isComplete: true
    });
    mockRegistry.layout.sections.main.push('UpdatedComponent');

    const { getByTestId, getByText } = render(
      <SimpleLivePreview registry={mockRegistry} />
    );

    expect(getByTestId('live-preview-content')).toBeInTheDocument();
    expect(getByText('Count: 0')).toBeInTheDocument();
  });
});
