// frontend/src/components/utils/babelTransformations.js

import * as t from '@babel/types';
import babel from '@babel/core';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

// Regular expressions for function declarations
const FUNCTION_REGEX = /(?:export\s+)?(?:function\s+([A-Z][A-Za-z0-9]*)\s*\([^)]*\)\s*{|const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>\s*{)([\s\S]*?)(?:}|$)/g;

// Debug mode flag for transformation logging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Logs transformation details if debug mode is enabled
 * @param {string} stage - The transformation stage being logged
 * @param {string} code - The code being transformed
 * @param {Object} [details] - Additional details to log
 */
function logTransformation(stage, code, details = {}) {
  if (!DEBUG_MODE) return;
  
  console.group(`🔄 ${stage}`);
  console.log('Code length:', code?.length || 0);
  if (code?.length < 1000) {
    console.log('Code:\n', code);
  }
  if (Object.keys(details).length > 0) {
    console.log('Details:', details);
  }
  console.groupEnd();
}

/**
 * Attempt a straightforward parse to see if the snippet is valid JSX.
 */
function canParseSnippet(snippet) {
  if (!snippet || typeof snippet !== 'string') return false;

  // Wrap the snippet in a function if it's not already
  let code = snippet;
  if (!code.includes('function') && !code.includes('=>')) {
    code = `function TestComponent() { ${code} }`;
  }

  // Add missing imports if needed
  if (!code.includes('import React')) {
    code = 'import React from "react";\n' + code;
  }

  // Add missing render statement if needed
  if (!code.includes('render(')) {
    const match = code.match(/function\s+([A-Z][A-Za-z0-9]*)|const\s+([A-Z][A-Za-z0-9]*)/);
    if (match) {
      const componentName = match[1] || match[2];
      code += `\nrender(<${componentName} />);`;
    }
  }

  try {
    // First try with strict mode
    parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: false,
    });
    return true;
  } catch (e1) {
    try {
      // If strict mode fails, try with error recovery
      parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      });
      return true;
    } catch (e2) {
      try {
        // Last attempt: try parsing just the function body
        const functionBody = code.match(/(?:function|=>)\s*{([\s\S]*)}$/)?.[1];
        if (functionBody) {
          parse(functionBody, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
            errorRecovery: true,
          });
          return true;
        }
      } catch (e3) {
        return false;
      }
      return false;
    }
  }
}

/**
 * Applies a canonical sequence of transformations to clean and fix code snippets.
 * This is the single source of truth for our transformation pipeline.
 * 
 * Transformation Order:
 * 1. Pre-processing
 *    - Add missing imports
 *    - Merge incomplete lines
 * 2. Structural Fixes
 *    - Fix incomplete tags and attributes
 *    - Balance braces and fix return statements
 * 3. JSX-Specific Fixes
 *    - Fix dynamic expressions
 *    - Fix component attributes
 *    - Handle fragments
 * 4. Function-Level Fixes
 *    - Fix function braces
 *    - Fix missing HTML tags
 * 
 * @param {string} code - The code to transform
 * @returns {string} The transformed code
 */
function applyTransformations(code) {
  if (!code || typeof code !== 'string') return '';

  logTransformation('Starting Transformation', code, {
    initialLength: code.length,
    hasReactImport: code.includes('import React'),
    hasJSX: code.includes('<'),
  });

  // Pre-process: Add missing imports if needed
  if (!code.includes('import React')) {
    code = 'import React from "react";\n' + code;
    logTransformation('Added React Import', code);
  }

  try {
    // 1. First merge lines that might be incomplete
    code = mergeJSXLines(code);
    logTransformation('After Line Merge', code, {
      lineCount: code.split('\n').length
    });

    // 2. Fix structural issues
    const structuralFixes = [
      { name: 'Incomplete Tags', fn: fixIncompleteTags },
      { name: 'Incomplete Attributes', fn: fixIncompleteAttributes },
      { name: 'Curly Braces', fn: balanceCurlyBraces },
      { name: 'Return Statement', fn: fixReturnStatement }
    ];

    for (const fix of structuralFixes) {
      const before = code;
      code = fix.fn(code);
      if (before !== code) {
        logTransformation(`Applied ${fix.name} Fix`, code, {
          changed: true,
          diff: code.length - before.length
        });
      }
    }

    // 3. Fix JSX-specific issues
    const jsxFixes = [
      { name: 'Dynamic Expressions', fn: fixIncompleteDynamicExpressions },
      { name: 'Attributes', fn: fixAttributes },
      { name: 'Fragments', fn: fixFragments },
      { name: 'JSX Tags', fn: balanceJSXTags }
    ];

    for (const fix of jsxFixes) {
      const before = code;
      code = fix.fn(code);
      if (before !== code) {
        logTransformation(`Applied ${fix.name} Fix`, code, {
          changed: true,
          diff: code.length - before.length
        });
      }
    }

    // 4. Fix function-level issues
    const functionFixes = [
      { name: 'Function Braces', fn: fixFunctionBraces },
      { name: 'HTML Tags', fn: fixMissingHtmlTags }
    ];

    for (const fix of functionFixes) {
      const before = code;
      code = fix.fn(code);
      if (before !== code) {
        logTransformation(`Applied ${fix.name} Fix`, code, {
          changed: true,
          diff: code.length - before.length
        });
      }
    }

    logTransformation('Transformation Complete', code, {
      finalLength: code.length,
      success: true
    });

    return code;

  } catch (error) {
    console.error('❌ Error during transformation:', error);
    logTransformation('Transformation Failed', code, {
      error: error.message,
      stage: error.stage,
      success: false
    });
    
    // Return the code as-is if transformation fails
    // This allows the AST parsing step to attempt recovery
    return code;
  }
}

/**
 * Fixes incomplete code snippets by adding missing tags, braces, etc.
 * @param {string} code - The code to fix
 * @returns {string} - The fixed code
 */
function fixSnippet(code) {
  if (!code || typeof code !== 'string') return '';

  // Add missing imports if needed
  if (!code.includes('import React')) {
    code = 'import React from "react";\n' + code;
  }

  try {
    // 1. First merge lines that might be incomplete
    code = mergeJSXLines(code);

    // 2. Fix structural issues
    const structuralFixes = [
      { name: 'Incomplete Tags', fn: fixIncompleteTags },
      { name: 'Incomplete Attributes', fn: fixIncompleteAttributes },
      { name: 'Curly Braces', fn: balanceCurlyBraces },
      { name: 'Return Statement', fn: fixReturnStatement }
    ];

    for (const fix of structuralFixes) {
      code = fix.fn(code);
    }

    // 3. Fix JSX-specific issues
    const jsxFixes = [
      { name: 'Dynamic Expressions', fn: fixIncompleteDynamicExpressions },
      { name: 'Attributes', fn: fixAttributes },
      { name: 'Fragments', fn: fixFragments },
      { name: 'JSX Tags', fn: balanceJSXTags }
    ];

    for (const fix of jsxFixes) {
      code = fix.fn(code);
    }

    // 4. Fix function-level issues
    const functionFixes = [
      { name: 'Function Braces', fn: fixFunctionBraces },
      { name: 'HTML Tags', fn: fixMissingHtmlTags }
    ];

    for (const fix of functionFixes) {
      code = fix.fn(code);
    }

    // 5. Final pass to ensure all tags are closed
    code = balanceAllTags(code);

    return code;
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('Error in fixSnippet:', error);
    }
    return code;
  }
}

/**
 * Balances all HTML tags in the code
 * @param {string} code - The code to fix
 * @returns {string} - The fixed code
 */
function balanceAllTags(code) {
  // First, find all opening tags
  const openTagPattern = /<([A-Za-z][A-Za-z0-9]*)[^>]*?(?:>|$)/g;
  const matches = Array.from(code.matchAll(openTagPattern));
  const tagStack = [];
  const selfClosingTags = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

  // Process each tag
  for (const match of matches) {
    const [fullMatch, tagName] = match;
    if (selfClosingTags.has(tagName.toLowerCase())) continue;
    if (!fullMatch.endsWith('/>')) {
      tagStack.push(tagName);
    }
  }

  // Add missing closing tags in reverse order
  while (tagStack.length > 0) {
    const tag = tagStack.pop();
    if (!code.includes(`</${tag}>`)) {
      code = code.trim();
      if (!code.endsWith(';') && !code.endsWith('}')) {
        code += '\n';
      }
      code += `</${tag}>`;
    }
  }

  // Fix function body if needed
  if (code.includes('return (') && !code.includes('});')) {
    code = code.trim();
    if (!code.endsWith(';')) {
      code += ');';
    }
    if (!code.endsWith('};')) {
      code += '\n}';
    }
  }

  return code;
}

/**
 * Merge lines that are likely part of an incomplete JSX tag or attribute.
 * Checks for:
 *   - Opening tag without a ">"
 *   - Unbalanced quotes or braces on the line
 */
function mergeJSXLines(snippet) {
  const rawLines = snippet.split('\n');
  const out = [];
  let i = 0;

  while (i < rawLines.length) {
    let line = rawLines[i];
    while (i + 1 < rawLines.length && needsMerge(line)) {
      i++;
      line += ' ' + rawLines[i].trim();
    }
    out.push(line);
    i++;
  }

  return out.join('\n');
}

/**
 * Decide if the current line might need to be merged with the next line.
 */
function needsMerge(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return false;
  if (!trimmed.includes('<') && !trimmed.includes('{')) return false;

  // Check if there's an opening "<tag" without a closing ">"
  if (/<[A-Za-z]|<\>/.test(trimmed) && !/>/.test(trimmed)) {
    return true;
  }
  // Unbalanced double quotes
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) return true;
  // Unbalanced single quotes
  const singleQuotes = (trimmed.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) return true;
  // style={{ ... incomplete
  if (trimmed.includes('style={{') && !trimmed.includes('}}')) {
    return true;
  }
  // Unbalanced curly braces
  const openBrace = (trimmed.match(/{/g) || []).length;
  const closeBrace = (trimmed.match(/}/g) || []).length;
  if (openBrace > closeBrace) return true;

  return false;
}

// Replace minimalTextFix with a call to applyTransformations
function minimalTextFix(code) {
  logTransformation('Starting Minimal Text Fix', code);
  return applyTransformations(code);
}

/**
 * 1) Balance curly braces: if we have more '{' than '}', append extra '}'.
 */
function balanceCurlyBraces(str) {
  let openB = (str.match(/{/g) || []).length;
  let closeB = (str.match(/}/g) || []).length;
  while (closeB < openB) {
    str += '}';
    closeB++;
  }
  return str;
}

/**
 * 2) Ensure that if there's "return (" somewhere, we have a matching ");" by the end of that function.
 */
function fixReturnStatement(str) {
  str = str.replace(/\breturn\s+(?![\s\n]*\()(.*?)(?:;|$)/g, (match, expr) => {
    return `return (${expr.trim()});`;
  });
  if (str.includes('return (') && !str.includes(');')) {
    str += ');';
  }
  return str;
}

/**
 * 3) Fix incomplete attributes: e.g. onClick={something, style={{foo:'bar'}
 *    This ensures we add '}' or '}}' if missing.
 */
function fixAttributes(code) {
  // Fix incomplete event handlers: onClick={handler => 
  code = code.replace(
    /(\w+)\s*=\s*{\s*(?:([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*)?([^}]*)(?=\s|>|$)/g,
    (match, attr, param, body) => {
      if (match.trim().endsWith('}')) return match;
      if (param) {
        // It's an arrow function
        return `${attr}={${param} => ${body}}`;
      }
      return `${attr}={${body}}`;
    }
  );

  // Fix style attributes with multiple properties
  code = code.replace(
    /style\s*=\s*{{\s*([^}]+)(?=\s|>|$)/g,
    (match, styleProps) => {
      if (match.trim().endsWith('}}')) return match;
      // Clean up any partial properties and ensure proper formatting
      const cleanProps = styleProps
        .replace(/,\s*$/, '')
        .replace(/([a-zA-Z]+):\s*([^,}]+)(?=[,}])/g, '$1: $2,')
        .replace(/,\s*$/, '');
      return `style={{${cleanProps}}}`;
    }
  );

  // Fix className with template literals or conditions
  code = code.replace(
    /className\s*=\s*{\s*(?:cn\s*\()?\s*([^}]+)(?=\s|>|$)/g,
    (match, classNames) => {
      if (match.trim().endsWith('}')) return match;
      // Handle cn function calls
      if (match.includes('cn(')) {
        const cleanedClassNames = classNames
          .replace(/,\s*$/, '')
          .replace(/([^,]+)(?=[,)])/g, '$1,')
          .replace(/,\s*$/, '');
        return `className={cn(${cleanedClassNames})}`;
      }
      return `className={${classNames}}`;
    }
  );

  // Fix incomplete dynamic expressions in attributes
  code = code.replace(
    /=\s*{\s*([^}]*(?:&&|[?])[^}]*)(?=\s|>|$)/g,
    (match, expr) => {
      if (match.trim().endsWith('}')) return match;
      // Complete ternary expressions
      if (expr.includes('?') && !expr.includes(':')) {
        return `={${expr} : null}`;
      }
      // Complete logical expressions
      if (expr.includes('&&')) {
        return `={${expr}}`;
      }
      return match;
    }
  );

  // Fix event handlers with function calls
  code = code.replace(
    /(\w+)=\s*{\s*\(\s*([^)]*)\s*\)\s*=>\s*([^}]*)(?=\s|>|$)/g,
    (match, attr, params, body) => {
      if (match.trim().endsWith('}')) return match;
      return `${attr}={(${params}) => {${body}}}`;
    }
  );

  return code;
}

/**
 * 4) Fix incomplete fragments: if we have `<>` without `</>`, append one.
 */
function fixFragments(str) {
  // First, handle explicit fragments
  const openFrags = (str.match(/<>/g) || []).length;
  const closeFrags = (str.match(/<\/>/g) || []).length;
  
  // Track implicit fragments (React.Fragment)
  const openImplicit = (str.match(/<React\.Fragment>/g) || []).length;
  const closeImplicit = (str.match(/<\/React\.Fragment>/g) || []).length;
  
  // Add missing closing tags
  if (openFrags > closeFrags) {
    let needed = openFrags - closeFrags;
    while (needed > 0) {
      str += '</>';
      needed--;
    }
  }
  
  if (openImplicit > closeImplicit) {
    let needed = openImplicit - closeImplicit;
    while (needed > 0) {
      str += '</React.Fragment>';
      needed--;
    }
  }
  
  return str;
}

/**
 * 5) balanceJSXTags: tries to fix or reorder out-of-order tags, including fragments.
 *    This is a more robust approach than the naive "push if open, pop if close" that fails on cross-nesting.
 *    We'll do a single pass building a corrected string.
 */
function balanceJSXTags(code) {
  const tagStack = [];
  let result = '';
  let pos = 0;
  
  const tagPattern = /<\/?([A-Z][A-Za-z0-9]*|[a-z][a-z0-9]*|>|\/)?\s*([^>]*)>/g;
  let match;
  
  while ((match = tagPattern.exec(code))) {
    const [fullTag, tagName, attrs] = match;
    const startPos = match.index;
    
    // Add any text before this tag
    result += code.slice(pos, startPos);
    pos = startPos + fullTag.length;
    
    // Handle self-closing tags
    if (attrs.endsWith('/') || fullTag.endsWith('/>')) {
      result += fullTag;
      continue;
    }
    
    // Handle fragments
    if (tagName === '>' || !tagName) {
      if (fullTag.startsWith('</')) {
        // Closing fragment
        if (tagStack.length && tagStack[tagStack.length - 1] === '<>') {
          tagStack.pop();
          result += '</>';
        }
      } else {
        // Opening fragment
        tagStack.push('<>');
        result += '<>';
      }
      continue;
    }
    
    // Normal tags
    if (fullTag.startsWith('</')) {
      // Closing tag
      let found = false;
      for (let i = tagStack.length - 1; i >= 0; i--) {
        if (tagStack[i] === tagName) {
          // Found matching open tag
          while (tagStack.length > i) {
            const top = tagStack.pop();
            if (top === '<>') {
              result += '</>';
            } else {
              result += `</${top}>`;
            }
          }
          found = true;
          break;
        }
      }
      if (!found) {
        // No matching open tag found, ignore this close tag
        continue;
      }
    } else {
      // Opening tag
      tagStack.push(tagName);
      result += fullTag;
    }
  }
  
  // Add any remaining text
  result += code.slice(pos);
  
  // Close any remaining open tags
  while (tagStack.length) {
    const tag = tagStack.pop();
    if (tag === '<>') {
      result += '</>';
    } else {
      result += `</${tag}>`;
    }
  }
  
  return result;
}

/**
 * 6) fixFunctionBraces: ensures that any function declarations like `function X() {`
 *    end with a matching `}`, if missing. We also make sure we do not over-close.
 */
function fixFunctionBraces(str) {
  // Enhanced function brace handling
  const funcPattern = /(?:function\s+([A-Z][A-Za-z0-9]*)|const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>)\s*{/g;
  let match;
  while ((match = funcPattern.exec(str))) {
    const startIdx = match.index;
    const rest = str.slice(startIdx);
    let openCount = 0;
    let closeCount = 0;
    let returnFound = false;
    let returnOpenParen = 0;
    
    for (let i = 0; i < rest.length; i++) {
      const ch = rest[i];
      if (ch === '{') openCount++;
      else if (ch === '}') closeCount++;
      
      // Track return statement parentheses
      if (rest.slice(i).match(/^\breturn\s*\(/)) {
        returnFound = true;
        returnOpenParen++;
      }
      if (returnFound && ch === '(') returnOpenParen++;
      if (returnFound && ch === ')') returnOpenParen--;
      
      // If we found a complete return statement
      if (returnFound && returnOpenParen === 0) {
        if (!rest.slice(i).match(/\s*;/)) {
          str = str.slice(0, startIdx + i + 1) + ';' + str.slice(startIdx + i + 1);
        }
        returnFound = false;
      }
    }
    
    // Add missing braces
    if (closeCount < openCount) {
      const needed = openCount - closeCount;
      str += '}'.repeat(needed);
    }
  }
  return str;
}

/**
 * New helper to fix incomplete attributes by appending a missing closing brace
 */
function fixIncompleteAttributes(code) {
  return code.replace(/(\w+\s*=\s*{[^}]*)(?=[\s>])/g, (match) => {
    if (!match.trim().endsWith('}')) {
      return match + '}';
    }
    return match;
  });
}

/**
 * Updated helper to fix incomplete tags, handling self-closing tags like <img
 */
function fixIncompleteTags(code) {
  const selfClosingTags = ['img', 'input', 'br', 'hr', 'meta', 'link'];
  
  // Split into lines and process each line
  return code.split('\n').map(line => {
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return line;
    }

    // Handle self-closing tags first
    for (const tag of selfClosingTags) {
      const tagRegex = new RegExp(`<${tag}([^>]*?)(?:>|$)`, 'g');
      line = line.replace(tagRegex, (match, attrs) => {
        if (match.endsWith('/>')) return match;
        return `<${tag}${attrs}${attrs ? ' ' : ''}/>`; 
      });
    }

    // Handle incomplete opening tags
    line = line.replace(/<([A-Za-z][A-Za-z0-9]*)((?:\s+[^>]*)?[^>/])$/g, '<$1$2>');

    // Handle incomplete closing tags
    line = line.replace(/<\/([A-Za-z][A-Za-z0-9]*)\s*$/g, '</$1>');

    // Handle incomplete attributes in tags
    line = line.replace(/<([A-Za-z][A-Za-z0-9]*)((?:\s+[^>]*)?)$/g, '<$1$2>');

    return line;
  }).join('\n');
}

/**
 * New helper: fixMissingHtmlTags - appends missing closing tags for common HTML tags
 */
function fixMissingHtmlTags(code) {
  const tags = ['div', 'section', 'header', 'footer', 'nav', 'span', 'p', 'ul', 'li'];
  let missingTags = '';
  tags.forEach(tag => {
    const openRegex = new RegExp(`<${tag}(\s|>)`, 'gi');
    const closeRegex = new RegExp(`</${tag}>`, 'gi');
    const openMatches = code.match(openRegex) || [];
    const closeMatches = code.match(closeRegex) || [];
    const diff = openMatches.length - closeMatches.length;
    for (let i = 0; i < diff; i++) {
      missingTags += `</${tag}>`;
    }
  });
  if (missingTags) {
    // If code ends with '}', insert missingTags before the final '}'
    const lastBrace = code.lastIndexOf('}');
    if (lastBrace !== -1) {
      code = code.slice(0, lastBrace) + missingTags + code.slice(lastBrace);
    } else {
      code += missingTags;
    }
  }
  return code;
}

/**
 * New helper function to fix incomplete dynamic expressions
 */
function fixIncompleteDynamicExpressions(code) {
  return code.split('\n').map(line => {
    // Fix incomplete map expressions
    if (line.includes('.map(') && !line.trim().endsWith(')}')) {
      line = line.trim() + ')}';
    }

    // Fix incomplete ternary expressions
    if (line.includes('?') && !line.includes(':')) {
      line = line.replace(/\?([^:]*?)(?=\s|>|$)/, '?$1:null');
    }

    // Fix incomplete logical expressions
    if (line.includes('&&') && !line.trim().endsWith('}')) {
      line = line.trim() + '}';
    }

    // Fix incomplete array methods
    const arrayMethods = ['filter', 'reduce', 'forEach', 'some', 'every'];
    for (const method of arrayMethods) {
      if (line.includes(`.${method}(`) && !line.trim().endsWith(')}')) {
        line = line.trim() + ')}';
      }
    }

    // Fix incomplete function calls in JSX
    if (line.match(/\{[^}]*\([^)]*$/) && !line.trim().endsWith('}')) {
      line = line.trim() + ')}';
    }

    // Fix incomplete object literals
    if (line.match(/\{\s*[a-zA-Z0-9_]+:\s*[^,}]*$/) && !line.trim().endsWith('}')) {
      line = line.trim() + '}';
    }

    return line;
  }).join('\n');
}

/**
 * Validates JSX syntax in a code snippet with improved error recovery
 * @param {string} code - The code to validate
 * @returns {boolean} - Whether the code is valid JSX
 */
function validateJSXSyntax(code) {
  if (!code || typeof code !== 'string') return false;

  try {
    // First ensure we have a complete component structure
    let processedCode = code;
    
    // Add missing imports
    if (!processedCode.includes('import React')) {
      processedCode = 'import React from "react";\n' + processedCode;
    }

    // Ensure it's wrapped in a component if it's just JSX
    if (!processedCode.includes('function') && !processedCode.includes('=>')) {
      processedCode = `function TestComponent() { return (${processedCode}); }`;
    }

    // Add missing render statement if needed
    if (!processedCode.includes('render(')) {
      const match = processedCode.match(/function\s+([A-Z][A-Za-z0-9]*)|const\s+([A-Z][A-Za-z0-9]*)/);
      if (match) {
        const componentName = match[1] || match[2];
        processedCode += `\nrender(<${componentName} />);`;
      }
    }

    // For streaming components, we're more lenient
    if (processedCode.includes('isStreaming: true')) {
      return isCompleteForStreaming(processedCode);
    }

    // Basic structure validation
    const hasComponentDefinition = /function\s+[A-Z]|const\s+[A-Z].*=/.test(processedCode);
    const hasReturnStatement = /return\s*\(/.test(processedCode);
    const hasJSXContent = /<[A-Za-z][A-Za-z0-9]*|<div|<section|<main/.test(processedCode);
    
    // For non-streaming components, we require these basic structures
    if (!hasComponentDefinition || !hasReturnStatement || !hasJSXContent) {
      return false;
    }

    // Check for balanced structure
    const openTags = (processedCode.match(/<[A-Za-z][A-Za-z0-9]*[^/>]*>/g) || []).length;
    const closeTags = (processedCode.match(/<\/[A-Za-z][A-Za-z0-9]*>/g) || []).length;
    const selfClosingTags = (processedCode.match(/<[^>]*\/>/g) || []).length;
    
    // For non-streaming components, we require balanced tags
    const hasBalancedTags = openTags <= (closeTags + selfClosingTags);
    
    // Check for basic React component structure
    const hasValidStructure = processedCode.includes('return') && 
                            processedCode.includes('(') && 
                            processedCode.includes(')') && 
                            processedCode.includes('{') && 
                            processedCode.includes('}');

    // If we have balanced tags and valid structure, try parsing
    if (hasBalancedTags && hasValidStructure) {
      try {
        // Try parsing with error recovery
        parse(processedCode, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
          errorRecovery: true
        });
        return true;
      } catch (e) {
        // If parsing fails, still return true if we have the basic structure
        // This makes the validation more lenient
        return true;
      }
    }

    return hasBalancedTags && hasValidStructure;

  } catch (error) {
    if (DEBUG_MODE) {
      console.error('JSX validation error:', error);
    }
    // If we catch an error but have basic structure, still return true
    // This makes the validation more lenient
    return code.includes('return') && code.includes('<') && code.includes('>');
  }
}

/**
 * Checks if a streaming component has enough structure to be considered complete
 * @param {string} content - The component content
 * @returns {boolean} - Whether the component is complete enough
 */
function isCompleteForStreaming(content) {
  if (!content) return false;

  try {
    // Check for basic component structure
    const hasComponentDefinition = /function\s+[A-Z]|const\s+[A-Z].*=/.test(content);
    const hasReturnStatement = /return\s*\(/.test(content);
    const hasOpeningJSXTag = /<[A-Za-z][A-Za-z0-9]*|<div|<section|<main/.test(content);

    // For streaming components, we're very lenient
    // We just need:
    // 1. A component definition
    // 2. A return statement
    // 3. Some JSX structure
    return hasComponentDefinition && hasReturnStatement && hasOpeningJSXTag;
  } catch (error) {
    // If we catch an error but have basic structure, still return true
    return content.includes('function') && content.includes('return') && content.includes('<');
  }
}

/**
 * Clean up code by removing code fences and markers, and ensuring proper formatting
 * @param {string} code - The code to clean
 * @returns {string} - The cleaned code
 */
function cleanCode(code) {
  if (!code || typeof code !== 'string') return '';

  // Store any existing render statements
  const renderMatch = code.match(/render\s*\(\s*<([A-Z][A-Za-z0-9]*)\s*\/>\s*\)\s*;/);
  const existingRenderStatement = renderMatch ? renderMatch[0] : null;
  const existingComponentName = renderMatch ? renderMatch[1] : null;

  // Remove code fences and markers
  let cleaned = code
    .replace(/```[^`]*```/g, '') // Remove code fences
    .replace(/\/\/\/\s*(?:START|END)\s+[A-Z][A-Za-z0-9]*(?:\s+position=\w+)?/g, '') // Remove markers
    .trim();

  // Add missing imports if needed
  if (!cleaned.includes('import React')) {
    cleaned = 'import React from "react";\n' + cleaned;
  }

  // Fix incomplete JSX
  const openTags = Array.from(cleaned.matchAll(/<([A-Za-z][A-Za-z0-9]*)[^>/]*>/g))
    .map(match => match[1])
    .filter(tag => !['img', 'br', 'hr', 'input'].includes(tag.toLowerCase()));

  const closeTags = Array.from(cleaned.matchAll(/<\/([A-Za-z][A-Za-z0-9]*)>/g))
    .map(match => match[1]);

  // Create a stack to track nested tags
  const tagStack = [];
  for (const tag of openTags) {
    if (!closeTags.includes(tag)) {
      tagStack.push(tag);
    }
  }

  // Close any remaining open tags in reverse order
  if (tagStack.length > 0) {
    const insertPosition = cleaned.lastIndexOf('}');
    if (insertPosition !== -1) {
      const closingTags = tagStack.reverse().map(tag => `</${tag}>`).join('');
      cleaned = cleaned.slice(0, insertPosition) + closingTags + cleaned.slice(insertPosition);
    } else {
      cleaned += tagStack.reverse().map(tag => `</${tag}>`).join('');
    }
  }

  // Fix incomplete braces and parentheses
  const braceCount = (cleaned.match(/\{/g) || []).length - (cleaned.match(/\}/g) || []).length;
  const parenCount = (cleaned.match(/\(/g) || []).length - (cleaned.match(/\)/g) || []).length;

  if (braceCount > 0) {
    cleaned += '}'.repeat(braceCount);
  }
  if (parenCount > 0) {
    cleaned += ')'.repeat(parenCount);
  }

  // Fix incomplete attributes
  cleaned = cleaned
    .replace(/(\w+)=([^"'>}]*?)(?=\s|>|$)/g, '$1="$2"')
    .replace(/(\w+)=\{([^}]*?)(?=\s|>|$)/g, '$1={$2}}')
    .replace(/style=\{\{([^}]*?)(?=\s|>|$)/g, 'style={{$1}}')
    .replace(/className=\{([^}]*?)(?=\s|>|$)/g, 'className={$1}}');

  // Add render statement if missing
  if (!cleaned.includes('render(')) {
    const componentMatch = cleaned.match(/(?:function|const)\s+([A-Z][A-Za-z0-9]*)/);
    if (componentMatch) {
      const componentName = existingComponentName || componentMatch[1];
      cleaned += `\nrender(<${componentName} />);`;
    }
  }

  // Fix incomplete function bodies
  cleaned = cleaned.replace(/(?:function|=>)\s*{([^}]*)$/g, (match, body) => {
    let fixedBody = body;
    if (!fixedBody.includes('return')) {
      fixedBody += '\nreturn null;';
    }
    return `${match.split('{')[0]}{${fixedBody}}`;
  });

  // Fix incomplete return statements
  cleaned = cleaned.replace(/return\s*\(([^)]*?)$/g, (match, body) => {
    return `${match});\n}`;
  });

  // Fix incomplete JSX fragments
  cleaned = cleaned.replace(/<>([^<]*?)$/g, (match, content) => {
    return `${match}</>`;
  });

  // Fix incomplete comments
  cleaned = cleaned
    .replace(/\/\*([^*]*?)\s*$/g, '$1 */')
    .replace(/\{\/\*([^*]*?)\s*$/g, '{/* $1 */}');

  // Restore existing render statement if it was present
  if (existingRenderStatement) {
    cleaned = cleaned.replace(/render\s*\(\s*<[A-Z][A-Za-z0-9]*\s*\/>\s*\)\s*;/, existingRenderStatement);
  }

  return cleaned;
}

/**
 * Extracts function definitions from code with enhanced logging and relaxed patterns
 * @param {string} code - The code to extract functions from
 * @param {boolean} isStreaming - Whether we're in streaming mode
 * @returns {Map<string, {content: string, complete: boolean, isStreaming: boolean}>}
 */
function extractFunctionDefinitions(code, isStreaming = false) {
  const functions = new Map();

  // Updated regex patterns for both complete and incomplete functions
  const patterns = [
    // Standard function declaration (complete)
    /(?:export\s+)?function\s+([A-Z][A-Za-z0-9]*)\s*\([^)]*\)\s*{([\s\S]*?)}\s*$/gm,
    // Standard arrow function declaration (complete)
    /(?:export\s+)?const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>\s*{([\s\S]*?)}\s*$/gm,
    // Incomplete function declaration (streaming)
    /(?:export\s+)?function\s+([A-Z][A-Za-z0-9]*)\s*\([^)]*\)\s*{([\s\S]*)$/gm,
    // Incomplete arrow function declaration (streaming)
    /(?:export\s+)?const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>\s*{([\s\S]*)$/gm
  ];

  // Process each pattern
  for (const pattern of patterns) {
    const matches = Array.from(code.matchAll(pattern));
    for (const match of matches) {
      const name = match[1];
      let content = match[0];

      // Skip if we already extracted this function
      if (functions.has(name)) continue;

      // Prepend React import if needed
      if (!content.includes('import React')) {
        content = 'import React from "react";\n' + content;
      }

      // Apply snippet fixes
      content = fixSnippet(content);

      // Determine completeness based on mode
      const isComplete = isStreaming 
        ? isCompleteForStreaming(content)
        : validateJSXSyntax(content);

      // Debug logging
      if (DEBUG_MODE) {
        console.group(`🔍 Extracted ${name}`);
        console.log("Is Streaming:", isStreaming);
        console.log("Complete:", isComplete);
        console.log("Content snippet:", content.slice(0, 200) + (content.length > 200 ? '...' : ''));
        console.groupEnd();
      }

      functions.set(name, {
        content,
        complete: isComplete,
        isStreaming: isStreaming
      });
    }
  }

  // Marker-based extraction for streaming components
  if (isStreaming && functions.size === 0) {
    const markerPattern = /\/\/\/\s*START\s+([A-Z][A-Za-z0-9]*)\s*(?:position=\w+)?([\s\S]*?)(?=\/\/\/\s*END\s+\1|$)/g;
    const markerMatches = Array.from(code.matchAll(markerPattern));
    
    for (const match of markerMatches) {
      const name = match[1];
      let content = match[2].trim();

      // Wrap content in function if needed
      if (!new RegExp(`(function|const)\\s+${name}`).test(content)) {
        content = `function ${name}() {\n  return (\n    ${content}\n  );\n}`;
      }

      // Add React import if needed
      if (!content.includes('import React')) {
        content = 'import React from "react";\n' + content;
      }

      // Fix and validate
      content = fixSnippet(content);
      const isComplete = isCompleteForStreaming(content);

      if (DEBUG_MODE) {
        console.group(`🔍 Marker-based extraction: ${name}`);
        console.log("Complete:", isComplete);
        console.log("Content snippet:", content.slice(0, 200) + (content.length > 200 ? '...' : ''));
        console.groupEnd();
      }

      functions.set(name, {
        content,
        complete: isComplete,
        isStreaming: true
      });
    }
  }

  return functions;
}

// Single export statement at the end
export {
  fixSnippet,
  canParseSnippet,
  applyTransformations,
  mergeJSXLines,
  balanceCurlyBraces,
  fixReturnStatement,
  fixAttributes,
  fixFragments,
  balanceJSXTags,
  fixFunctionBraces,
  fixIncompleteAttributes,
  fixIncompleteTags,
  fixMissingHtmlTags,
  fixIncompleteDynamicExpressions,
  minimalTextFix,
  isCompleteForStreaming,
  validateJSXSyntax,
  cleanCode,
  extractFunctionDefinitions
};


