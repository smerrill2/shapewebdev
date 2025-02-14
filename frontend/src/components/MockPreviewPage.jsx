import React, { useState } from 'react';
import SimpleLivePreview from './SimpleLivePreview';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

// Mock components that simulate AI-generated content
const mockComponents = {
  navigation: {
    name: 'Navigation',
    code: `
/// START Navigation position=header
export function Navigation() {
  return (
    <header className="w-full bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-xl font-bold">Logo</div>
        <nav className="flex gap-4">
          <Button variant="ghost">Home</Button>
          <Button variant="ghost">About</Button>
          <Button variant="ghost">Contact</Button>
        </nav>
      </div>
    </header>
  );
}
/// END Navigation
    `.trim()
  },
  hero: {
    name: 'HeroSection',
    code: `
/// START HeroSection position=main
export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-violet-500 to-purple-500 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to Our Mock Preview</h1>
        <p className="text-xl mb-8">Test out the SimpleLivePreview with predefined components</p>
        <Button size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100">
          Get Started
        </Button>
      </div>
    </section>
  );
}
/// END HeroSection
    `.trim()
  },
  features: {
    name: 'Features',
    code: `
/// START Features position=main
export function Features() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Easy to Use", description: "Simple and intuitive interface" },
            { title: "Customizable", description: "Adapt to your needs" },
            { title: "Responsive", description: "Works on all devices" }
          ].map((feature, index) => (
            <Card key={index} className="transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Learn More</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
/// END Features
    `.trim()
  }
};

export default function MockPreviewPage() {
  const [registry, setRegistry] = useState({
    components: new Map()
  });
  const [streamingStates, setStreamingStates] = useState(new Map());
  const [activeComponents, setActiveComponents] = useState([]);

  // Function to simulate adding a component
  const addComponent = (componentKey) => {
    const component = mockComponents[componentKey];
    if (!component) return;

    // Update registry
    setRegistry(prev => {
      const newComponents = new Map(prev.components);
      const componentId = `comp_${component.name.toLowerCase()}`;
      newComponents.set(componentId, {
        name: component.name,
        code: component.code,
        position: componentKey === 'navigation' ? 'header' : 'main'
      });
      return { ...prev, components: newComponents };
    });

    // Update streaming states
    setStreamingStates(prev => {
      const newStates = new Map(prev);
      const componentId = `comp_${component.name.toLowerCase()}`;
      newStates.set(componentId, {
        isStreaming: false,
        isComplete: true,
        error: null
      });
      return newStates;
    });

    // Track active components
    setActiveComponents(prev => [...prev, componentKey]);
  };

  // Function to remove a component
  const removeComponent = (componentKey) => {
    const component = mockComponents[componentKey];
    if (!component) return;

    // Update registry
    setRegistry(prev => {
      const newComponents = new Map(prev.components);
      const componentId = `comp_${component.name.toLowerCase()}`;
      newComponents.delete(componentId);
      return { ...prev, components: newComponents };
    });

    // Update streaming states
    setStreamingStates(prev => {
      const newStates = new Map(prev);
      const componentId = `comp_${component.name.toLowerCase()}`;
      newStates.delete(componentId);
      return newStates;
    });

    // Remove from active components
    setActiveComponents(prev => prev.filter(key => key !== componentKey));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg z-50 w-64">
        <h3 className="text-lg font-semibold mb-4">Mock Components</h3>
        <div className="space-y-2">
          {Object.keys(mockComponents).map(key => {
            const isActive = activeComponents.includes(key);
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "outline"}
                className="w-full justify-between"
                onClick={() => isActive ? removeComponent(key) : addComponent(key)}
              >
                <span className="capitalize">{key}</span>
                <span>{isActive ? "Remove" : "Add"}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-4">
        <SimpleLivePreview
          registry={registry}
          streamingStates={streamingStates}
        />
      </div>
    </div>
  );
} 