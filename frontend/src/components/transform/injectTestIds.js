import * as t from '@babel/types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

/**
 * Adds a data-testid to the root JSX element if one does not exist.
 * @param {string} code - The code to transform
 * @param {Object} options - The options object
 * @param {string} [options.testId] - The test ID to add
 * @returns {string} - The transformed code
 */
export function injectTestIds(code, options = {}) {
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return '';
  }

  try {
    // If there's already a data-testid, don't add another one
    if (code.includes('data-testid=')) {
      return code;
    }

    // Extract component name for default testId
    let testId = options.testId;
    if (!testId) {
      const functionMatch = code.match(/(?:function|const|let)\s+([A-Z][A-Za-z0-9]*)/);
      testId = functionMatch ? functionMatch[1].toLowerCase() : 'component';
    }

    // Check if code contains JSX
    if (!code.includes('return') || !/<[A-Za-z]/.test(code)) {
      console.error('Error in injectTestIds: No JSX found in code');
      return code;
    }

    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });

    // Track if we've added a testId
    let hasAddedTestId = false;

    // Traverse the AST and add testId to the first JSX element in a return statement
    traverse(ast, {
      ReturnStatement(path) {
        if (hasAddedTestId) return;

        const argument = path.node.argument;
        if (t.isJSXElement(argument)) {
          // Wrap the JSX in parentheses if not already wrapped
          path.node.argument = t.parenthesizedExpression(argument);
          
          const openingElement = argument.openingElement;
          const hasTestId = openingElement.attributes.some(
            attr => t.isJSXAttribute(attr) && attr.name.name === 'data-testid'
          );

          if (!hasTestId) {
            openingElement.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('data-testid'),
                t.stringLiteral(testId)
              )
            );
            hasAddedTestId = true;
          }
        } else if (t.isParenthesizedExpression(argument) && t.isJSXElement(argument.expression)) {
          const openingElement = argument.expression.openingElement;
          const hasTestId = openingElement.attributes.some(
            attr => t.isJSXAttribute(attr) && attr.name.name === 'data-testid'
          );

          if (!hasTestId) {
            openingElement.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('data-testid'),
                t.stringLiteral(testId)
              )
            );
            hasAddedTestId = true;
          }
        }
      }
    });

    // Generate the code back from the AST
    const output = generate(ast, {
      retainLines: true,
      compact: false,
      jsescOption: {
        quotes: 'double'
      }
    });

    // Ensure semicolon after return statement
    let result = output.code;
    result = result.replace(/return\s*\([^;]+\)(?!\s*;)/g, '$&;');

    return result;
  } catch (error) {
    console.error('Error in injectTestIds:', error);
    return code;
  }
}

/**
 * Check if a JSX element is a root element in a component
 */
function isRootElement(path) {
  const parent = path.findParent(p => p.isReturnStatement());
  return (
    parent && 
    parent.findParent(p => p.isFunctionDeclaration() || p.isArrowFunctionExpression())
  );
}
