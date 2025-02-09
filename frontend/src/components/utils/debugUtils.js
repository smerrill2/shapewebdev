// Debug mode flag - can be controlled via environment variable
export const DEBUG_BABEL_TRANSFORMS = process.env.NODE_ENV === 'development' || process.env.DEBUG_BABEL === 'true';

// Global verbosity level (1 = basic, 2 = verbose, 3 = super verbose)
export const DEBUG_LEVEL = Number(process.env.DEBUG_LEVEL || 1);

// Debug group counter to ensure proper nesting
let debugGroupDepth = 0;

// Utility to safely handle console groups
export const safeConsoleGroup = (label, level = 1) => {
  if (DEBUG_BABEL_TRANSFORMS && level <= DEBUG_LEVEL) {
    console.group(label);
    debugGroupDepth++;
  }
};

export const safeConsoleGroupEnd = () => {
  if (DEBUG_BABEL_TRANSFORMS && debugGroupDepth > 0) {
    console.groupEnd();
    debugGroupDepth--;
  }
};

// Core debug logging utility with verbosity support
export const debugLog = (section, data, type = 'log', level = 1) => {
  if (DEBUG_BABEL_TRANSFORMS && level <= DEBUG_LEVEL) {
    const timestamp = new Date().toISOString();
    const prefix = `🔍 [${timestamp}] ${section}:`;
    
    switch (type) {
      case 'error':
        console.error(prefix, data);
        break;
      case 'warn':
        console.warn(prefix, data);
        break;
      default:
        console.log(prefix, data);
    }
  }
};

// New function: Deep logging (prints complete JSON representation)
export const debugDeepLog = (section, data, type = 'log', level = 3) => {
  if (DEBUG_BABEL_TRANSFORMS && level <= DEBUG_LEVEL) {
    const timestamp = new Date().toISOString();
    const prefix = `🔍 [${timestamp}] ${section}:`;
    
    // Using JSON.stringify with 2-space indentation for clarity
    const output = JSON.stringify(data, (key, value) => {
      // Handle circular references and functions
      if (typeof value === 'function') {
        return '[Function]';
      }
      if (value === window) {
        return '[Window]';
      }
      if (value === document) {
        return '[Document]';
      }
      return value;
    }, 2);
    
    switch (type) {
      case 'error':
        console.error(prefix, output);
        break;
      case 'warn':
        console.warn(prefix, output);
        break;
      default:
        console.log(prefix, output);
    }
  }
};

// Enhanced AST node debugging with deep logging option
export const debugASTNode = (node, context = '', deep = false) => {
  if (DEBUG_BABEL_TRANSFORMS && node) {
    const basicInfo = {
      type: node.type,
      location: node.loc && {
        start: { line: node.loc.start.line, column: node.loc.start.column },
        end: { line: node.loc.end.line, column: node.loc.end.column }
      },
      name: node.name || node.id?.name,
      value: node.value,
      raw: node.raw,
      ...(node.type === 'JSXElement' && {
        tagName: node.openingElement?.name?.name,
        hasClosingElement: !!node.closingElement,
        childCount: node.children?.length,
        attributes: node.openingElement?.attributes?.map(attr => ({
          name: attr.name?.name,
          value: attr.value?.value || '[Expression]'
        }))
      })
    };

    if (deep) {
      debugDeepLog(`AST Node ${context} [Deep]`, node);
    } else {
      debugLog(`AST Node ${context}`, basicInfo, 'log', 2);
    }
  }
};

// Enhanced stack/queue debugging
export const debugStack = (stack, operation, item, level = 2) => {
  if (DEBUG_BABEL_TRANSFORMS && level <= DEBUG_LEVEL) {
    debugLog('Stack Operation', {
      operation,
      item,
      stackDepth: stack.length,
      stackTop: stack[stack.length - 1],
      fullStack: level >= 3 ? [...stack] : undefined,
      timestamp: Date.now()
    }, 'log', level);
  }
};

// Enhanced code transformation debugging
export const debugTransform = (stage, input, output, level = 2) => {
  if (DEBUG_BABEL_TRANSFORMS && level <= DEBUG_LEVEL) {
    const transformInfo = {
      input: typeof input === 'string' ? input.slice(0, 100) + '...' : input,
      output: typeof output === 'string' ? output.slice(0, 100) + '...' : output,
      inputLength: input?.length,
      outputLength: output?.length,
      timestamp: Date.now(),
      diff: typeof input === 'string' && typeof output === 'string' ? {
        lengthDiff: output.length - input.length,
        lineCountDiff: (output.match(/\n/g) || []).length - (input.match(/\n/g) || []).length
      } : undefined
    };

    if (level >= 3) {
      transformInfo.fullInput = input;
      transformInfo.fullOutput = output;
    }

    debugLog(`Transform: ${stage}`, transformInfo, 'log', level);
  }
};

// Enhanced error boundary debugging
export const debugError = (error, context, level = 1) => {
  if (DEBUG_BABEL_TRANSFORMS) {
    const errorInfo = {
      message: error.message,
      name: error.name,
      context,
      timestamp: Date.now()
    };

    if (level >= 2) {
      errorInfo.stack = error.stack;
    }

    if (level >= 3) {
      errorInfo.fullError = error;
    }

    debugLog('Error', errorInfo, 'error', level);
  }
};

// Enhanced performance monitoring
const perfMarks = new Map();
const perfStats = new Map();

export const startPerfMark = (label) => {
  if (DEBUG_BABEL_TRANSFORMS) {
    perfMarks.set(label, {
      startTime: performance.now(),
      startMemory: process?.memoryUsage?.() || {}
    });
    debugLog('Performance', `Starting ${label}`, 'log', 2);
  }
};

export const endPerfMark = (label) => {
  if (DEBUG_BABEL_TRANSFORMS && perfMarks.has(label)) {
    const { startTime, startMemory } = perfMarks.get(label);
    const duration = performance.now() - startTime;
    const endMemory = process?.memoryUsage?.() || {};
    
    // Calculate memory differences
    const memoryDiff = Object.keys(endMemory).reduce((diff, key) => {
      diff[key] = (endMemory[key] - (startMemory[key] || 0)) / 1024 / 1024; // Convert to MB
      return diff;
    }, {});

    // Update performance statistics
    const stats = perfStats.get(label) || { count: 0, totalDuration: 0, minDuration: Infinity, maxDuration: 0 };
    stats.count++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.avgDuration = stats.totalDuration / stats.count;
    perfStats.set(label, stats);

    const perfInfo = {
      duration: `${duration.toFixed(2)}ms`,
      memoryDiff: Object.keys(memoryDiff).reduce((formatted, key) => {
        formatted[key] = `${memoryDiff[key].toFixed(2)}MB`;
        return formatted;
      }, {}),
      stats: {
        count: stats.count,
        avg: `${stats.avgDuration.toFixed(2)}ms`,
        min: `${stats.minDuration.toFixed(2)}ms`,
        max: `${stats.maxDuration.toFixed(2)}ms`
      }
    };

    debugLog('Performance', `${label} completed:`, 'log', 2);
    debugDeepLog('Performance Details', perfInfo, 'log', 3);
    perfMarks.delete(label);
  }
};

// Enhanced JSX validation debugging
export const debugJSXValidation = (code, validationResult, level = 2) => {
  if (DEBUG_BABEL_TRANSFORMS && level <= DEBUG_LEVEL) {
    safeConsoleGroup('JSX Validation', level);
    
    const validationInfo = {
      codeLength: code?.length,
      preview: code?.slice(0, 100) + '...',
      isValid: validationResult.isValid,
      errorCount: validationResult.errors?.length || 0,
      warningCount: validationResult.warnings?.length || 0
    };

    if (level >= 2) {
      validationInfo.errors = validationResult.errors;
      validationInfo.warnings = validationResult.warnings;
    }

    if (level >= 3) {
      validationInfo.fullCode = code;
      validationInfo.fullValidationResult = validationResult;
    }

    debugLog('Validation Summary', validationInfo, 'log', level);
    
    if (validationResult.errors?.length > 0) {
      debugDeepLog('Validation Errors', validationResult.errors, 'error', level);
    }
    
    if (validationResult.warnings?.length > 0) {
      debugDeepLog('Validation Warnings', validationResult.warnings, 'warn', level);
    }
    
    safeConsoleGroupEnd();
  }
}; 