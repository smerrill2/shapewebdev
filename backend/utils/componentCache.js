const crypto = require('crypto');
const mongoose = require('mongoose');
const CachedComponent = require('../models/CachedComponent');

// Generate hash for component code
const generateHash = (code) => {
  if (!code) return '';
  return crypto.createHash('sha256').update(code).digest('hex');
};

// Extract component relationships from code
const extractRelationships = (code) => {
  if (!code) return [];
  const importRegex = /import\s+.*\s+from\s+['"]\.\/([^'"]+)['"]/g;
  const matches = [...code.matchAll(importRegex)];
  return matches.map(match => match[1]);
};

// Analyze component metadata
const analyzeComponent = (code) => {
  return {
    isComplete: code.includes('export default'),
    componentType: code.toLowerCase().includes('nav') ? 'navigation'
      : code.toLowerCase().includes('hero') ? 'hero'
      : code.toLowerCase().includes('footer') ? 'footer'
      : 'section',
    accessibility: {
      hasAriaLabels: /aria-label=["'][^"']+["']/.test(code),
      hasSemanticElements: /<(header|main|footer|nav|article|section|aside)[^>]*>/.test(code),
      hasImgAlts: !/<img[^>]+>/.test(code) || /<img[^>]+alt=["'][^"']+["']/.test(code)
    }
  };
};

const componentCache = {
  // Cache a new component using atomic upsert
  async cacheComponent(name, code, projectId, versionId) {
    try {
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid component code');
      }

      // Basic syntax validation
      const syntaxErrors = [];
      if (code.includes('(') && !code.includes(')')) {
        syntaxErrors.push('Mismatched parentheses');
      }
      if (code.includes('{') && !code.includes('}')) {
        syntaxErrors.push('Mismatched curly braces');
      }
      if (syntaxErrors.length > 0) {
        throw new Error(`Invalid component code: ${syntaxErrors.join(', ')}`);
      }

      const hash = generateHash(code);
      const childComponents = extractRelationships(code);
      const metadata = analyzeComponent(code);

      // Validate component code
      if (!metadata.isComplete) {
        throw new Error('Component code is incomplete - missing default export');
      }

      // Use findOneAndUpdate with upsert for atomic operation
      const cached = await CachedComponent.findOneAndUpdate(
        {
          projectId,
          hash,
        },
        {
          $setOnInsert: {
            name,
            code,
            hash,
            projectId,
            versionId,
            childComponents,
            metadata,
            createdAt: new Date(),
          },
          $set: {
            updatedAt: new Date()
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      return cached;
    } catch (error) {
      console.error('Error caching component:', error);
      throw error;
    }
  },

  // Get component by name and project
  async getComponent(name, projectId) {
    try {
      return await CachedComponent.findOne({
        name,
        projectId
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting component:', error);
      throw error;
    }
  },

  // Get all components for a project version
  async getProjectComponents(projectId, versionId) {
    try {
      return await CachedComponent.find({
        projectId,
        versionId
      });
    } catch (error) {
      console.error('Error getting project components:', error);
      throw error;
    }
  },

  // Get component hierarchy with improved error handling and performance
  async getComponentHierarchy(projectId, versionId) {
    try {
      // Convert string IDs to ObjectIds if they aren't already
      const projectObjId = typeof projectId === 'string' ? 
        new mongoose.Types.ObjectId(projectId) : projectId;
      const versionObjId = typeof versionId === 'string' ? 
        new mongoose.Types.ObjectId(versionId) : versionId;

      // Use aggregation pipeline for better performance
      const components = await CachedComponent.aggregate([
        {
          $match: {
            projectId: projectObjId,
            versionId: versionObjId
          }
        },
        {
          $project: {
            name: 1,
            childComponents: 1,
            metadata: 1,
            code: 1
          }
        }
      ]);

      const hierarchy = {};
      const roots = [];
      const errors = [];
      const hasParent = new Set();

      // Build hierarchy map with error handling for each component
      components.forEach(comp => {
        try {
          hierarchy[comp.name] = {
            component: comp,
            children: [],
            visited: false
          };
        } catch (error) {
          errors.push({
            componentName: comp.name,
            message: `Error processing component: ${error.message}`
          });
        }
      });

      // Connect parents and children with error handling
      components.forEach(comp => {
        try {
          if (comp.childComponents && comp.childComponents.length > 0) {
            comp.childComponents.forEach(childName => {
              if (hierarchy[childName]) {
                hierarchy[comp.name].children.push(hierarchy[childName]);
                hasParent.add(childName);
              } else {
                errors.push({
                  componentName: comp.name,
                  message: `Child component ${childName} not found`
                });
              }
            });
          }
        } catch (error) {
          errors.push({
            componentName: comp.name,
            message: `Error connecting component: ${error.message}`
          });
        }
      });

      // Add components without parents to roots
      components.forEach(comp => {
        if (!hasParent.has(comp.name)) {
          roots.push(hierarchy[comp.name]);
        }
      });

      // Detect circular dependencies
      const detectCircular = (node, path = []) => {
        const currentPath = [...path, node.component.name];
        
        // Check for circular dependency
        if (path.includes(node.component.name)) {
          errors.push({
            componentName: node.component.name,
            message: 'Circular dependency detected'
          });
          return;
        }

        // Process children
        for (const child of node.children) {
          detectCircular(child, currentPath);
        }
      };

      // Check each component for circular dependencies
      components.forEach(comp => {
        const node = hierarchy[comp.name];
        if (!node.visited) {
          node.visited = true;
          detectCircular(node);
        }
      });

      return {
        roots,
        errors: errors // Always return the errors array, even if empty
      };
    } catch (error) {
      console.error('Error getting component hierarchy:', error);
      throw error;
    }
  }
};

module.exports = componentCache; 