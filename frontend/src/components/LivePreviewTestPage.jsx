import React, { useState, useEffect } from 'react';
import SimpleLivePreview from './SimpleLivePreview';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from './ui/navigation-menu';
import { Home, Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { cn } from './utils/cn';

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

// Test stream scenarios
const TEST_STREAMS = {
  // Simple button component stream
  simpleButton: [
    {
      type: 'message_start',
      message: {
        id: 'msg_simple_button',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        content: []
      }
    },
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_button',
        componentName: 'SimpleButton',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_button',
        componentName: 'SimpleButton',
        position: 'main'
      },
      delta: {
        text: `/// START SimpleButton position=main
import React from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function SimpleButton() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Simple Button Test</h2>
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => setCount(prev => prev + 1)}
          className={cn(
            "transition-all",
            count > 5 && "bg-green-500 hover:bg-green-600"
          )}
        >
          Clicked {count} times
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setCount(0)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
/// END SimpleButton`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_button',
        componentName: 'SimpleButton',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'message_stop'
    }
  ],

  // Complex dashboard stream
  dashboard: [
    {
      type: 'message_start',
      message: {
        id: 'msg_dashboard',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        content: []
      }
    },
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_dashboard',
        componentName: 'InteractiveDashboard',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_dashboard',
        componentName: 'InteractiveDashboard',
        position: 'main'
      },
      delta: {
        text: `/// START InteractiveDashboard position=main
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export function InteractiveDashboard() {
  const [activeTab, setActiveTab] = React.useState('overview');
  
  const data = {
    users: { total: 2478, trend: '+12%', description: 'Active users this month' },
    revenue: { total: '$45,231', trend: '+8%', description: 'Revenue this quarter' },
    growth: { total: '23%', trend: '+2.5%', description: 'Growth rate year over year' },
    engagement: { total: '87%', trend: '+5%', description: 'Average engagement score' }
  };

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.users.total}</div>
              <span className="text-green-500 text-sm">{data.users.trend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.users.description}</p>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.revenue.total}</div>
              <span className="text-green-500 text-sm">{data.revenue.trend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.revenue.description}</p>
          </CardContent>
        </Card>

        {/* Growth Card */}
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.growth.total}</div>
              <span className="text-green-500 text-sm">{data.growth.trend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.growth.description}</p>
          </CardContent>
        </Card>

        {/* Engagement Card */}
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.engagement.total}</div>
              <span className="text-green-500 text-sm">{data.engagement.trend}</span>
            </div>
            <p className="text-xs text-muted-foreground">{data.engagement.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2">
        {['overview', 'analytics', 'reports', 'notifications'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'capitalize',
              activeTab === tab && 'bg-primary text-primary-foreground'
            )}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 border rounded-lg">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Overview</h3>
            <p>View a summary of your dashboard metrics and key performance indicators.</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p>Detailed analytics and data visualization of your metrics.</p>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reports</h3>
            <p>Generate and view reports based on your dashboard data.</p>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <p>View and manage your dashboard notifications and alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
/// END InteractiveDashboard`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_dashboard',
        componentName: 'InteractiveDashboard',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'message_stop'
    }
  ],

  // Stream with syntax error
  syntaxError: [
    {
      type: 'message_start',
      message: {
        id: 'msg_error',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        content: []
      }
    },
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_error',
        componentName: 'ErrorComponent',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_error',
        componentName: 'ErrorComponent',
        position: 'main'
      },
      delta: {
        text: `/// START ErrorComponent position=main
import React from 'react';
import { Button } from './ui/button';

export function ErrorComponent() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Error Test</h2>
      {/* Syntax error: missing closing tag */}
      <div className="flex items-center gap-4">
        <Button onClick={() => setCount(prev => prev + 1)>
          Count: {count}
        </Button>
      </div>
    </div>
  );
}
/// END ErrorComponent`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_error',
        componentName: 'ErrorComponent',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'message_stop'
    }
  ],

  // Multiple components stream
  multiComponent: [
    {
      type: 'message_start',
      message: {
        id: 'msg_multi',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        content: []
      }
    },
    // Header component
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_header',
        componentName: 'Header',
        position: 'header',
        isCompoundComplete: true,
        isCritical: true
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_header',
        componentName: 'Header',
        position: 'header'
      },
      delta: {
        text: `/// START Header position=header
import React from 'react';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="border-b p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Multi-Component Test</h1>
        <Button variant="outline">Menu</Button>
      </div>
    </header>
  );
}
/// END Header`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_header',
        componentName: 'Header',
        position: 'header',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: true
      }
    },
    // Content component
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_content',
        componentName: 'Content',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_content',
        componentName: 'Content',
        position: 'main'
      },
      delta: {
        text: `/// START Content position=main
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export function Content() {
  return (
    <div className="p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Section 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the first section of content.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Section 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the second section of content.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
/// END Content`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_content',
        componentName: 'Content',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'message_stop'
    }
  ],

  // Add new landing page stream
  landingPage: [
    {
      type: 'message_start',
      message: {
        id: 'msg_landing',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        content: []
      }
    },
    // Navbar Component
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_navbar',
        componentName: 'Navbar',
        position: 'header',
        isCompoundComplete: true,
        isCritical: true
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_navbar',
        componentName: 'Navbar',
        position: 'header'
      },
      delta: {
        text: `/// START Navbar position=header
import React from 'react';
import { Button } from './ui/button';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from './ui/navigation-menu';
import { cn } from '../lib/utils';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">SuperApp</span>
          </a>
        </div>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="#features">Features</NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#pricing">Pricing</NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#testimonials">Testimonials</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost">Log in</Button>
          <Button>Sign up</Button>
        </div>
      </div>
    </header>
  );
}
/// END Navbar`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_navbar',
        componentName: 'Navbar',
        position: 'header',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: true
      }
    },
    // Hero Section
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_herosection',
        componentName: 'HeroSection',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_herosection',
        componentName: 'HeroSection',
        position: 'main'
      },
      delta: {
        text: `/// START HeroSection position=main
import React from 'react';
import { Button } from './ui/button';
import { Placeholder } from './ui/placeholder';
import { cn } from '../lib/utils';

export function HeroSection() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 z-0" />
      <div className="container relative z-10 py-24 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-fade-up">
              Transform Your Workflow with SuperApp
            </h1>
            <p className="text-xl text-muted-foreground animate-fade-up [animation-delay:200ms]">
              Boost productivity and streamline your processes with our all-in-one platform.
              Experience the future of work today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up [animation-delay:400ms]">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600">
                Get Started Free
              </Button>
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </div>
            <div className="pt-4 animate-fade-up [animation-delay:600ms]">
              <p className="text-sm text-muted-foreground">
                🚀 Trusted by over 10,000+ companies worldwide
              </p>
            </div>
          </div>
          <div className="relative animate-fade-left [animation-delay:800ms]">
            <div className="absolute -inset-4 bg-gradient-to-br from-purple-500 to-blue-500 opacity-20 blur-2xl rounded-xl" />
            <div className="relative">
              <Placeholder.Image
                width="600px"
                height="400px"
                label="Dashboard Preview"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/// END HeroSection`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_herosection',
        componentName: 'HeroSection',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    // Features Section
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_featuressection',
        componentName: 'FeaturesSection',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_featuressection',
        componentName: 'FeaturesSection',
        position: 'main'
      },
      delta: {
        text: `/// START FeaturesSection position=main
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Icons } from './ui/icons';
import { cn } from '../lib/utils';

export function FeaturesSection() {
  const features = [
    {
      icon: <Icons.Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Experience blazing fast performance with our optimized platform."
    },
    {
      icon: <Icons.Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Bank-grade security to keep your data safe and protected."
    },
    {
      icon: <Icons.Sparkles className="w-6 h-6" />,
      title: "AI-Powered",
      description: "Smart automation and insights powered by cutting-edge AI."
    },
    {
      icon: <Icons.Users className="w-6 h-6" />,
      title: "Team Collaboration",
      description: "Work together seamlessly with real-time collaboration tools."
    }
  ];

  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Packed with Powerful Features
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to take your productivity to the next level.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative">
                <div className="mb-4 inline-block p-3 rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
/// END FeaturesSection`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_featuressection',
        componentName: 'FeaturesSection',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    // Testimonials Section
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_testimonialssection',
        componentName: 'TestimonialsSection',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_testimonialssection',
        componentName: 'TestimonialsSection',
        position: 'main'
      },
      delta: {
        text: `/// START TestimonialsSection position=main
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Placeholder } from './ui/placeholder';
import { Icons } from './ui/icons';
import { cn } from '../lib/utils';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "SuperApp has completely transformed how our team works. The productivity gains are incredible!",
      author: "Sarah Johnson",
      role: "CEO at TechCorp",
      rating: 5
    },
    {
      quote: "The AI features are mind-blowing. It's like having a personal assistant that never sleeps.",
      author: "Michael Chen",
      role: "Product Manager at InnovateCo",
      rating: 5
    },
    {
      quote: "Best investment we've made this year. The ROI was visible within the first month.",
      author: "Emma Williams",
      role: "Director at GrowthLabs",
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="py-24">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Loved by Teams Worldwide
          </h2>
          <p className="text-lg text-muted-foreground">
            Don't just take our word for it. Here's what our customers have to say.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <div className="absolute -top-4 left-6">
                  <div className="inline-block p-3 rounded-xl bg-primary text-primary-foreground">
                    <Icons.Quote className="w-6 h-6" />
                  </div>
                </div>
                <div className="mb-4 flex">
                  {Array(testimonial.rating).fill(null).map((_, i) => (
                    <Icons.Star key={i} className="w-5 h-5 text-yellow-500" />
                  ))}
                </div>
                <blockquote className="text-lg mb-6">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-4">
                  <Placeholder.Avatar size="48px" label={testimonial.author} />
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
/// END TestimonialsSection`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_testimonialssection',
        componentName: 'TestimonialsSection',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    // CTA Section
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_ctasection',
        componentName: 'CTASection',
        position: 'main',
        isCompoundComplete: true,
        isCritical: false
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_ctasection',
        componentName: 'CTASection',
        position: 'main'
      },
      delta: {
        text: `/// START CTASection position=main
import React from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-transparent to-blue-500/30 z-0" />
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 animate-fade-up">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 animate-fade-up [animation-delay:200ms]">
            Join thousands of satisfied teams who have already made the switch.
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up [animation-delay:400ms]">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline">
              Schedule Demo
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground animate-fade-up [animation-delay:600ms]">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
/// END CTASection`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_ctasection',
        componentName: 'CTASection',
        position: 'main',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: false
      }
    },
    // Footer
    {
      type: 'content_block_start',
      metadata: {
        componentId: 'comp_footer',
        componentName: 'Footer',
        position: 'footer',
        isCompoundComplete: true,
        isCritical: true
      }
    },
    {
      type: 'content_block_delta',
      metadata: {
        componentId: 'comp_footer',
        componentName: 'Footer',
        position: 'footer'
      },
      delta: {
        text: `/// START Footer position=footer
import React from 'react';
import { Icons } from './ui/icons';

export function Footer() {
  return (
    <footer className="border-t py-12 bg-slate-50 dark:bg-slate-900">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Features</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Testimonials</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Careers</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Documentation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Help Center</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">API Reference</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground">Status</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Icons.Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Icons.Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <Icons.Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-muted-foreground">
          <p>&copy; 2024 SuperApp. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
/// END Footer`
      }
    },
    {
      type: 'content_block_stop',
      metadata: {
        componentId: 'comp_footer',
        componentName: 'Footer',
        position: 'footer',
        isComplete: true,
        isCompoundComplete: true,
        isCritical: true
      }
    },
    {
      type: 'message_stop'
    }
  ]
};

export function LivePreviewTestPage() {
  const [selectedTest, setSelectedTest] = useState('singleComponent');
  const [registry, setRegistry] = useState(new Map());
  const [streamingStates, setStreamingStates] = useState(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  console.log('LivePreviewTestPage rendered');

  useEffect(() => {
    const handleStreamDelta = (event) => {
      const { type, metadata, delta } = event.detail;
      const { componentId, componentName, position } = metadata;

      if (type === 'content_block_start') {
        console.log('content_block_start event received:', metadata);
        setIsStreaming(true);
        setStreamingStates(prev => {
          const next = new Map(prev);
          next.set(componentId, { isStreaming: true });
          return next;
        });
        setRegistry(prev => {
          const next = new Map(prev);
          next.set(componentId, {
            name: componentName,
            position,
            code: ''
          });
          return next;
        });
      } else if (type === 'content_block_delta' && delta?.text) {
        console.log('content_block_delta event received:', metadata, delta);
        setRegistry(prev => {
          const next = new Map(prev);
          const component = next.get(componentId) || { name: componentName, position, code: '' };
          next.set(componentId, {
            ...component,
            code: component.code + delta.text
          });
          return next;
        });
      } else if (type === 'content_block_stop') {
        console.log('content_block_stop event received:', metadata);
        setStreamingStates(prev => {
          const next = new Map(prev);
          next.set(componentId, { isStreaming: false });
          return next;
        });
      }
    };

    window.addEventListener('stream_delta', handleStreamDelta);
    return () => {
      window.removeEventListener('stream_delta', handleStreamDelta);
    };
  }, []);

  useEffect(() => {
    console.log('LivePreviewTestPage - registry updated:', registry);
  }, [registry]);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div>
        <div>
          <div>Live Preview Test Page</div>
          <div>Test different component streaming scenarios</div>
        </div>
        <div>
          <div className="space-y-4">
            <div className="flex gap-4">
              {Object.keys(TEST_PROMPTS).map(key => (
                <Button
                  key={key}
                  variant={key === 'singleComponent' ? 'default' : 'outline'}
                >
                  {key}
                </Button>
              ))}
            </div>
            <div data-testid="live-preview">
              <SimpleLivePreview 
                registry={{ components: registry }}
                streamingStates={streamingStates}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePreviewTestPage; 