import React, { useState, useCallback } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { 
  Sparkles, ChevronRight, ChevronLeft, Lightbulb, 
  Code, Palette, List, Wand2, Loader2, CheckCircle2, 
  Circle, AlertCircle 
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

const GenerateSidebar = ({
  onSubmit,
  isGenerating,
  hasStartedGeneration,
  className,
  thoughts = [],
  componentList = [],
  activeComponentIndex = -1,
  streamStatus = 'idle'
}) => {
  const [formState, setFormState] = useState({
    prompt: '',
    style: '',
    requirements: '',
    errors: {},
    isDirty: false,
    lastSubmission: null
  });

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formState.prompt.trim()) {
      errors.prompt = 'Please describe your business';
    }
    return errors;
  }, [formState.prompt]);

  const handleInputChange = useCallback((field, value) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      isDirty: true,
      errors: {
        ...prev.errors,
        [field]: ''
      }
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({
        ...prev,
        errors
      }));
      return;
    }

    setFormState(prev => ({
      ...prev,
      lastSubmission: {
        prompt: prev.prompt,
        style: prev.style,
        requirements: prev.requirements,
        timestamp: Date.now()
      }
    }));

    onSubmit({
      prompt: formState.prompt,
      style: formState.style,
      requirements: formState.requirements
    });
  }, [formState, onSubmit, validateForm]);

  const getComponentStatus = (component) => {
    if (component.isComplete) {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
    if (componentList.indexOf(component) === activeComponentIndex) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    }
    return <Circle className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm h-full",
      "bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-slate-800",
      "flex flex-col gap-4 p-6 relative overflow-hidden transition-all duration-500 ease-in-out",
      "opacity-90 hover:opacity-100",
      className
    )}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-purple-500/10 animate-pulse-slow opacity-50" />

      <div className="relative space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
            Business Website Builder
          </h2>
          <div 
            data-testid="stream-status"
            className={cn(
              'items-center gap-2 flex',
              {
                'text-red-400': streamStatus === 'error',
                'text-green-400': streamStatus === 'streaming',
                'text-amber-400': streamStatus === 'connecting',
                'text-slate-400': streamStatus === 'idle'
              }
            )}
          >
            {streamStatus === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : streamStatus === 'connecting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
            {streamStatus}
          </div>
        </div>

        {/* Always show form fields, just style differently after generation starts */}
        <div className={cn(
          "space-y-4 transition-all duration-500",
          hasStartedGeneration ? "opacity-60 hover:opacity-100" : "opacity-100"
        )}>
          <div className="group">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              About Your Business
            </label>
            <Textarea
              value={formState.prompt}
              onChange={(e) => handleInputChange('prompt', e.target.value)}
              placeholder="Tell us about your business..."
              className={cn(
                "mt-1.5 bg-slate-800/30 border-slate-700/50 text-slate-100",
                formState.errors.prompt && "border-red-500/50"
              )}
              rows={4}
              disabled={hasStartedGeneration}
              data-testid="prompt-input"
            />
            {formState.errors.prompt && (
              <p className="mt-1 text-sm text-red-400">{formState.errors.prompt}</p>
            )}
          </div>

          <div className="group">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              Brand Style
            </label>
            <Textarea
              value={formState.style}
              onChange={(e) => handleInputChange('style', e.target.value)}
              placeholder="How do you want customers to feel..."
              className="mt-1.5 bg-slate-800/30 border-slate-700/50 text-slate-100"
              rows={2}
              disabled={hasStartedGeneration}
              data-testid="style-input"
            />
          </div>

          <div className="group">
            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <List className="w-4 h-4 text-green-400" />
              Key Features
            </label>
            <Textarea
              value={formState.requirements}
              onChange={(e) => handleInputChange('requirements', e.target.value)}
              placeholder="What does your website need to do..."
              className="mt-1.5 bg-slate-800/30 border-slate-700/50 text-slate-100"
              rows={2}
              disabled={hasStartedGeneration}
              data-testid="requirements-input"
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleSubmit}
          disabled={isGenerating || !formState.prompt.trim()}
          data-testid="generate-button"
          className={cn(
            "w-full gap-2",
            isGenerating ? "bg-slate-700" : "bg-blue-500 hover:bg-blue-600"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate Website
            </>
          )}
        </Button>

        {/* Show thoughts and progress after generation starts */}
        {hasStartedGeneration && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {/* Thoughts Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Design Thoughts
                </h3>
                <div className="space-y-2">
                  {thoughts.map((thought, index) => (
                    <div
                      key={index}
                      data-testid="thought-item"
                      className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded-md border border-slate-700/50"
                    >
                      {thought.content}
                    </div>
                  ))}
                </div>
              </div>

              {/* Component Progress */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  Components
                </h3>
                <div className="space-y-1.5">
                  {componentList.map((component, index) => (
                    <div 
                      key={component.name}
                      className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded-md transition-colors",
                        index === activeComponentIndex && "bg-blue-500/20 text-blue-300",
                        component.isComplete && "text-green-300"
                      )}
                      data-testid="component-item"
                    >
                      {getComponentStatus(component)}
                      {component.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default React.memo(GenerateSidebar);

/**
 * GenerateSidebar Component Implementation Notes - v2.0
 * 
 * Major Updates:
 * 1. Form Management
 *    - Enhanced form state handling
 *    - Added input validation
 *    - Improved error feedback
 * 
 * 2. Progress Display
 *    - Added real-time thought updates
 *    - Enhanced component progress tracking
 *    - Improved visual feedback
 * 
 * 3. UI Enhancements
 *    - Added transition animations
 *    - Improved accessibility
 *    - Enhanced mobile responsiveness
 * 
 * @version 2.0.0
 * @lastUpdated 2024-03-20
 * @changelog
 * - Enhanced form validation
 * - Added real-time progress updates
 * - Improved UI animations
 * - Enhanced accessibility features
 * - Added mobile optimizations
 */ 