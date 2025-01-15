// Mock SSE response data
export const mockSSEResponse = [
  {
    type: 'thought',
    thought: 'Starting component generation. Let me design a modern business website that reflects your brand.'
  },
  {
    type: 'thought',
    thought: 'Design Vision: Creating a clean, professional layout with a hero section that immediately captures attention and a feature grid to showcase key offerings.'
  },
  {
    type: 'thought',
    thought: 'Creating a modern hero section with a gradient background, animated text, and a clear call-to-action.'
  },
  {
    type: 'code',
    code: `/* Component: HeroSection */
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <section className="relative min-h-[600px] bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="container mx-auto px-4 py-20">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-6"
        >
          Transform Your Business
        </motion.h1>
        <p className="text-xl text-white/90 mb-8">
          Elevate your online presence with our innovative solutions
        </p>
        <Button size="lg" variant="secondary">
          Get Started
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;`,
    metadata: { 
      componentName: 'HeroSection',
      dependencies: ['@/components/ui/button', 'framer-motion'],
      hasJSX: true
    },
    isComplete: true
  }
];

// Mock error response
export const mockErrorResponse = [
  {
    type: 'thought',
    thought: 'Starting component generation. Analyzing the requirements...'
  },
  {
    type: 'thought',
    thought: 'I apologize, but I encountered an error while generating the components. This might be due to invalid requirements or a system limitation.'
  }
]; 