import * as t from '@babel/types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

/**
 * Adds a data-testid to the root JSX element if one does not exist.
 * @param {string} code - The code to transform
 * @param {string} testId - The test ID to add
 * @returns {string} - The transformed code
 */
export function injectTestIds(code, testId) {
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return '';
  }

  try {
    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    let componentName = null;
    let hasExistingTestId = false;

    traverse(ast, {
      FunctionDeclaration(path) {
        // Identify the component name (for fallback testId)
        if (path.node.id && /^[A-Z]/.test(path.node.id.name)) {
          componentName = path.node.id.name;
        }
      },
      VariableDeclarator(path) {
        // Similarly handle `const SomeComponent = () => { ... }`
        if (path.node.id && /^[A-Z]/.test(path.node.id.name)) {
          componentName = path.node.id.name;
        }
      },
      JSXElement(path) {
        // Check if this is the "root" element returned by the function
        if (isRootElement(path)) {
          const existingTestIdAttr = path.node.openingElement.attributes.find(
            attr => attr.type === 'JSXAttribute' && attr.name.name === 'data-testid'
          );
          if (existingTestIdAttr) {
            hasExistingTestId = true;
          } else {
            // Add new data-testid
            const finalTestId = testId || (componentName ? componentName.toLowerCase() : 'component');
            path.node.openingElement.attributes.push(
              t.jsxAttribute(t.jsxIdentifier('data-testid'), t.stringLiteral(finalTestId))
            );
          }
        }
      }
    });

    // Generate code back from AST
    let output = generate(ast, {}, code).code;

    // NOTE: We do NOT add a final render call or import React here,
    // because applyTransformations.js already handles that.

    return output;
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
