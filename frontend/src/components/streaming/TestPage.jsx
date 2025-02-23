import React, { useState } from 'react';
// import { LivePreview } from '../LivePreview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { useComponentRegistry } from './useComponentRegistry';

// Sample components for testing
const SAMPLE_COMPONENTS = {
  Header: {
    name: 'Header',
    code: `
      /// START Header
      function Header() {
        return (
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
          </header>
        );
      }
      /// END Header
    `,
  },
  Hero: {
    name: 'Hero',
    code: `
      /// START Hero
      function Hero() {
        return (
          <div className="bg-white">
            <div className="max-w-7xl mx-auto py-12 px-4">
              <h2 className="text-4xl font-extrabold text-gray-900">Welcome to our site</h2>
              <p className="mt-4 text-xl text-gray-500">The best place to find what you need.</p>
            </div>
          </div>
        );
      }
      /// END Hero
    `,
  },
  Features: {
    name: 'Features',
    code: `
      /// START Features
      function Features() {
        return (
          <div className="bg-gray-50">
            <div className="max-w-7xl mx-auto py-12 px-4">
              <div className="grid grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Feature 1</h3>
                  <p className="mt-2 text-gray-500">Description of feature 1</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Feature 2</h3>
                  <p className="mt-2 text-gray-500">Description of feature 2</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900">Feature 3</h3>
                  <p className="mt-2 text-gray-500">Description of feature 3</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
      /// END Features
    `,
  },
};

function TestControls({ onSendComponent }) {
  const [selectedComponent, setSelectedComponent] = useState('Header');

  const handleSendComponent = () => {
    const component = SAMPLE_COMPONENTS[selectedComponent];
    if (component) {
      onSendComponent(component);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Select value={selectedComponent} onValueChange={setSelectedComponent}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select component" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(SAMPLE_COMPONENTS).map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-4">
        <Button onClick={handleSendComponent}>Send Component</Button>
      </div>
    </div>
  );
}

export function StreamingTestPage() {
  const registry = useComponentRegistry();

  const handleSendComponent = (component) => {
    const componentId = component.name.toLowerCase();
    
    // Simulate the streaming process
    registry.startComponent(componentId, { name: component.name });
    registry.appendToComponent(componentId, component.code);
    registry.completeComponent(componentId);
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LivePreview Testing</h1>
      </div>
      
      <div className="bg-card rounded-lg border p-4">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        <TestControls onSendComponent={handleSendComponent} />
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        {/* <LivePreview endpoint={null} registry={registry} /> */}
      </div>
    </div>
  );
} 