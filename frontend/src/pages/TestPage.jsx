import React, { useState, useEffect } from 'react';
import LivePreview from '../components/LivePreview';
import { EventEmitter } from 'events';

// Test cases for our components
const TEST_CASES = [
  {
    name: 'Basic Component',
    description: 'Tests a simple counter component with state',
    setup: (emitter) => {
      // First send React import
      emitter.emit('message', {
        data: JSON.stringify({
          type: 'jsx_chunk',
          code: "import React from 'react';",
          metadata: {
            isImport: true,
            scope: { React }
          }
        })
      });

      // Then send the component
      emitter.emit('message', {
        data: JSON.stringify({
          type: 'jsx_chunk',
          code: `
            function BasicComponent() {
              const [count, setCount] = React.useState(0);
              
              return (
                <div className="p-4 border rounded-lg">
                  <div className="text-lg mb-2">Count: {count}</div>
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => setCount(c => c + 1)}
                  >
                    Increment
                  </button>
                </div>
              );
            }
            render(<BasicComponent />);
          `,
          metadata: {
            componentName: 'BasicComponent',
            size: 500,
            isComplete: true
          }
        })
      });
    }
  },
  {
    name: 'Navigation Component',
    description: 'Tests a navigation component with icons',
    setup: (emitter) => {
      // Send the component
      emitter.emit('message', {
        data: JSON.stringify({
          type: 'jsx_chunk',
          code: `
            function StyledNavigation() {
              const [activeIcon, setActiveIcon] = React.useState('home');
              
              return (
                <div className="flex gap-4 p-4 bg-white shadow rounded-lg">
                  <button 
                    className={\`p-2 rounded flex items-center gap-2 \${activeIcon === 'home' ? 'bg-blue-500 text-white' : 'bg-gray-100'}\`}
                    onClick={() => setActiveIcon('home')}
                  >
                    🏠 Home
                  </button>
                  <button 
                    className={\`p-2 rounded flex items-center gap-2 \${activeIcon === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-100'}\`}
                    onClick={() => setActiveIcon('settings')}
                  >
                    ⚙️ Settings
                  </button>
                  <button 
                    className={\`p-2 rounded flex items-center gap-2 \${activeIcon === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'}\`}
                    onClick={() => setActiveIcon('user')}
                  >
                    👤 Profile
                  </button>
                </div>
              );
            }
            render(<StyledNavigation />);
          `,
          metadata: {
            componentName: 'StyledNavigation',
            size: 500,
            isComplete: true
          }
        })
      });
    }
  },
  {
    name: 'Card Component',
    description: 'Tests a card component with notifications',
    setup: (emitter) => {
      // Send the component
      emitter.emit('message', {
        data: JSON.stringify({
          type: 'jsx_chunk',
          code: `
            function NotificationCard() {
              const [isRead, setIsRead] = React.useState(false);
              
              return (
                <div className={\`p-4 border rounded-lg shadow-lg bg-white \${isRead ? 'opacity-75' : ''}\`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold">🔔 Notifications</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    Your recent notifications
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      <span>New feature available!</span>
                    </div>
                    <button 
                      className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                      onClick={() => setIsRead(true)}
                    >
                      {isRead ? 'Read' : 'Mark as Read'}
                    </button>
                  </div>
                </div>
              );
            }
            render(<NotificationCard />);
          `,
          metadata: {
            componentName: 'NotificationCard',
            size: 500,
            isComplete: true
          }
        })
      });
    }
  }
];

// Mock EventSource for testing
class MockEventSource extends EventEmitter {
  constructor() {
    super();
    this.close = () => this.removeAllListeners();
  }
}

const TestPage = () => {
  const [currentTest, setCurrentTest] = useState(null);
  const [testStream, setTestStream] = useState(null);
  const [testStatus, setTestStatus] = useState('idle');
  const [testResults, setTestResults] = useState([]);

  // Run a single test
  const runTest = (test) => {
    setTestStatus('running');
    setCurrentTest(test);
    
    // Create a new mock event source
    const mockStream = new MockEventSource();
    setTestStream(mockStream);

    // Run the test after a short delay
    setTimeout(() => {
      test.setup(mockStream);
      setTestStatus('complete');
      setTestResults(prev => [...prev, { name: test.name, status: 'complete' }]);
    }, 100);
  };

  // Run all tests in sequence
  const runAllTests = () => {
    setTestResults([]);
    let currentIndex = 0;

    const runNextTest = () => {
      if (currentIndex < TEST_CASES.length) {
        const test = TEST_CASES[currentIndex];
        runTest(test);
        currentIndex++;
        setTimeout(runNextTest, 2000); // Wait 2s between tests
      }
    };

    runNextTest();
  };

  // Reset the test state
  const resetTests = () => {
    setCurrentTest(null);
    setTestStream(null);
    setTestStatus('idle');
    setTestResults([]);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (testStream) {
        testStream.close();
      }
    };
  }, [testStream]);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Component Test Suite</h1>
        <div className="flex gap-4 mb-6">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={runAllTests}
          >
            Run All Tests
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={resetTests}
          >
            Reset Tests
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Test Cases</h2>
          <div className="space-y-4">
            {TEST_CASES.map((test, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => runTest(test)}
              >
                <h3 className="font-medium">{test.name}</h3>
                <p className="text-sm text-gray-600">{test.description}</p>
                {testResults.find(r => r.name === test.name) && (
                  <div className="mt-2">
                    <span className="text-green-500">✓ Complete</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
          <div className="border rounded-lg p-4">
            {testStream ? (
              <LivePreview stream={testStream} />
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a test case to run
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage; 