import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LivePreview } from '../../frontend/src/components/LivePreview';

class MockEventSource {
  constructor() {
    this.listeners = {};
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        if (event === 'message') {
          callback({ data: JSON.stringify(data) });
        } else {
          callback(data);
        }
      });
    }
  }
}

describe('LivePreview Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles initial connection message', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'connection',
        metadata: { clientId: 'test-client' }
      });
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
  });

  it('processes import statements correctly', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'import',
        metadata: { imports: ['react', '@/components/ui/button'] }
      });
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
  });

  it('handles complete component chunks', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'component',
        metadata: {
          componentName: 'TestComponent',
          code: 'const TestComponent = () => <div>Test</div>;',
          scope: {}
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('component-wrapper-TestComponent')).toBeInTheDocument();
      expect(screen.getByTestId('live-preview-TestComponent')).toBeInTheDocument();
    });
  });

  it('handles stream errors gracefully', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('error', new Event('error'));
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('error')).toBeInTheDocument();
  });

  it('handles heartbeat messages', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'heartbeat'
      });
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('live-provider')).toBeInTheDocument();
  });
});

describe('LivePreview Component Transformation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const testComponentTransformation = async (componentName, code) => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'component',
        metadata: {
          componentName,
          code,
          scope: {}
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`component-wrapper-${componentName}`)).toBeInTheDocument();
      expect(screen.getByTestId(`live-preview-${componentName}`)).toBeInTheDocument();
    });
  };

  it('correctly transforms BasicComponent', async () => {
    await testComponentTransformation(
      'BasicComponent',
      'const BasicComponent = () => <div>Basic Component</div>;'
    );
  });

  it('correctly transforms WithStateComponent', async () => {
    await testComponentTransformation(
      'WithStateComponent',
      `const WithStateComponent = () => {
        const [count, setCount] = React.useState(0);
        return <div>{count}</div>;
      };`
    );
  });

  it('correctly transforms WithPropsComponent', async () => {
    await testComponentTransformation(
      'WithPropsComponent',
      'const WithPropsComponent = ({ text }) => <div>{text}</div>;'
    );
  });

  it('correctly transforms ClassComponentComponent', async () => {
    await testComponentTransformation(
      'ClassComponentComponent',
      `class ClassComponentComponent extends React.Component {
        render() {
          return <div>Class Component</div>;
        }
      }`
    );
  });

  it('correctly transforms WithHooksComponent', async () => {
    await testComponentTransformation(
      'WithHooksComponent',
      `const WithHooksComponent = () => {
        const [state, setState] = React.useState(0);
        React.useEffect(() => {
          setState(1);
        }, []);
        return <div>{state}</div>;
      };`
    );
  });

  it('handles malformed component code', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'component',
        metadata: {
          componentName: 'MalformedComponent',
          code: 'const MalformedComponent = () => <div>Malformed</div>',
          scope: {}
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });

  it('handles components with syntax errors', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'component',
        metadata: {
          componentName: 'SyntaxErrorComponent',
          code: 'const SyntaxErrorComponent = () => {',
          scope: {}
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
});

describe('Component Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('correctly renders components with icons and shadcn components', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'component',
        metadata: {
          componentName: 'StyledNavigation',
          code: `
            const StyledNavigation = () => (
              <div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <span>🏠</span> Home
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <span>⚙️</span> Settings
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <span>👤</span> Profile
                </button>
              </div>
            );
          `,
          scope: {}
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('live-preview-StyledNavigation')).toBeInTheDocument();
      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });
  });

  it('correctly renders card components with icons', async () => {
    const mockEventSource = new MockEventSource();
    render(<LivePreview eventSource={mockEventSource} />);

    await act(async () => {
      mockEventSource.emit('message', {
        type: 'component',
        metadata: {
          componentName: 'NotificationCard',
          code: `
            const NotificationCard = () => (
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span>🔔</span>
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <p className="text-gray-600">You have 3 unread messages</p>
              </div>
            );
          `,
          scope: {}
        }
      });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('live-preview-NotificationCard')).toBeInTheDocument();
      expect(screen.getByText('🔔')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('You have 3 unread messages')).toBeInTheDocument();
    });
  });
}); 