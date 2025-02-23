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
 * Final formatting pass to ensure code matches expected format
 */
function finalFormat(code) {
  // First, ensure return statements with JSX are wrapped in parentheses
  code = code.replace(
    /return\s+(<[\w.][^>]*>.*?<\/[\w.][^>]*>);?/g,
    'return ($1);'
  );

  // Fix style attributes to match expected format
  code = code.replace(
    /style\s*=\s*\{\{([^}]*?)\}+/g,
    (match, content) => {
      // Remove spaces around colons but preserve the rest
      const cleanContent = content.replace(/\s*:\s*/g, ':').trim();
      return `style={{${cleanContent}}}`;
    }
  );

  // Finally, clean up any extra whitespace
  code = code.replace(/\s+/g, ' ').trim();
  
  return code;
}

/**
 * Applies all transformations to the code in sequence
 * @param {string} code - The code to transform
 * @param {object} options - Options for the transformations
 * @param {string} [options.testId] - The test ID to add
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

    // 2. Remove any React imports or render calls first
    transformedCode = transformedCode
      .replace(/^import React.*?;\n?/m, '')
      .replace(/\/\/\s*React-Live.*$/m, '')
      .replace(/\(\s*\)\s*=>\s*<.*?\/?>.*$/m, '')
      .trim();

    // 3. Fix incomplete JSX - must happen before test ID injection
    transformedCode = fixIncompleteJSX(transformedCode);

    if (isDebugMode()) {
      console.log('After fixIncompleteJSX:', transformedCode);
    }

    // 4. Inject test IDs if needed
    let hasTestId = transformedCode.includes('data-testid=');
    if (!hasTestId) {
      // Extract component name for default testId
      const componentMatch = transformedCode.match(/function\s+([A-Z][A-Za-z0-9]*)/);
      const componentName = componentMatch ? componentMatch[1] : 'Example';
      const testId = options.testId || componentName.toLowerCase();
      
      transformedCode = injectTestIds(transformedCode, { testId });

      if (isDebugMode()) {
        console.log('After injectTestIds:', transformedCode);
      }
    }

    // 5. Final formatting pass
    transformedCode = finalFormat(transformedCode);

    // 6. Validate JSX before returning
    if (!isValidJSX(transformedCode)) {
      if (isDebugMode()) {
        console.warn('Invalid JSX after all transformations, reverting to cleaned code');
      }
      return cleanCode(code);
    }

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
