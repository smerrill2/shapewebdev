/**
 * Fixes incomplete code snippets by adding missing tags, braces, etc.
 * @param {string} code - The code to fix
 * @returns {string} - The fixed code
 */
export function fixIncompleteJSX(code) {
  if (!code || typeof code !== 'string') return '';

  try {
    // 1. Clean up the code
    code = code
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();

    // 2. Fix function structure
    code = fixFunctionStructure(code);

    // 3. Fix JSX in return statements
    code = code.replace(
      /return\s*(?:\()?(<[^>]*>.*?)(?:\))?(?:;|\}|\n|$)/g,
      (match, jsxContent) => {
        // Extract the tag and its content
        const tagMatch = jsxContent.match(/<([A-Za-z][A-Za-z0-9]*)(.*?)>(.*?)$/);
        if (!tagMatch) return match;

        const [_, tag, attrs, content] = tagMatch;

        // Clean up attributes
        let cleanAttrs = attrs.trim();
        
        // Fix style attribute if present
        const styleMatch = cleanAttrs.match(/style\s*=\s*\{\s*\{([^}]*?)(?:\}\}|\}|>|\n|$)/);
        if (styleMatch) {
          const styleContent = styleMatch[1].trim()
            .replace(/[\n\s]+/g, ' ')
            .replace(/,$/, '')
            .replace(/[)};>]+$/, '')
            .replace(/\s+/g, ' ');

          // Remove old style attribute and add the fixed one
          cleanAttrs = cleanAttrs.replace(/style\s*=\s*\{\s*\{[^}]*?(?:\}\}|\}|>|\n|$)/, '');
          cleanAttrs = `style={{${styleContent}}} ${cleanAttrs}`;
        }

        // Add data-testid if not present
        if (!cleanAttrs.includes('data-testid')) {
          // Extract component name from the nearest function
          const componentMatch = code.match(/function\s+([A-Z][A-Za-z0-9]*)/);
          if (componentMatch) {
            const componentName = componentMatch[1];
            cleanAttrs = `data-testid="${componentName.toLowerCase()}" ${cleanAttrs}`;
          }
        }

        // Clean up content
        const cleanContent = content
          .replace(/^\s*>\s*/, '')  // Remove stray >
          .replace(/\s*}\s*$/, '')  // Remove stray }
          .trim();

        // Build the fixed JSX with proper parentheses
        return `return (<${tag} ${cleanAttrs.trim()}>${cleanContent}</${tag}>);`;
      }
    );

    // 4. Ensure React import
    if (!code.includes('import React')) {
      code = `import React from "react";\n${code}`;
    }

    return code;
  } catch (err) {
    console.error('Error in fixIncompleteJSX:', err);
    return code;
  }
}

/**
 * Fix function structure to ensure proper braces
 */
function fixFunctionStructure(code) {
  // Match function declarations and their content
  return code.replace(
    /function\s+([A-Z][A-Za-z0-9]*)\s*\([^)]*\)\s*{?([\s\S]*?)(?:}|$)/g,
    (match, name, body) => {
      // Clean up the function body
      const cleanBody = body.trim()
        .replace(/^\s*{/, '')     // Remove leading {
        .replace(/}\s*$/, '')     // Remove trailing }
        .trim();

      // Reconstruct the function with proper structure
      return `function ${name}() {\n  ${cleanBody}\n}`;
    }
  );
}

/**
 * Fix style attributes specifically
 */
function fixStyleAttributes(code) {
  // First, find any style attributes that might be incomplete
  code = code.replace(
    /style\s*=\s*\{\s*\{([^>}]*?)(?:\}\}|\}|>|\n|$)/g,
    (match, styleContent) => {
      // Clean up the style content
      const cleanContent = styleContent
        .trim()
        .replace(/[\n\s]+/g, ' ')
        .replace(/,$/, '')
        .replace(/[)};>]+$/, '')
        .replace(/\s+/g, ' ')
        .replace(/^['"]|['"]$/g, ''); // Remove any quotes around the entire content

      // Ensure proper style attribute format
      return `style={{${cleanContent}}}`;
    }
  );

  // Second pass: fix any remaining malformed style attributes
  code = code.replace(
    /<([A-Za-z][A-Za-z0-9]*)((?:\s+(?!style)[^>]*)?)\s*style\s*=\s*([^>]*?)(?=>|\s|$)/g,
    (match, tag, otherAttrs, styleContent) => {
      // If it's already properly formatted, leave it alone
      if (styleContent.match(/^\{\{.*\}\}$/)) {
        return match;
      }

      // Clean up the style content
      const cleanContent = styleContent
        .trim()
        .replace(/^\{+|\}+$/g, '') // Remove extra braces
        .replace(/[\n\s]+/g, ' ')
        .replace(/,$/, '')
        .replace(/[)};>]+$/, '')
        .replace(/\s+/g, ' ')
        .replace(/^['"]|['"]$/g, ''); // Remove any quotes

      return `<${tag}${otherAttrs || ''} style={{${cleanContent}}}`; 
    }
  );

  return code;
}

/**
 * Fix return statements to ensure proper JSX structure
 */
function fixReturnStatement(code) {
  return code.replace(
    /return\s*(<[^>]*>.*?<\/[^>]*>|[^;]*?)(?:;|\}|\n|$)/g,
    (match, content) => {
      content = content.trim();
      
      // If truly empty, return null
      if (!content) {
        return 'return null;';
      }

      // If we have JSX content
      if (content.includes('<')) {
        // First, extract the JSX opening tag and its attributes
        const jsxMatch = content.match(/<([A-Za-z][A-Za-z0-9]*)((?:\s+[^>]*)??)(?:>|\s*$|\n)(.*)/);
        if (jsxMatch) {
          const [_, tag, attrs = '', rest = ''] = jsxMatch;
          
          // Clean up attributes, focusing on style
          let cleanAttrs = attrs.trim();
          const styleMatch = cleanAttrs.match(/style\s*=\s*\{\s*\{([^>}]*?)(?:\}\}|\}|>|\n|$)/);
          if (styleMatch) {
            const styleContent = styleMatch[1].trim()
              .replace(/[\n\s]+/g, ' ')
              .replace(/,$/, '')
              .replace(/[)};>]+$/, '')
              .replace(/\s+/g, ' ');
            
            // Remove the original style attribute and add the cleaned one
            cleanAttrs = cleanAttrs.replace(/style\s*=\s*\{\s*\{[^>}]*?(?:\}\}|\}|>|\n|$)/, '');
            cleanAttrs = `style={{${styleContent}}} ${cleanAttrs}`;
          }
          
          // Clean up the rest of the content
          let cleanRest = rest.trim()
            .replace(/^\s*>\s*/, '') // Remove any stray '>'
            .replace(/\s*}\s*$/, '') // Remove any stray '}'
            .replace(/\s+/g, ' '); // Normalize spaces
          
          // Build the complete JSX
          const fixedJSX = `<${tag} ${cleanAttrs.trim()}>${cleanRest}</${tag}>`;
          
          return `return (${fixedJSX});`;
        }
      }

      // For non-JSX content
      if (!content.startsWith('(')) {
        content = `(${content}`;
      }
      if (!content.endsWith(')')) {
        content = `${content})`;
      }
      
      return `return ${content};`;
    }
  );
}

/**
 * Fix incomplete tags
 */
function fixIncompleteTags(code) {
  // First pass: fix unclosed tags
  code = code.replace(
    /<([A-Za-z][A-Za-z0-9]*)((?:\s+[^>]*)??)(?:>|\s*$|\n)/g,
    (match, tag, attrs) => {
      if (match.endsWith('>')) return match;
      return `<${tag}${attrs ? ' ' + attrs.trim() : ''}>`;
    }
  );

  // Second pass: ensure all tags are closed
  const tagStack = [];
  let result = '';
  
  // Match all tags and content
  const tagRegex = /<\/?([A-Za-z][A-Za-z0-9]*)[^>]*>|([^<]+)/g;
  let match;

  while ((match = tagRegex.exec(code)) !== null) {
    const [fullMatch, tagName, text] = match;
    
    if (text) {
      // Handle text content
      result += text.trim();
    } else if (fullMatch.startsWith('</')) {
      // Handle closing tag
      const lastOpenTag = tagStack[tagStack.length - 1];
      if (lastOpenTag === tagName) {
        tagStack.pop();
        result += fullMatch;
      }
    } else if (!fullMatch.endsWith('/>')) {
      // Handle opening tag
      tagStack.push(tagName);
      result += fullMatch;
    } else {
      // Handle self-closing tag
      result += fullMatch;
    }
  }

  // Close any remaining tags
  while (tagStack.length > 0) {
    const tag = tagStack.pop();
    result += `</${tag}>`;
  }

  return result;
}
