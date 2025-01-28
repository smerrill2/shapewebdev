// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Add TextEncoder polyfill for tests
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = function TextEncoder() {
    return {
      encode: function(str) {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          arr[i] = str.charCodeAt(i);
        }
        return arr;
      }
    };
  };
}

// Mock IntersectionObserver
class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

window.IntersectionObserver = IntersectionObserver;

// Mock ResizeObserver
class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

window.ResizeObserver = ResizeObserver; 