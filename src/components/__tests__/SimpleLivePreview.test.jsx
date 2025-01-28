import React from 'react';
import { render } from '@testing-library/react';
import SimpleLivePreview from '../SimpleLivePreview';

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
    const navigationCode = `
      export default function Navigation() {
        return (
          <nav>
            <a href="/">Logo</a>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        );
      }
    `;

    mockRegistry.components.set('Navigation', {
      name: 'Navigation',
      code: navigationCode,
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
    const heroCode = `
      export default function HeroSection() {
        return (
          <div>
            <h1>Welcome to Our Site</h1>
            <button>Get Started</button>
          </div>
        );
      }
    `;

    mockRegistry.components.set('HeroSection', {
      name: 'HeroSection',
      code: heroCode,
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
    const featuresCode = `
      export default function FeaturesSection() {
        return (
          <div>
            <div>Feature 1</div>
            <div>Feature 2</div>
            <div>Feature 3</div>
          </div>
        );
      }
    `;

    mockRegistry.components.set('FeaturesSection', {
      name: 'FeaturesSection',
      code: featuresCode,
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
    const counterCode = `
      export default function Counter() {
        const [count, setCount] = React.useState(0);
        return <div>Count: {count}</div>;
      }
    `;

    mockRegistry.components.set('Counter', {
      name: 'Counter',
      code: counterCode,
      isComplete: true
    });
    mockRegistry.layout.sections.main.push('Counter');

    const { getByTestId, getByText } = render(
      <SimpleLivePreview registry={mockRegistry} />
    );

    expect(getByTestId('live-preview-content')).toBeInTheDocument();
    expect(getByText('Count: 0')).toBeInTheDocument();
  });
}); 