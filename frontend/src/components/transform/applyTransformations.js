import { parse } from '@babel/parser';
import { cleanCode, cleanCodeForLive } from './cleanCode';
import { fixIncompleteJSX } from './fixIncompleteJSX';
import { injectTestIds } from './injectTestIds';

// Dynamically check debug mode
function isDebugMode() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Validates if the code is valid JSX/JavaScript
 * @param {string} code - The code to validate
 * @returns {boolean} - Whether the code is valid
 */
function isValidJSX(code) {
  try {
    parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    return true;
  } catch (e) {
    if (isDebugMode()) {
      console.error('JSX validation error:', e);
    }
    return false;
  }
}

/**
 * Applies all transformations to the code in sequence
 * @param {string} code - The code to transform
 * @param {object} options - Options for the transformations
 * @returns {string} - The transformed code
 */
export function applyTransformations(code, options = {}) {
  if (!code) return '';

  if (isDebugMode()) {
    console.group('Starting code cleaning');
    console.log('Code length:', code.length);
  }

  try {
    // 1. Clean the code first (remove markers, etc.)
    let transformedCode = cleanCode(code);

    if (isDebugMode()) {
      console.log('After cleanCode:', transformedCode);
    }

    // 2. Fix incomplete JSX
    transformedCode = fixIncompleteJSX(transformedCode);

    if (isDebugMode()) {
      console.log('After fixIncompleteJSX:', transformedCode);
    }

    // Validate JSX before proceeding
    if (!isValidJSX(transformedCode)) {
      if (isDebugMode()) {
        console.warn('Invalid JSX after fixIncompleteJSX, reverting to original cleaned code');
      }
      transformedCode = cleanCode(code);
    }

    // 3. Inject test IDs if needed
    let hasTestId = transformedCode.includes('data-testid');
    if (!hasTestId) {
      transformedCode = injectTestIds(transformedCode, options.testId);

      if (isDebugMode()) {
        console.log('After injectTestIds:', transformedCode);
      }

      // If test ID injection fails, revert to previous valid state
      if (!isValidJSX(transformedCode)) {
        if (isDebugMode()) {
          console.warn('Invalid JSX after injectTestIds, reverting to previous state');
        }
        transformedCode = fixIncompleteJSX(cleanCode(code));
      }
    }

    // 4. Ensure React import
    if (!transformedCode.includes('import React')) {
      transformedCode = `import React from "react";\n${transformedCode}`;
    }

    // 5. Extract component name and add a final render call if missing
    const componentMatch = transformedCode.match(/function\s+([A-Z][A-Za-z0-9]*)/);
    const componentName = componentMatch ? componentMatch[1] : 'Example';

    // Remove any existing render calls
    transformedCode = transformedCode.replace(/\/\/\s*React-Live.*$/, '').trim();
    transformedCode = transformedCode.replace(/\(\s*\)\s*=>\s*<.*?\/?>.*$/, '').trim();

    // Add the new render call
    transformedCode += `\n// React-Live will evaluate the last expression\n() => <${componentName}`;
    
    // Only add data-testid to the render call if it wasn't added to the component
    if (!hasTestId) {
      const testId = options.testId || componentName.toLowerCase();
      transformedCode += ` data-testid="${testId}"`;
    }
    
    transformedCode += ' />';

    if (isDebugMode()) {
      console.log('Final code:', transformedCode);
      console.groupEnd();
    }

    return transformedCode;
  } catch (error) {
    if (isDebugMode()) {
      console.error('Error in applyTransformations:', error);
      console.groupEnd();
    }
    // Return cleaned code as fallback
    return cleanCode(code);
  }
}

// Export other utility functions that might be needed
export {
  cleanCode,
  cleanCodeForLive,
  fixIncompleteJSX,
  injectTestIds
};
