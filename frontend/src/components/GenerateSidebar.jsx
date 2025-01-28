import React, { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Loader2, Wand2 } from 'lucide-react';

const GenerateSidebar = ({ onSubmit = () => {}, isLoading = false }) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [requirements, setRequirements] = useState('');

  const handleSubmit = () => {
    onSubmit({ prompt, style, requirements });
  };

  return (
    <div className="w-96 h-full bg-slate-900 p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">Website Generator</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-200">About Your Business</label>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Tell us about your business..."
            className="mt-2"
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm text-slate-200">Brand Style</label>
          <Textarea
            value={style}
            onChange={e => setStyle(e.target.value)}
            placeholder="How do you want customers to feel..."
            className="mt-2"
            rows={2}
          />
        </div>

        <div>
          <label className="text-sm text-slate-200">Key Features</label>
          <Textarea
            value={requirements}
            onChange={e => setRequirements(e.target.value)}
            placeholder="What does your website need to do..."
            className="mt-2"
            rows={2}
          />
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={isLoading || !prompt?.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Website
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default GenerateSidebar; 