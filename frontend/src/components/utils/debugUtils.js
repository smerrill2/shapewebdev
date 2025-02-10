import { DEBUG_MODE } from './config';

/**
 * Debug logging utility with consistent formatting
 */
export const debugLog = (section, data) => {
  if (DEBUG_MODE) {
    console.group(`🔧 ${section}`);
    console.log(JSON.stringify(data, null, 2));
    console.groupEnd();
  }
};

/**
 * Component resolution logging
 */
export const logComponentResolution = (name, type, details) => {
  if (DEBUG_MODE) {
    console.group(`🧩 Component Resolution: ${name}`);
    console.log(`Type: ${type}`);
    console.log('Details:', details);
    console.groupEnd();
  }
};

/**
 * Debug warning utility
 */
export const warnEmptyElement = (type, props) => {
  if (DEBUG_MODE) {
    console.group('⚠️ Empty Element Warning');
    console.warn(`${type} rendered with no children!`);
    console.log('Props:', props);
    console.groupEnd();
  }
};

/**
 * Debug state changes
 */
export const logStateChange = (component, prevState, nextState) => {
  if (DEBUG_MODE) {
    console.group(`🔄 State Change: ${component}`);
    console.log('Previous:', prevState);
    console.log('Next:', nextState);
    console.log('Changes:', Object.keys(nextState).reduce((acc, key) => {
      if (prevState[key] !== nextState[key]) {
        acc[key] = {
          from: prevState[key],
          to: nextState[key]
        };
      }
      return acc;
    }, {}));
    console.groupEnd();
  }
};

/**
 * Debug performance measurements
 */
export const measurePerformance = async (name, fn) => {
  if (!DEBUG_MODE) return fn();

  console.time(`⏱️ ${name}`);
  const result = await fn();
  console.timeEnd(`⏱️ ${name}`);
  return result;
};

/**
 * Debug error boundary logging
 */
export const logErrorBoundary = (componentName, error, errorInfo) => {
  if (DEBUG_MODE) {
    console.group(`🔥 Error Boundary: ${componentName}`);
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.groupEnd();
  }
}; 