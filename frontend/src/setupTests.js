// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment the following lines to see the warnings and errors in tests
  // error: jest.fn(),
  // warn: jest.fn(),
  // log: jest.fn(),
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock UI components directly
jest.mock('./components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>
}));

jest.mock('./components/ui/card', () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>
}));

jest.mock('./components/ui/navigation-menu', () => ({
  NavigationMenu: ({ children, ...props }) => <nav {...props}>{children}</nav>,
  NavigationMenuList: ({ children, ...props }) => <ul {...props}>{children}</ul>,
  NavigationMenuItem: ({ children, ...props }) => <li {...props}>{children}</li>,
  NavigationMenuTrigger: ({ children, ...props }) => <button {...props}>{children}</button>,
  NavigationMenuContent: ({ children, ...props }) => <div {...props}>{children}</div>,
  NavigationMenuLink: ({ children, ...props }) => <a href="/" {...props}>{children}</a>,
}));

// Mock Date.now() to return a fixed timestamp for consistent testing
const FIXED_TIMESTAMP = 1612137600000; // February 1, 2021
global.Date.now = jest.fn(() => FIXED_TIMESTAMP); 