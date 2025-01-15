import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LivePreview from '../components/LivePreview';

// Mock @babel/standalone
jest.mock('@babel/standalone', () => ({
  transform: jest.fn((code) => ({ code }))
}));

describe('LivePreview Component', () => {
  test('renders components and shows completion status', () => {
    const componentList = [
      {
        name: 'TestHero',
        code: 'function TestHero() { return React.createElement("div", null, "Hero Content"); }',
        isComplete: true
      }
    ];

    render(<LivePreview componentList={componentList} />);
    
    expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    expect(screen.getByTestId('preview-container')).toBeInTheDocument();
    expect(screen.getByText('Hero Content')).toBeInTheDocument();
  });

  test('handles evaluation errors', () => {
    const componentList = [
      {
        name: 'BrokenComponent',
        code: 'function BrokenComponent() { syntax error here }',
        isComplete: true
      }
    ];

    render(<LivePreview componentList={componentList} />);
    
    expect(screen.getByTestId('preview-error')).toBeInTheDocument();
    expect(screen.getByTestId('preview-error')).toHaveTextContent(/error/i);
  });
}); 