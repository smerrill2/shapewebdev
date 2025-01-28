import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Button } from './components/ui/button';
import SimpleLivePreview from './components/SimpleLivePreview';
import GeneratePage from './pages/GeneratePage';
import { Card, Input, Label } from './components/ui';
import * as LucideIcons from 'lucide-react';
import LivePreviewTestPage from './components/LivePreviewTestPage';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">ShapeWeb</Link>
          <div className="space-x-4">
            <Link to="/preview">
              <Button variant="ghost" className="text-white">Live Preview</Button>
            </Link>
            <Link to="/generate">
              <Button variant="ghost" className="text-white">Generate</Button>
            </Link>
            <Link to="/test">
              <Button variant="ghost" className="text-white">Test Page</Button>
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<GeneratePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/test" element={<LivePreviewTestPage />} />
          <Route path="/preview" element={
            <div className="p-6 bg-[#0B1121] min-h-screen">
              <div className="max-w-4xl mx-auto">
                <div className="rounded-lg overflow-hidden shadow-2xl">
                  <SimpleLivePreview 
                    registry={{
                      components: new Map([
                        ['Navigation', {
                          name: 'Navigation',
                          code: `
                            function Navigation() {
                              const [isMenuOpen, setIsMenuOpen] = React.useState(false);
                              
                              return (
                                <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
                                  <div className="container mx-auto px-6 py-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        <LucideIcons.Shapes className="h-8 w-8 text-purple-400" />
                                        <span className="ml-3 text-xl font-bold text-white">ShapeWeb</span>
                                      </div>
                                      
                                      {/* Mobile menu button */}
                                      <Button
                                        variant="ghost"
                                        className="md:hidden"
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                      >
                                        {isMenuOpen ? 
                                          <LucideIcons.X className="h-6 w-6" /> : 
                                          <LucideIcons.Menu className="h-6 w-6" />
                                        }
                                      </Button>
                                      
                                      {/* Desktop menu */}
                                      <div className="hidden md:flex space-x-8">
                                        <Button variant="ghost" className="text-white hover:text-purple-400">Features</Button>
                                        <Button variant="ghost" className="text-white hover:text-purple-400">Pricing</Button>
                                        <Button variant="ghost" className="text-white hover:text-purple-400">About</Button>
                                        <Button variant="default" className="bg-purple-600 hover:bg-purple-700">Get Started</Button>
                                      </div>
                                    </div>
                                    
                                    {/* Mobile menu */}
                                    {isMenuOpen && (
                                      <div className="md:hidden mt-4 space-y-2">
                                        <Button variant="ghost" className="w-full text-white hover:text-purple-400">Features</Button>
                                        <Button variant="ghost" className="w-full text-white hover:text-purple-400">Pricing</Button>
                                        <Button variant="ghost" className="w-full text-white hover:text-purple-400">About</Button>
                                        <Button variant="default" className="w-full bg-purple-600 hover:bg-purple-700">Get Started</Button>
                                      </div>
                                    )}
                                  </div>
                                </nav>
                              );
                            }
                          `,
                          isComplete: true
                        }],
                        ['HeroSection', {
                          name: 'HeroSection',
                          code: `
                            function HeroSection() {
                              const [email, setEmail] = React.useState('');
                              const [status, setStatus] = React.useState('');
                              
                              const handleSubmit = (e) => {
                                e.preventDefault();
                                setStatus('Thanks for subscribing!');
                                setEmail('');
                                setTimeout(() => setStatus(''), 3000);
                              };
                              
                              return (
                                <div className="py-20 px-6 text-center relative overflow-hidden">
                                  {/* Background gradient */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-blue-800/20 pointer-events-none" />
                                  
                                  <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                                    Build Your Next Idea <br />
                                    <span className="text-purple-400">Faster Than Ever</span>
                                  </h1>
                                  
                                  <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
                                    Experience the future of web development with AI-powered 
                                    components and real-time previews.
                                  </p>
                                  
                                  <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
                                    <Input
                                      type="email"
                                      placeholder="Enter your email"
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      className="flex-1"
                                      required
                                    />
                                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                                      Get Early Access
                                    </Button>
                                  </form>
                                  
                                  {status && (
                                    <p className="mt-4 text-green-400 animate-fade-in">
                                      {status}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                          `,
                          isComplete: true
                        }],
                        ['FeatureGrid', {
                          name: 'FeatureGrid',
                          code: `
                            function FeatureGrid() {
                              const features = [
                                {
                                  icon: 'Zap',
                                  title: 'Lightning Fast',
                                  description: 'Generate complete components in seconds with AI assistance.'
                                },
                                {
                                  icon: 'Code',
                                  title: 'Live Preview',
                                  description: 'See your changes instantly with our real-time preview.'
                                },
                                {
                                  icon: 'Palette',
                                  title: 'Beautiful Design',
                                  description: 'Professionally designed components that look great out of the box.'
                                }
                              ];
                              
                              return (
                                <div className="py-16 px-6">
                                  <div className="max-w-6xl mx-auto">
                                    <div className="grid md:grid-cols-3 gap-8">
                                      {features.map((feature, index) => {
                                        const Icon = LucideIcons[feature.icon];
                                        return (
                                          <Card key={index} className="p-6 bg-slate-800/50 border-slate-700 hover:border-purple-500 transition-colors">
                                            <div className="h-12 w-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-4">
                                              <Icon className="h-6 w-6 text-purple-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">
                                              {feature.title}
                                            </h3>
                                            <p className="text-purple-200">
                                              {feature.description}
                                            </p>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          `,
                          isComplete: true
                        }],
                        ['ContactForm', {
                          name: 'ContactForm',
                          code: `
                            function ContactForm() {
                              const [formData, setFormData] = React.useState({
                                name: '',
                                email: '',
                                message: ''
                              });
                              const [status, setStatus] = React.useState('');
                              
                              const handleSubmit = (e) => {
                                e.preventDefault();
                                setStatus('Message sent! We\'ll get back to you soon.');
                                setFormData({ name: '', email: '', message: '' });
                                setTimeout(() => setStatus(''), 3000);
                              };
                              
                              const handleChange = (e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  [e.target.name]: e.target.value
                                }));
                              };
                              
                              return (
                                <div className="py-16 px-6">
                                  <Card className="max-w-xl mx-auto p-8 bg-slate-800/50 border-slate-700">
                                    <h2 className="text-3xl font-bold text-white mb-6 text-center">
                                      Get in Touch
                                    </h2>
                                    
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                      <div>
                                        <Label htmlFor="name" className="text-white">Name</Label>
                                        <Input
                                          id="name"
                                          name="name"
                                          value={formData.name}
                                          onChange={handleChange}
                                          className="mt-1"
                                          required
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor="email" className="text-white">Email</Label>
                                        <Input
                                          id="email"
                                          name="email"
                                          type="email"
                                          value={formData.email}
                                          onChange={handleChange}
                                          className="mt-1"
                                          required
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor="message" className="text-white">Message</Label>
                                        <textarea
                                          id="message"
                                          name="message"
                                          value={formData.message}
                                          onChange={handleChange}
                                          className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white"
                                          rows={4}
                                          required
                                        />
                                      </div>
                                      
                                      <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                                        Send Message
                                      </Button>
                                    </form>
                                    
                                    {status && (
                                      <p className="mt-4 text-green-400 text-center animate-fade-in">
                                        {status}
                                      </p>
                                    )}
                                  </Card>
                                </div>
                              );
                            }
                          `,
                          isComplete: true
                        }]
                      ]),
                      layout: {
                        sections: {
                          header: ['Navigation'],
                          main: ['HeroSection', 'FeatureGrid', 'ContactForm'],
                          footer: []
                        }
                      }
                    }}
                    streamingStates={new Map([
                      ['Navigation', { isStreaming: false, isComplete: true }],
                      ['HeroSection', { isStreaming: false, isComplete: true }],
                      ['FeatureGrid', { isStreaming: false, isComplete: true }],
                      ['ContactForm', { isStreaming: false, isComplete: true }]
                    ])}
                  />
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 