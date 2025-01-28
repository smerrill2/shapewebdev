const mongoose = require('mongoose');
const CachedComponent = require('../models/CachedComponent');

const validateComponentCode = (code) => {
  if (!code.includes('export default')) {
    throw new Error('Component must have an export default statement');
  }
  if (!code.includes('function')) {
    throw new Error('Component must be a function');
  }
  if (!code.includes('return')) {
    throw new Error('Component must return JSX');
  }
  
  // Check for matching parentheses and braces
  let parentheses = 0;
  let braces = 0;
  
  for (const char of code) {
    if (char === '(') parentheses++;
    if (char === ')') parentheses--;
    if (char === '{') braces++;
    if (char === '}') braces--;
    
    if (parentheses < 0 || braces < 0) {
      throw new Error('Mismatched parentheses or braces');
    }
  }
  
  if (parentheses !== 0 || braces !== 0) {
    throw new Error('Mismatched parentheses or braces');
  }
};

const getImports = (code) => {
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
};

const detectCircularDependencies = async (componentName, projectId, versionId, visited = new Set()) => {
  if (visited.has(componentName)) {
    return [{
      componentName,
      message: 'Circular dependency detected'
    }];
  }
  
  visited.add(componentName);
  
  const component = await CachedComponent.findOne({
    name: componentName,
    projectId,
    versionId
  });
  
  if (!component) {
    return [{
      componentName,
      message: 'Component not found'
    }];
  }
  
  const errors = [];
  const imports = getImports(component.code);
  
  for (const importPath of imports) {
    const importName = importPath.split('/').pop();
    const childErrors = await detectCircularDependencies(importName, projectId, versionId, new Set(visited));
    if (childErrors && childErrors.length > 0) {
      errors.push(...childErrors);
    }
  }
  
  return errors;
};

const cacheComponent = async (name, code, projectId, versionId) => {
  validateComponentCode(code);
  
  const component = await CachedComponent.findOneAndUpdate(
    { name, projectId, versionId },
    { code },
    { upsert: true, new: true }
  );
  
  return component;
};

const getComponentHierarchy = async (projectId, versionId) => {
  const components = await CachedComponent.find({ projectId, versionId });
  const errors = [];
  
  for (const component of components) {
    const circularErrors = await detectCircularDependencies(component.name, projectId, versionId);
    if (circularErrors) {
      errors.push(...circularErrors);
    }
  }
  
  return errors;
};

module.exports = {
  cacheComponent,
  getComponentHierarchy
}; 