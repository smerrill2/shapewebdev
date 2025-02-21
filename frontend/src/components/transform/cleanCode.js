import React from 'react';

/**
 * Clean up code by removing markers and ensuring proper formatting
 * @param {string} code - The code to clean
 * @returns {string} - The cleaned code
 */
export function cleanCode(code) {
  if (!code || typeof code !== 'string') return '';

  try {
    // 1. Extract code between markers
    const startMarkerRegex = /\/\/\/\s*START\s+(\w+)(?:\s+position=(\w+))?/;
    const startMatch = code.match(startMarkerRegex);
    if (!startMatch) return code;

    const componentName = startMatch[1];
    const endMarkerRegex = new RegExp(`\/\/\/\\s*END\\s+${componentName}`);
    const endMatch = code.match(endMarkerRegex);
    if (!endMatch) return code;

    // 2. Extract the code between markers
    const startIndex = code.indexOf(startMatch[0]) + startMatch[0].length;
    const endIndex = code.indexOf(endMatch[0]);
    let componentCode = code.substring(startIndex, endIndex).trim();

    // 3. Preserve imports
    const imports = [];
    const importRegex = /import\s+(?:[^;]+)\s+from\s+['"][^'"]+['"];?/g;
    let match;
    while ((match = importRegex.exec(componentCode)) !== null) {
      imports.push(match[0]);
    }

    // 4. Clean the component code
    componentCode = componentCode.replace(importRegex, '').trim();

    // 5. Ensure React import
    if (!imports.includes('import React from "react"')) {
      imports.unshift('import React from "react";');
    }

    // 6. Preserve or add test ID
    const testIdMatch = componentCode.match(/data-testid=["']([^"']+)["']/);
    const testId = testIdMatch ? testIdMatch[1] : componentName.toLowerCase();

    // 7. Check for render call
    const hasRenderCall = /\(\s*\)\s*=>\s*</.test(componentCode);

    // 8. Reconstruct the code
    let finalCode = imports.join('\n') + '\n\n' + componentCode;

    // 9. Add render call if missing
    if (!hasRenderCall) {
      finalCode = finalCode.replace(/export\s+default\s+[^;]+;?/, '');
      finalCode += `\n\n// React-Live will evaluate the last expression\n() => <${componentName}${!testIdMatch ? ` data-testid="${testId}"` : ''} />`;
    }

    return finalCode;
  } catch (error) {
    console.error('Error in cleanCode:', error);
    return code;
  }
}

/**
 * Clean up code for live preview with proper handling of markers and test IDs
 * @param {string} code - The code to clean
 * @returns {string} - The cleaned code
 */
export function cleanCodeForLive(code, componentName) {
  // Normalize line endings
  code = code.replace(/\r\n/g, '\n');

  // Handle partial streaming
  const hasStartMarker = /\/\/\/\s*START\s+[A-Za-z]/.test(code);
  const hasEndMarker = /\/\/\/\s*END\s+[A-Za-z]/.test(code);
  
  if (hasStartMarker && !hasEndMarker) {
    return ''; // Return empty string to indicate incomplete code
  }

  // Extract code between START and END markers with improved regex
  const markerMatch = code.match(/\/\/\/\s*START\s+([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*)*(?:Section|Layout|Component)?)\s*(?:position=([a-z]+))?\s*\n([\s\S]*?)\/\/\/\s*END\s+\1\s*(?:\n|$)/);
  
  if (markerMatch) {
    const [_, extractedName, position = 'main', componentCode] = markerMatch;
    
    // Validate component name if provided
    if (componentName && extractedName !== componentName) {
      console.warn(`⚠️ Component name mismatch: expected ${componentName}, got ${extractedName}`);
    }
    
    code = componentCode;
  }

  // Clean up the code
  return cleanCode(code);
} 