import { renderHook, act } from '@testing-library/react';
import { useComponentRegistry } from '../useComponentRegistry';

describe('useComponentRegistry', () => {
  beforeEach(() => {
    // Clear console mocks between tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start a new component correctly', () => {
    const { result } = renderHook(() => useComponentRegistry());
    
    act(() => {
      result.current.startComponent('comp1', { position: 'header' });
    });

    const components = result.current.getComponents();
    expect(components.comp1).toBeDefined();
    expect(components.comp1.code).toBe('');
    expect(components.comp1.isComplete).toBe(false);
    expect(components.comp1.metadata).toEqual({ position: 'header' });
  });

  it('should append code to an existing component', () => {
    const { result } = renderHook(() => useComponentRegistry());
    
    act(() => {
      result.current.startComponent('comp1', {});
      result.current.appendToComponent('comp1', 'const a = 1;');
      result.current.appendToComponent('comp1', 'const b = 2;');
    });

    const components = result.current.getComponents();
    expect(components.comp1.code).toBe('const a = 1;const b = 2;');
  });

  it('should mark a component as complete', () => {
    const { result } = renderHook(() => useComponentRegistry());
    
    act(() => {
      result.current.startComponent('comp1', {});
      result.current.appendToComponent('comp1', 'code');
      result.current.completeComponent('comp1');
    });

    const components = result.current.getComponents();
    expect(components.comp1.isComplete).toBe(true);
  });

  it('should not append to a completed component', () => {
    const { result } = renderHook(() => useComponentRegistry());
    
    act(() => {
      result.current.startComponent('comp1', {});
      result.current.completeComponent('comp1');
      result.current.appendToComponent('comp1', 'new code');
    });

    const components = result.current.getComponents();
    expect(components.comp1.code).toBe('');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cannot append to completed component')
    );
  });

  it('should handle multiple components', () => {
    const { result } = renderHook(() => useComponentRegistry());
    
    act(() => {
      result.current.startComponent('header', { position: 'top' });
      result.current.startComponent('footer', { position: 'bottom' });
      result.current.appendToComponent('header', 'header code');
      result.current.appendToComponent('footer', 'footer code');
    });

    const components = result.current.getComponents();
    expect(components.header.code).toBe('header code');
    expect(components.footer.code).toBe('footer code');
    expect(components.header.metadata).toEqual({ position: 'top' });
    expect(components.footer.metadata).toEqual({ position: 'bottom' });
  });

  it('should warn when trying to append to non-existent component', () => {
    const { result } = renderHook(() => useComponentRegistry());
    
    act(() => {
      result.current.appendToComponent('missing', 'some code');
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Component missing does not exist')
    );
  });
}); 