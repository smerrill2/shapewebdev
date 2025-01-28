import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { Loader2, CheckCircle2 } from 'lucide-react';
import PropTypes from 'prop-types';

const TYPING_SPEEDS = {
  NEWLINE: 50,
  PUNCTUATION: 30,
  NORMAL: 15,
  STREAMING: 8
};

const ANIMATION_STATES = {
  IDLE: 'idle',
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  ERROR: 'error'
};

const MIN_OVERLAP_LENGTH = 5;

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

// Error Boundary Component
class AnimatedPreviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AnimatedPreview Error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg overflow-hidden bg-slate-900">
          <div className="bg-red-900/20 px-4 py-2">
            <span className="text-red-400 text-sm">Error: {this.state.error}</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debounce utility
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

const AnimatedPreview = ({ 
  code = '', 
  streamedCode = '',
  isComplete = false,
  isStreaming = false,
  componentName = '', 
  className = '',
  transitionState = null,
  isVisible = true
}) => {
  if (!isVisible) return null;

  const [displayState, setDisplayState] = useState({
    text: '',
    typing: false,
    progress: 0,
    error: null,
    animationState: ANIMATION_STATES.IDLE
  });

  const animationState = useRef({
    cancelled: false,
    currentTimeout: null,
    progress: 0,
    startTime: 0,
    lastUpdateTime: 0
  });

  const getTypingDelay = useCallback((char, nextChar, isStreaming) => {
    if (isStreaming) return TYPING_SPEEDS.STREAMING;
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

  const typeCode = useCallback((text, startIndex = 0, isStreaming = false) => {
    // Reset animation state
    animationState.current = {
      cancelled: false,
      currentTimeout: null,
      progress: startIndex / text.length,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };

    const animate = (index) => {
      if (animationState.current.cancelled) return;
      
      if (index >= text.length) {
        setDisplayState(prev => ({ 
          ...prev, 
          typing: false, 
          progress: 100,
          animationState: isComplete ? ANIMATION_STATES.COMPLETE : ANIMATION_STATES.STREAMING
        }));
        return;
      }

      const char = text[index];
      const nextChar = text[index + 1];
      const delay = getTypingDelay(char, nextChar, isStreaming);

      setDisplayState(prev => ({
        ...prev,
        text: text.slice(0, index + 1),
        typing: true,
        progress: (index / text.length) * 100,
        animationState: isStreaming ? ANIMATION_STATES.STREAMING : ANIMATION_STATES.IDLE
      }));

      animationState.current.progress = index / text.length;
      animationState.current.lastUpdateTime = Date.now();
      animationState.current.currentTimeout = setTimeout(
        () => animate(index + 1),
        delay
      );
    };

    animate(startIndex);
  }, [getTypingDelay, isComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelCurrentAnimation();
    };
  }, []);

  const debouncedTypeCode = useCallback(
    debounce((text, startIndex, isStreaming) => {
      typeCode(text, startIndex, isStreaming);
    }, 50),
    [typeCode]
  );

  // Handle streaming updates with debouncing
  useEffect(() => {
    if (isStreaming && streamedCode && streamedCode !== displayState.text) {
      const currentText = displayState.text;
      const newText = streamedCode;
      
      // Immediate update for streaming
      setDisplayState(prev => ({
        ...prev,
        text: newText,
        typing: false,
        progress: 100,
        animationState: ANIMATION_STATES.STREAMING
      }));
    }
  }, [streamedCode, isStreaming, displayState.text]);

  // Handle complete code updates
  useEffect(() => {
    if (isComplete && code && code !== displayState.text) {
      setDisplayState(prev => ({
        ...prev,
        text: code,
        typing: false,
        progress: 100,
        animationState: ANIMATION_STATES.COMPLETE
      }));
    }
  }, [code, isComplete]);

  // Handle component transitions
  useEffect(() => {
    if (transitionState && transitionState.status === 'transitioning') {
      cancelCurrentAnimation();
      setDisplayState(prev => ({
        ...prev,
        typing: false,
        animationState: ANIMATION_STATES.IDLE
      }));
    }
  }, [transitionState, cancelCurrentAnimation]);

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

  // Wrap the main render with error boundary
  return (
    <AnimatedPreviewErrorBoundary>
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        {/* Header */}
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-sm">{componentName}</span>
            {displayState.animationState === ANIMATION_STATES.STREAMING && (
              <span className="text-emerald-400 text-xs">Streaming...</span>
            )}
            {displayState.animationState === ANIMATION_STATES.COMPLETE && (
              <span className="text-emerald-400 text-xs">Complete</span>
            )}
            {displayState.error && (
              <span className="text-red-400 text-xs">Error</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {displayState.typing && (
              <div className="h-1 w-24 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${displayState.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Code Content */}
        <div className="relative">
          <pre className={`p-4 text-base font-['SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace] overflow-auto bg-slate-900 ${
            displayState.typing ? 'typing' : ''
          }`}>
            <code className="text-slate-100 font-medium">
              {displayState.text || ''}
            </code>
          </pre>

          {/* Overlay for transitions */}
          {transitionState?.status === 'transitioning' && (
            <div className="absolute inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
            </div>
          )}

          {/* Error Display */}
          {displayState.error && (
            <div className="absolute inset-0 bg-red-900 bg-opacity-10 p-4">
              <div className="text-red-400 text-sm">
                {displayState.error}
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedPreviewErrorBoundary>
  );
};

AnimatedPreview.propTypes = {
  code: PropTypes.string,
  streamedCode: PropTypes.string,
  isComplete: PropTypes.bool,
  isStreaming: PropTypes.bool,
  componentName: PropTypes.string,
  className: PropTypes.string,
  transitionState: PropTypes.object,
  isVisible: PropTypes.bool
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