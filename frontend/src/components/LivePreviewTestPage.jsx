import React, { useState, useEffect } from 'react';
import SimpleLivePreview from './SimpleLivePreview';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from './ui/navigation-menu';
import { Home, Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
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
import { cn } from '../lib/utils';
import { PriceTag } from './PriceTag';

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
import React from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

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

const TEST_STREAM_EVENTS = [];

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

  // Add a buffer to store code chunks
  const [codeBuffer, setCodeBuffer] = useState(new Map());

  // Update simulateTestStream to handle events directly
  const simulateTestStream = async () => {
    setIsLoading(true);
    try {
      // Reset states
      setRegistry({
        components: new Map(),
        layout: { sections: { header: [], main: [], footer: [] } }
      });
      setStreamingStates(new Map());
      setError(null);

      // Simulate stream with delays
      for (const event of TEST_STREAM_EVENTS) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between events
        
        // Handle events directly based on type
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
            // Handle message stop
            setStreamingStates(prev => {
              const next = new Map(prev);
              Array.from(prev.keys()).forEach(id => {
                next.set(id, { 
                  isStreaming: false, 
                  isComplete: true,
                  error: null 
                });
              });
              return next;
            });
            break;
          default:
            console.warn('Unknown event type:', event.type);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Error in test stream:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
    // Enhanced validation and logging
    console.group('🎬 Processing Component Start');
    console.log('Event:', {
      type: event.type,
      metadata: event.metadata,
      raw: event,
      timestamp: new Date().toISOString()
    });

    // Validate event structure with detailed logging
    if (!event?.metadata?.componentId || !event?.metadata?.componentName) {
      console.error('⚠️ Invalid component_start event - missing required fields:', {
        hasComponentId: Boolean(event?.metadata?.componentId),
        hasComponentName: Boolean(event?.metadata?.componentName),
        metadata: event?.metadata
      });
      console.groupEnd();
      return;
    }

    const componentId = event.metadata.componentId;
    // Ensure we get the full component name and validate it
    const componentName = event.metadata.componentName.trim();
    const position = event.metadata.position || 'main';

    if (componentName.length <= 1) {
      console.warn('⚠️ Suspicious component name (too short):', {
        componentName,
        componentId,
        position
      });
    }

    console.log('📦 Creating Component:', {
      componentId,
      componentName,
      position,
      rawName: event.metadata.componentName,
      fullMetadata: event.metadata,
      timestamp: new Date().toISOString(),
      nameLength: componentName.length,
      hasSpaces: componentName.includes(' '),
      nameFirstChar: componentName.charAt(0),
      nameValidation: /^[A-Z][a-zA-Z0-9]*$/.test(componentName)
    });
    
    // Update registry and streaming states atomically
    setRegistry(prevRegistry => {
      const newComponents = new Map(prevRegistry.components);
      const displayName = componentName.replace(/([A-Z])/g, ' $1').trim();
      
      console.log('🏷️ Component Names:', {
        original: componentName,
        display: displayName,
        id: componentId,
        existingComponents: Array.from(prevRegistry.components.keys())
      });

      newComponents.set(componentId, {
        name: componentName,
        displayName,
        code: '',
        isLayout: componentId === 'root_layout',
        position
      });
      return { ...prevRegistry, components: newComponents };
    });

    setStreamingStates(prevStates => {
      const newStates = new Map(prevStates);
      newStates.set(componentId, {
        isStreaming: true,
        isComplete: false,
        error: null,
        startTime: Date.now(),
        componentName // Store the component name for debugging
      });
      return newStates;
    });

    // Dispatch stream_start event for SimpleLivePreview
    window.dispatchEvent(new CustomEvent('stream_start', {
      detail: {
        ...event,
        metadata: {
          ...event.metadata,
          debug: {
            originalName: event.metadata.componentName,
            processedName: componentName,
            timestamp: Date.now()
          }
        }
      }
    }));
    
    console.groupEnd();
  };

  // Process component delta processing - handle partial declarations
  const processComponentDelta = (event) => {
    console.group('📝 Processing Component Delta');
    
    // Validate event structure with detailed logging
    if (!event?.metadata?.componentId || !event?.delta?.text) {
      console.error('⚠️ Invalid component_delta event:', {
        hasComponentId: Boolean(event?.metadata?.componentId),
        hasText: Boolean(event?.delta?.text),
        event
      });
      console.groupEnd();
      return;
    }

    const componentId = event.metadata.componentId;
    const componentName = event.metadata.componentName?.trim();
    const position = event.metadata.position || 'main';
    const deltaText = event.delta.text;

    // Update code buffer first
    setCodeBuffer(prev => {
      const next = new Map(prev);
      const currentBuffer = next.get(componentId) || '';
      next.set(componentId, currentBuffer + deltaText);
      return next;
    });

    // Update streaming state
    setStreamingStates(prevStates => {
      const newStates = new Map(prevStates);
      const currentState = newStates.get(componentId) || {
        isStreaming: true,
        isComplete: false,
        error: null,
        startTime: Date.now(),
        componentName,
        receivedDeltas: 0
      };
      
      newStates.set(componentId, {
        ...currentState,
        isStreaming: true,
        error: null,
        receivedDeltas: (currentState.receivedDeltas || 0) + 1,
        lastDeltaTime: Date.now()
      });
      
      return newStates;
    });

    window.dispatchEvent(new CustomEvent('stream_delta', {
      detail: {
        ...event,
        metadata: {
          ...event.metadata,
          debug: {
            hasStartMarker: deltaText.includes('/// START'),
            hasEndMarker: deltaText.includes('/// END'),
            textLength: deltaText.length,
            timestamp: Date.now(),
            componentName
          }
        }
      }
    }));

    console.groupEnd();
  };

  // Add processComponentStop handler
  const processComponentStop = (event) => {
    const { componentId, componentName, position } = event.metadata;
    if (!componentId) return;

    // Check if we have buffered code for this component
    setCodeBuffer(prev => {
      const bufferedCode = prev.get(componentId);
      if (bufferedCode) {
        // Clean the buffered code before setting it in the registry
        const cleanBufferedCode = bufferedCode.split('\n').filter(line => !line.trim().startsWith('///')).join('\n');
        setRegistry(prevRegistry => {
          const newComponents = new Map(prevRegistry.components);
          newComponents.set(componentId, {
            name: componentName || `Component_${componentId}`,
            displayName: (componentName || `Component ${componentId}`).replace(/([A-Z])/g, ' $1').trim(),
            code: cleanBufferedCode,
            isLayout: componentId === 'root_layout',
            position: position || 'main'
          });
          return { ...prevRegistry, components: newComponents };
        });

        // Clear the buffer for this component
        const next = new Map(prev);
        next.delete(componentId);
        return next;
      }
      return prev;
    });

    // Update streaming state to complete
    setStreamingStates(prev => {
      const next = new Map(prev);
      next.set(componentId, {
        isStreaming: false,
        isComplete: true,
        error: null
      });
      return next;
    });
  };

  // Simplify runTest to just handle events
  const runTest = async (testCase) => {
    setIsLoading(true);
    setEvents([]);
    setError(null);
    
    // Initialize clean states
    const initialRegistry = {
      components: new Map(),
      layout: { sections: { header: [], main: [], footer: [] } }
    };
    const initialStreamingStates = new Map();
    
    setRegistry(initialRegistry);
    setStreamingStates(initialStreamingStates);

    // Wait for state updates to complete
    await new Promise(resolve => setTimeout(resolve, 0));

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
        throw new Error(`HTTP Error: ${response.status}`);
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
            
            // Process events in order
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
      // Longer delay after PriceTag to ensure it's fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Injecting ProductCard...');
      await injectComponent('comp_productcard', 'ProductCard', 'main', TEST_COMPONENTS.productCard.code);
      // Longer delay after ProductCard to ensure it's fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Injecting ProductShowcase...');
      await injectComponent('comp_productshowcase', 'ProductShowcase', 'main', TEST_COMPONENTS.productShowcase.code);
      // Wait for the last component to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send the final message_stop event
      window.dispatchEvent(new CustomEvent('message_stop', {
        detail: { type: 'message_stop' }
      }));

      // Update the registry sections
      setRegistry(prev => ({
        ...prev,
        layout: {
          sections: {
            header: [],
            main: ['comp_pricetag', 'comp_productcard', 'comp_productshowcase'],
            footer: []
          }
        }
      }));

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
            {/* Add Test Stream Button */}
            <Button
              onClick={simulateTestStream}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              Run Test Stream
            </Button>

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