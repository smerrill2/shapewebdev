import React, { useState, useEffect } from 'react';
import SimpleLivePreview from './SimpleLivePreview';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from './ui/navigation-menu';
import { Home } from 'lucide-react';
import { cn } from './utils/cn';
import { extractFunctionDefinitions, cleanCode } from './utils/babelTransformations';

const TEST_PROMPTS = {
  singleComponent: {
    prompt: 'Generate a savage baking page',
    style: 'modern and clean',
    requirements: '3 components only. ' 
  },
  multiComponent: {
    prompt: 'Create a modern SaaS landing page with multiple sections',
    style: 'modern, professional, with subtle gradients and clean typography',
    requirements: `
      Include the following sections:
      1. Header with NavigationMenu, dark mode toggle, and call-to-action button
      2. Hero section with gradient background, Placeholder.Image, and multiple Button variants
      3. Features section using Card components and Lucide icons (Zap, Shield, and Sparkles)
      4. Testimonials section with Card components and user avatars using Placeholder.Image
      5. Pricing section with multiple Card components for different tiers
      6. Call-to-action section with gradient background and Button components
      7. Footer with social links using Lucide icons (Twitter, GitHub, LinkedIn)
      
      Use shadcn components:
      - NavigationMenu for header navigation
      - Button with different variants (default, outline, ghost)
      - Card for features and pricing
      - Icons from Lucide for visual elements
      
      Ensure proper spacing and responsive design using Tailwind classes.
      Use modern UI patterns like backdrop blur for header.
    `
  },
  rootLayoutOnly: {
    prompt: 'Just create a root layout component',
    style: 'minimal',
    requirements: 'Only the RootLayout, no other components'
  },
  invalidComponent: {
    prompt: 'Create a component with errors',
    style: 'broken',
    requirements: 'Make some validation fail'
  },
  productShowcase: {
    prompt: 'Create an e-commerce product showcase',
    style: 'modern and professional',
    requirements: `
      Create three interconnected components:
      1. PriceTag - Displays price with optional discount
      2. ProductCard - Uses PriceTag to show product details
      3. ProductShowcase - Grid of ProductCards with sorting/filtering
    `
  }
};

// Test component code
const TEST_HEADER_COMPONENT = `
function Header() {
  return (
    <header className="bg-slate-900 text-white py-4">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Test Header</h1>
          <Button>Click Me</Button>
        </nav>
      </div>
    </header>
  );
}
`;

// Test component code for interconnected components
const TEST_PRICE_TAG = `
/// START PriceTag position=main
import React from 'react';
import { cn } from '../lib/utils';

function PriceTag({ price = 0, discount = 0, currency = "$" }) {
  // Ensure price is a number and has a valid value
  const numericPrice = Number(price) || 0;
  const numericDiscount = Number(discount) || 0;
  
  const finalPrice = numericDiscount ? numericPrice * (1 - numericDiscount) : numericPrice;
  
  return (
    <div className={cn("flex items-center gap-2")}>
      <span className="text-2xl font-bold">{currency}{finalPrice.toFixed(2)}</span>
      {numericDiscount > 0 && (
        <span className="text-sm text-red-500 line-through">
          {currency}{numericPrice.toFixed(2)}
        </span>
      )}
      {numericDiscount > 0 && (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
          {(numericDiscount * 100)}% OFF
        </span>
      )}
    </div>
  );
}

export { PriceTag };
/// END PriceTag
`;

const TEST_PRODUCT_CARD = `
/// START ProductCard position=main
import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
import { PriceTag } from './PriceTag';

function ProductCard({ image = "https://placekitten.com/400/300", title = "Product", description = "No description available", price = 0, discount = 0 }) {
  return (
    <Card className={cn("overflow-hidden")}>
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-4 space-y-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-gray-600">{description}</p>
        <div className="mt-4">
          <PriceTag price={Number(price)} discount={Number(discount)} />
        </div>
        <Button className="w-full">Add to Cart</Button>
      </div>
    </Card>
  );
}

export { ProductCard };
/// END ProductCard
`;

const TEST_PRODUCT_SHOWCASE = `
/// START ProductShowcase position=main
import React from 'react';
import { cn } from '../lib/utils';
import { ProductCard } from './ProductCard';

function ProductShowcase() {
  const [sortBy, setSortBy] = React.useState('price');
  const [filterDiscount, setFilterDiscount] = React.useState(false);
  
  const products = [
    {
      id: 1,
      title: "Premium Headphones",
      description: "High-quality wireless headphones with noise cancellation",
      price: 299.99,
      discount: 0.2,
      image: "https://placekitten.com/400/300"
    },
    {
      id: 2,
      title: "Smart Watch",
      description: "Feature-rich smartwatch with health tracking",
      price: 199.99,
      discount: 0,
      image: "https://placekitten.com/401/300"
    },
    {
      id: 3,
      title: "Wireless Earbuds",
      description: "Compact and powerful wireless earbuds",
      price: 149.99,
      discount: 0.15,
      image: "https://placekitten.com/402/300"
    }
  ];

  const filteredProducts = products
    .filter(p => !filterDiscount || p.discount > 0)
    .sort((a, b) => {
      if (sortBy === 'price') {
        return (a.price * (1 - (a.discount || 0))) - (b.price * (1 - (b.discount || 0)));
      }
      return a.title.localeCompare(b.title);
    });

  return (
    <div className={cn("space-y-6")}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Our Products</h2>
        <div className="flex gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterDiscount}
              onChange={(e) => setFilterDiscount(e.target.checked)}
            />
            Show Discounted Only
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </div>
  );
}

export { ProductShowcase };
/// END ProductShowcase
`;

// Add constants to match generateController.js
const CRITICAL_COMPONENTS = new Set(['Header', 'Navigation', 'RootLayout']);
const COMPOUND_COMPONENTS = {
  NavigationMenu: {
    subcomponentPatterns: {
      List: /NavigationMenuList/,
      Item: /NavigationMenuItem/,
      Link: /NavigationMenuLink/,
      Content: /NavigationMenuContent/,
      Trigger: /NavigationMenuTrigger/
    }
  }
};

// Update test components to match generateController.js format
const TEST_COMPONENTS = {
  navigation: {
    name: 'Navigation',
    code: `
/// START Navigation position=header
function Navigation() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Home className="w-4 h-4 mr-2" />
            Home
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/">Dashboard</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
/// END Navigation
    `.trim()
  },
  hero: {
    name: 'HeroSection',
    code: `
/// START HeroSection position=main
function HeroSection() {
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
  priceTag: {
    name: 'PriceTag',
    code: `
/// START PriceTag position=main
function PriceTag({ price = 0, discount = 0, currency = "$" }) {
  const numericPrice = Number(price) || 0;
  const numericDiscount = Number(discount) || 0;
  
  const finalPrice = numericDiscount ? numericPrice * (1 - numericDiscount) : numericPrice;
  
  return (
    <div className={cn("flex items-center gap-2")}>
      <span className="text-2xl font-bold">
        {currency}{finalPrice.toFixed(2)}
      </span>
      {numericDiscount > 0 && (
        <span className="text-sm text-red-500 line-through">
          {currency}{numericPrice.toFixed(2)}
        </span>
      )}
      {numericDiscount > 0 && (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
          {(numericDiscount * 100)}% OFF
        </span>
      )}
    </div>
  );
}
/// END PriceTag
    `.trim()
  },
  productCard: {
    name: 'ProductCard',
    code: `
/// START ProductCard position=main
function ProductCard({ 
  image = "https://placekitten.com/400/300", 
  title = "Product", 
  description = "No description available", 
  price = 0, 
  discount = 0 
}) {
  return (
    <Card className={cn("overflow-hidden")}>
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-4 space-y-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-gray-600">{description}</p>
        <div className="mt-4">
          <PriceTag price={Number(price)} discount={Number(discount)} />
        </div>
        <Button className="w-full">Add to Cart</Button>
      </div>
    </Card>
  );
}
/// END ProductCard
    `.trim()
  },
  productShowcase: {
    name: 'ProductShowcase',
    code: `
/// START ProductShowcase position=main
function ProductShowcase() {
  const [sortBy, setSortBy] = React.useState('price');
  const [filterDiscount, setFilterDiscount] = React.useState(false);
  
  const products = [
    {
      id: 1,
      title: "Premium Headphones",
      description: "High-quality wireless headphones with noise cancellation",
      price: 299.99,
      discount: 0.2,
      image: "https://placekitten.com/400/300"
    },
    {
      id: 2,
      title: "Smart Watch",
      description: "Feature-rich smartwatch with health tracking",
      price: 199.99,
      discount: 0,
      image: "https://placekitten.com/401/300"
    },
    {
      id: 3,
      title: "Wireless Earbuds",
      description: "Compact and powerful wireless earbuds",
      price: 149.99,
      discount: 0.15,
      image: "https://placekitten.com/402/300"
    }
  ];

  const filteredProducts = products
    .filter(p => !filterDiscount || p.discount > 0)
    .sort((a, b) => {
      if (sortBy === 'price') {
        return (a.price * (1 - (a.discount || 0))) - (b.price * (1 - (b.discount || 0)));
      }
      return a.title.localeCompare(b.title);
    });

  return (
    <div className={cn("space-y-6")}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Our Products</h2>
        <div className="flex gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterDiscount}
              onChange={(e) => setFilterDiscount(e.target.checked)}
            />
            Show Discounted Only
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </div>
  );
}
/// END ProductShowcase
    `.trim()
  }
};

export default function LivePreviewTestPage() {
  const [registry, setRegistry] = useState({
    components: new Map(),
    layout: { sections: { header: [], main: [], footer: [] } }
  });
  const [streamingStates, setStreamingStates] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState('singleComponent');
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 LivePreviewTestPage State:', {
      registrySize: registry?.components?.size,
      streamingStatesSize: streamingStates?.size,
      registry: registry?.components ? Object.fromEntries(registry.components) : null,
      streamingStates: streamingStates ? Object.fromEntries(streamingStates) : null
    });
  }, [registry, streamingStates]);

  // Add test project and version IDs
  const TEST_PROJECT_ID = 'test-project-1';
  const TEST_VERSION_ID = 'test-version-1';

  // Remove unused validation helper
  const validateCode = (code) => {
    // Remove import statements
    code = code.replace(/^import\s+.*?['"]\s*;?\s*$/gm, '');
    
    // Remove export statements but keep the component definition
    code = code.replace(/^export\s+default\s+/gm, '');
    code = code.replace(/^export\s+/gm, '');
    
    // Ensure proper JSX tag closure
    const openTags = (code.match(/</g) || []).length;
    const closeTags = (code.match(/>/g) || []).length;
    
    // Basic validation
    if (openTags !== closeTags) {
      code = code.replace(/[^}]*$/, ''); // Remove incomplete JSX
    }

    return code;
  };

  // Process component start event with batched updates
  const processComponentStart = (event) => {
    // Validate event structure
    if (!event?.metadata?.componentId || !event?.metadata?.componentName) {
      console.warn('⚠️ Invalid component_start event:', event);
      return;
    }

    const componentId = event.metadata.componentId;
    
    // Update registry and streaming states atomically
    setRegistry(prevRegistry => {
      const newComponents = new Map(prevRegistry.components);
      newComponents.set(componentId, {
        name: event.metadata.componentName,
        code: '',
        isLayout: componentId === 'root_layout',
        position: event.metadata.position || 'main'
      });
      return { ...prevRegistry, components: newComponents };
    });

    setStreamingStates(prevStates => {
      const newStates = new Map(prevStates);
      newStates.set(componentId, {
        isStreaming: true,
        isComplete: false,
        error: null,
        startTime: Date.now()
      });
      return newStates;
    });

    // Dispatch stream_start event for SimpleLivePreview
    window.dispatchEvent(new CustomEvent('stream_start', {
      detail: event
    }));
  };

  // Simplified component delta processing - handle partial declarations
  const processComponentDelta = (event) => {
    // Detailed validation logging
    const validationResults = {
      hasType: !!event?.type,
      hasMetadata: !!event?.metadata,
      hasComponentId: !!event?.metadata?.componentId,
      hasComponentName: !!event?.metadata?.componentName,
      hasDelta: !!event?.delta,
      hasText: !!event?.delta?.text,
      textLength: event?.delta?.text?.length || 0,
      isTextEmpty: !event?.delta?.text?.trim(),
      componentId: event?.metadata?.componentId,
      componentName: event?.metadata?.componentName,
      position: event?.metadata?.position || 'main'
    };

    // Log validation results in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Validating delta event:', validationResults);
    }

    // Validate event structure
    if (!event?.metadata?.componentId || !event?.delta?.text || !event.delta.text.trim()) {
      console.warn('⚠️ Invalid component_delta event:', {
        event,
        validationResults
      });
      return;
    }

    const componentId = event.metadata.componentId;

    // Verify component is in streaming state
    setStreamingStates(prevStates => {
      const newStates = new Map(prevStates);
      const currentState = newStates.get(componentId);
      
      if (!currentState?.isStreaming) {
        console.warn('⚠️ Received delta for non-streaming component:', componentId);
        newStates.set(componentId, {
          isStreaming: true,
          isComplete: false,
          error: null,
          startTime: Date.now()
        });
      }
      
      return newStates;
    });

    setRegistry(prevRegistry => {
      const newComponents = new Map(prevRegistry.components);
      const existingComponent = componentId && newComponents.get(componentId);
      
      if (existingComponent) {
        const newText = event.delta.text;
        let updatedCode = existingComponent.code + newText;
        
        // Log code update in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📝 Updating component code:', {
            componentId,
            componentName: existingComponent.name,
            newTextLength: newText.length,
            totalCodeLength: updatedCode.length,
            hasStartMarker: updatedCode.includes('/// START'),
            hasEndMarker: updatedCode.includes('/// END')
          });
        }
        
        newComponents.set(componentId, {
          ...existingComponent,
          code: updatedCode
        });
      } else {
        console.warn('⚠️ No existing component found for delta:', {
          componentId,
          registrySize: newComponents.size,
          availableComponents: Array.from(newComponents.keys())
        });
      }

      return { ...prevRegistry, components: newComponents };
    });

    // Dispatch stream_delta event for SimpleLivePreview
    window.dispatchEvent(new CustomEvent('stream_delta', {
      detail: event
    }));
  };

  // Simplified component stop processing
  const processComponentStop = (event) => {
    // Validate event structure
    if (!event?.metadata?.componentId) {
      console.warn('⚠️ Invalid component_stop event:', event);
      return;
    }

    const stopComponentId = event.metadata.componentId;
    
    setStreamingStates(prevStates => {
      const newStates = new Map(prevStates);
      if (stopComponentId) {
        newStates.set(stopComponentId, {
          isStreaming: false,
          isComplete: true,
          error: null
        });
      }
      return newStates;
    });

    // Update sections if provided
    if (event.metadata?.sections) {
      setRegistry(prev => ({
        ...prev,
        layout: {
          sections: { ...event.metadata.sections }
        }
      }));
    }

    // Dispatch stop event for SimpleLivePreview
    const stopEvent = new CustomEvent('stream_delta', {
      detail: event
    });
    window.dispatchEvent(stopEvent);
  };

  // Simplify runTest to just handle events
  const runTest = async (testCase) => {
    setIsLoading(true);
    setEvents([]);
    setError(null);
    
    // Reset states with proper Map initialization
    const initialRegistry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
    const initialStreamingStates = new Map();
    
    setRegistry(initialRegistry);
    setStreamingStates(initialStreamingStates);

    try {
      const requestUrl = `http://localhost:5001/api/generate?projectId=${TEST_PROJECT_ID}&versionId=${TEST_VERSION_ID}`;
      const requestBody = TEST_PROMPTS[testCase];
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Keep loading true until we receive the first event
      let receivedFirstEvent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const event = JSON.parse(line.slice(5));
            
            // Set loading to false after receiving first valid event
            if (!receivedFirstEvent) {
              receivedFirstEvent = true;
              setIsLoading(false);
            }
            
            if (event.type === 'error') {
              setError(event.message || 'Unknown stream error');
              continue;
            }
            
            // Process events and dispatch to SimpleLivePreview
            switch (event.type) {
              case 'content_block_start':
                processComponentStart(event);
                break;

              case 'content_block_delta':
                processComponentDelta(event);
                break;

              case 'content_block_stop':
                processComponentStop(event);
                break;

              case 'message_stop':
                // Dispatch message_stop event
                window.dispatchEvent(new CustomEvent('message_stop', {
                  detail: event
                }));
                break;

              default:
                console.warn('⚠️ Unknown event type:', event.type);
            }
          } catch (error) {
            console.error('❌ Failed to parse SSE data:', error);
            setError(`Failed to parse stream data: ${error.message}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Test error:', error);
      setError(error.message);
    } finally {
      // Only set loading to false if we haven't received any events
      setIsLoading(false);
    }
  };

  // Update createComponentEvents to match generateController.js format
  const createComponentEvents = (componentId, componentName, position, code) => {
    // Add markers if they don't exist
    if (!code.includes('/// START')) {
      code = `/// START ${componentName} position=${position}\n${code}\n/// END ${componentName}`;
    }

    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < code.length; i += chunkSize) {
      chunks.push(code.slice(i, i + chunkSize));
    }

    // Check if this is a compound component
    const isCompound = COMPOUND_COMPONENTS[componentName];
    const isCompoundComplete = isCompound ? 
      Object.values(COMPOUND_COMPONENTS[componentName].subcomponentPatterns)
        .every(pattern => pattern.test(code)) : 
      true;

    return [
      {
        type: 'content_block_start',
        metadata: { 
          componentId, 
          componentName, 
          position,
          isCompoundComplete,
          isCritical: CRITICAL_COMPONENTS.has(componentName)
        }
      },
      ...chunks.map(chunk => ({
        type: 'content_block_delta',
        metadata: { 
          componentId,
          componentName,
          position,
          isCompoundComplete
        },
        delta: { text: chunk }
      })),
      {
        type: 'content_block_stop',
        metadata: { 
          componentId, 
          isComplete: true,
          componentName,
          position,
          isCompoundComplete,
          sections: {
            header: position === 'header' ? [componentId] : [],
            main: position === 'main' ? [componentId] : [],
            footer: position === 'footer' ? [componentId] : []
          }
        }
      }
    ];
  };

  // Update injectComponent to use the new format
  const injectComponent = async (componentId, componentName, position, code) => {
    const events = createComponentEvents(componentId, componentName, position, code);
    
    for (const event of events) {
      switch (event.type) {
        case 'content_block_start':
          processComponentStart(event);
          break;
        case 'content_block_delta':
          processComponentDelta(event);
          break;
        case 'content_block_stop':
          processComponentStop(event);
          break;
      }
      // Small delay between chunks to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  // Update injectAllSequential to handle dependencies properly
  const injectAllSequential = async () => {
    // Clear existing components and states
    const initialRegistry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
    const initialStates = new Map();
    
    setRegistry(initialRegistry);
    setStreamingStates(initialStates);

    // Wait for state updates to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Inject components in order of dependencies
      console.log('Injecting PriceTag...');
      await injectComponent('comp_pricetag', 'PriceTag', 'main', TEST_COMPONENTS.priceTag.code);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Injecting ProductCard...');
      await injectComponent('comp_productcard', 'ProductCard', 'main', TEST_COMPONENTS.productCard.code);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Injecting ProductShowcase...');
      await injectComponent('comp_productshowcase', 'ProductShowcase', 'main', TEST_COMPONENTS.productShowcase.code);
    } catch (error) {
      console.error('Error during sequential injection:', error);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1121]">
      <div className="flex-none p-4 border-b border-slate-700">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Live Preview Test Page</h1>
          <div className="flex gap-4 items-center flex-wrap">
            {/* Product Showcase Test Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => injectAllSequential().catch(console.error)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-colors"
              >
                Load All Sequential
              </button>
            </div>

            <div className="h-8 border-r border-slate-600" />
            
            {/* Existing test buttons */}
            {Object.keys(TEST_PROMPTS).map(testKey => (
              <button
                key={testKey}
                onClick={() => setSelectedTest(testKey)}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  selectedTest === testKey
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                {testKey}
              </button>
            ))}
            
            <button
              onClick={() => runTest(selectedTest)}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 rounded-lg transition-colors ml-auto",
                isLoading
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-slate-800/50 backdrop-blur rounded-lg overflow-hidden shadow-xl">
            <SimpleLivePreview
              registry={registry}
              streamingStates={streamingStates}
              setStreamingStates={setStreamingStates}
              onShowCode={setSelectedComponent}
            />
          </div>

          {/* Code Display Section */}
          {selectedComponent && (
            <div className="mt-8 p-4 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">
                  {selectedComponent.name} Code
                </h2>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  Close
                </button>
              </div>
              <pre className="text-sm bg-slate-900 p-4 rounded overflow-auto max-h-[500px]">
                <code className="text-slate-300">{selectedComponent.code}</code>
              </pre>
              <div className="mt-4 text-sm text-slate-400">
                <p>Position: {selectedComponent.position}</p>
                <p>Layout: {selectedComponent.isLayout ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
} 