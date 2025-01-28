// Mock data for simulating AI responses
export const mockComponent = `
/// START styles
const sharedStyles = {
  background: 'from-slate-900 via-purple-900 to-slate-900',
  accent: 'from-indigo-500 via-purple-500 to-pink-500',
  hover: 'from-indigo-600 via-purple-600 to-pink-600',
  text: 'from-indigo-200 via-purple-200 to-pink-200',
  card: 'bg-gradient-to-b from-slate-800/50 to-purple-900/30 border-purple-500/20',
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
};
/// END styles

/// START Navigation position=header
export function Navigation() {
  return (
    <nav className="p-4 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50 border-b border-purple-500/20">
      <div className={sharedStyles.container + " flex justify-between items-center"}>
        <div className="text-2xl font-bold bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
          Web3 SaaS
        </div>
        <div className="space-x-4">
          <Button variant="ghost" className="text-white hover:text-purple-200">
            Sign In
          </Button>
          <Button className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600">
            Get Started <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
/// END Navigation

/// START HeroSection position=main
export function HeroSection() {
  const message = "We'll help you succeed"; // Example of proper quote usage
  const title = 'Build Web3 Apps Fast';     // Example of simple string

  return (
    <div className={sharedStyles.container + " py-20 text-center"}>
      <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
        {message}
      </p>
      <div className="space-y-4 sm:space-y-0 sm:space-x-4">
        <Button className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600" size="lg">
          Get Started
        </Button>
        <Button variant="outline" className="border-purple-500/20 text-white hover:bg-purple-500/10">
          Learn More <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
/// END HeroSection

/// START FeaturesSection position=main
export function FeaturesSection() {
  const features = [
    {
      title: 'Lightning Fast',
      description: "You'll love our speed",
      icon: 'Zap'
    },
    {
      title: 'Enterprise Security',
      description: 'Bank-grade security protocols',
      icon: 'Shield'
    },
    {
      title: 'Real-time Analytics',
      description: "We're processing your data 24/7",
      icon: 'BarChart'
    }
  ];

  return (
    <div className={sharedStyles.container + " py-20"}>
      <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
        Why Choose Us
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const Icon = Icons[feature.icon];
          return (
            <Card key={index} className={sharedStyles.card + " p-6 backdrop-blur-sm"}>
              <div className="rounded-full w-12 h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                {feature.title}
              </h3>
              <p className="text-gray-300">
                {feature.description}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
/// END FeaturesSection

/// START CTASection position=main
export function CTASection() {
  return (
    <div className={sharedStyles.container + " py-20"}>
      <Card className={sharedStyles.card + " p-8 backdrop-blur-sm"}>
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Ready to Get Started?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join thousands of developers building the future of Web3. Start your journey today!
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-slate-800/50 border-purple-500/20 max-w-xs"
            />
            <Button className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600">
              Get Early Access
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
/// END CTASection

/// START Footer position=footer
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-purple-500/20 py-12 backdrop-blur-sm bg-slate-900/50">
      <div className={sharedStyles.container}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Web3 SaaS
            </h3>
            <p className="text-gray-400">
              Building the future of decentralized applications.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Features</li>
              <li>Pricing</li>
              <li>Documentation</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li>About</li>
              <li>Blog</li>
              <li>Careers</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Connect</h4>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Icons.Github className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Icons.Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Icons.Linkedin className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-purple-500/20 text-center text-gray-400">
          © {year} Web3 SaaS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
/// END Footer

/// START RootLayout position=root
export default function RootLayout() {
  return (
    <div className={\`min-h-screen bg-gradient-to-b \${sharedStyles.background}\`}>
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
/// END RootLayout
`;

// Mock SSE responses that match the format from generateController.js
const mockAIResponses = [
  { type: 'message_start' },
  { type: 'thought', text: "Let's start with the shared styles." },
  { 
    type: 'jsx_chunk',
    componentName: 'styles',
    code: mockComponent.match(/\/\/\/ START styles([\s\S]*?)\/\/\/ END styles/)[1],
    isComplete: true
  },
  { type: 'thought', text: "Now, let's create the Navigation component." },
  {
    type: 'jsx_chunk',
    componentName: 'Navigation',
    code: mockComponent.match(/\/\/\/ START Navigation([\s\S]*?)\/\/\/ END Navigation/)[1],
    isComplete: true,
    position: 'header'
  },
  { type: 'thought', text: "Creating the hero section for maximum impact." },
  {
    type: 'jsx_chunk',
    componentName: 'HeroSection',
    code: mockComponent.match(/\/\/\/ START HeroSection([\s\S]*?)\/\/\/ END HeroSection/)[1],
    isComplete: true,
    position: 'main'
  },
  { type: 'thought', text: "Adding a features section to showcase benefits." },
  {
    type: 'jsx_chunk',
    componentName: 'FeaturesSection',
    code: mockComponent.match(/\/\/\/ START FeaturesSection([\s\S]*?)\/\/\/ END FeaturesSection/)[1],
    isComplete: true,
    position: 'main'
  },
  { type: 'thought', text: "Finally, composing everything in the root layout." },
  {
    type: 'jsx_chunk',
    componentName: 'RootLayout',
    code: mockComponent.match(/\/\/\/ START RootLayout([\s\S]*?)\/\/\/ END RootLayout/)[1],
    isComplete: true,
    position: 'root'
  },
  { type: 'message_stop' }
];

// Simulate the streaming of component chunks
async function* generateMockStream() {
  yield { connected: true };
  
  for (const response of mockAIResponses) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    yield response;
  }
}

export async function mockGenerateRequest(data) {
  console.log('Mock generator received:', data);
  return generateMockStream();
} 