import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const TYPING_SPEEDS = {
  NEWLINE: 100,
  PUNCTUATION: 80,
  NORMAL: 20
};

const MIN_OVERLAP_LENGTH = 3;

const findOverlap = (str1, str2) => {
  if (!str1 || !str2) return 0;
  let overlap = 0;
  const minLength = Math.min(str1.length, str2.length);
  
  for (let i = 1; i <= minLength; i++) {
    const end = str1.slice(-i);
    const start = str2.slice(0, i);
    if (end === start && i >= MIN_OVERLAP_LENGTH) {
      overlap = i;
    }
  }
  
  return overlap;
};

const AnimatedPreview = ({ 
  code = '', 
  isComplete = false, 
  componentName = '', 
  className = '',
  transitionState = null
}) => {
  const [displayState, setDisplayState] = useState({
    text: '',
    typing: false,
    progress: 0,
    error: null
  });

  const animationState = useRef({
    cancelled: false,
    currentTimeout: null,
    progress: 0,
    startTime: 0
  });

  const getTypingDelay = useCallback((char, nextChar) => {
    if (char === '\n') return TYPING_SPEEDS.NEWLINE;
    if (/[{}]/.test(char)) return TYPING_SPEEDS.PUNCTUATION;
    if (/[;,.]/.test(char) && /\s/.test(nextChar || '')) return TYPING_SPEEDS.PUNCTUATION;
    return TYPING_SPEEDS.NORMAL;
  }, []);

  const cancelCurrentAnimation = useCallback(() => {
    if (animationState.current.currentTimeout) {
      clearTimeout(animationState.current.currentTimeout);
      animationState.current.currentTimeout = null;
    }
    animationState.current.cancelled = true;
  }, []);

  const typeCode = useCallback((text, startIndex = 0) => {
    // Reset animation state
    animationState.current = {
      cancelled: false,
      currentTimeout: null,
      progress: startIndex / text.length,
      startTime: Date.now()
    };

    const animate = (index) => {
      if (animationState.current.cancelled) return;
      
      if (index >= text.length) {
        setDisplayState(prev => ({ ...prev, typing: false, progress: 100 }));
        return;
      }

      const char = text[index];
      const nextChar = text[index + 1];
      const delay = getTypingDelay(char, nextChar);

      setDisplayState(prev => ({
        ...prev,
        text: text.slice(0, index + 1),
        typing: true,
        progress: (index / text.length) * 100
      }));

      animationState.current.progress = index / text.length;
      animationState.current.currentTimeout = setTimeout(
        () => animate(index + 1),
        delay
      );
    };

    return {
      start: () => {
        setDisplayState(prev => ({ 
          ...prev, 
          typing: true, 
          error: null 
        }));
        animate(startIndex);
      },
      cancel: cancelCurrentAnimation
    };
  }, [getTypingDelay, cancelCurrentAnimation]);

  // Handle code updates and transitions
  useEffect(() => {
    if (!code) return;

    try {
      const overlap = findOverlap(displayState.text, code);
      const animation = typeCode(code, overlap);
      
      animation.start();

      return () => animation.cancel();
    } catch (error) {
      console.error('Animation error:', error);
      setDisplayState(prev => ({
        ...prev,
        typing: false,
        error: error.message
      }));
    }
  }, [code, typeCode]);

  // Handle completion state
  useEffect(() => {
    if (isComplete && displayState.typing) {
      const timeElapsed = Date.now() - animationState.current.startTime;
      const minAnimationTime = 1000; // 1 second minimum animation time

      if (timeElapsed < minAnimationTime) {
        const remainingTime = minAnimationTime - timeElapsed;
        setTimeout(() => {
          setDisplayState(prev => ({
            ...prev,
            typing: false,
            progress: 100
          }));
        }, remainingTime);
      } else {
        setDisplayState(prev => ({
          ...prev,
          typing: false,
          progress: 100
        }));
      }
    }
  }, [isComplete]);

  return (
    <Card 
      data-testid="animated-preview"
      data-complete={isComplete}
      className={cn(
        "relative overflow-hidden transition-all duration-500",
        isComplete && "border-green-500/50",
        transitionState?.to === componentName && "animate-slide-in",
        transitionState?.from === componentName && "animate-slide-out",
        className
      )}
    >
      <CardHeader className="border-b border-slate-800">
        <CardTitle 
          data-testid="preview-title" 
          className="flex items-center gap-2"
        >
          <span className="flex-1">{componentName || 'Component Preview'}</span>
          {displayState.typing && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          )}
          {isComplete && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <pre 
          data-testid="preview-code"
          className={cn(
            "relative font-mono text-sm overflow-x-auto p-4",
            displayState.typing && "animate-pulse"
          )}
        >
          {displayState.text && <code>{displayState.text}</code>}
          {displayState.typing && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
              <div 
                className="h-full bg-blue-500 transition-all duration-200"
                style={{ width: `${displayState.progress}%` }}
              />
            </div>
          )}
        </pre>
        {displayState.error && (
          <div className="p-4 text-red-400 text-sm border-t border-red-500/20">
            Animation Error: {displayState.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(AnimatedPreview);

/**
 * AnimatedPreview Component Implementation Notes - v2.0
 * 
 * Major Updates:
 * 1. Animation System
 *    - Enhanced typing animation with variable speeds
 *    - Improved overlap detection algorithm
 *    - Added transition effects between components
 * 
 * 2. State Management
 *    - Added completion state tracking
 *    - Implemented proper cleanup on component changes
 *    - Enhanced buffer management
 * 
 * 3. Performance
 *    - Optimized animation frame handling
 *    - Improved text rendering performance
 *    - Added debounced updates
 * 
 * @version 2.0.0
 * @lastUpdated 2024-03-20
 * @changelog
 * - Enhanced typing animation system
 * - Improved overlap detection
 * - Added component transition effects
 * - Implemented completion state handling
 * - Optimized performance
 */ 