const { looksLikeCode, splitMixedContent, extractComponentName } = require('../aiClient');

describe('aiClient Parser', () => {
  describe('looksLikeCode', () => {
    test('identifies component markers', () => {
      const context = {};
      const result = looksLikeCode('/* Component: HeroSection */', context);
      expect(result).toBe(true);
      expect(context.metadata.componentName).toBe('HeroSection');
    });

    test('identifies design/planning content', () => {
      const context = {};
      expect(looksLikeCode('Design Vision: Create a modern landing page')).toBe(false);
      expect(looksLikeCode('Planned Components: Hero, Features')).toBe(false);
    });

    test('detects dependencies', () => {
      const context = {};
      const result = looksLikeCode(`
        import React from 'react';
        import { Button } from './ui/button';
      `, context);
      expect(result).toBe(true);
      expect(context.metadata.hasDependencies).toBe(true);
      expect(context.metadata.dependencies).toContain('react');
    });

    test('identifies JSX patterns', () => {
      const context = {};
      const result = looksLikeCode(`
        return (
          <div className="hero">
            <h1>{title}</h1>
          </div>
        );
      `, context);
      expect(result).toBe(true);
      expect(context.metadata.hasJSX).toBe(true);
    });
  });

  describe('splitMixedContent', () => {
    test('separates thoughts from code', () => {
      const result = splitMixedContent(`
        Let's create a hero section with a gradient background.
        /* Component: HeroSection */
        export const HeroSection = () => {
          return <div>Hero Content</div>;
        }
      `);
      expect(result.thoughts).toBeTruthy();
      expect(result.code).toContain('Component: HeroSection');
      expect(result.metadata.componentName).toBe('HeroSection');
    });

    test('identifies planning sections', () => {
      const result = splitMixedContent(`
        Design Vision:
        - Modern and clean interface
        - Gradient backgrounds
        - Smooth animations
      `);
      expect(result.metadata.type).toBe('planning');
      expect(result.thoughts).toBeTruthy();
      expect(result.code).toBeNull();
    });

    test('handles pure code blocks', () => {
      const result = splitMixedContent(`
        /* Component: FeatureGrid */
        export const FeatureGrid = () => {
          return <div>Features</div>;
        }
      `);
      expect(result.thoughts).toBe('');
      expect(result.code).toBeTruthy();
      expect(result.metadata.type).toBe('component');
    });
  });

  describe('extractComponentName', () => {
    test('extracts valid component names', () => {
      expect(extractComponentName('/* Component: HeroSection */')).toBe('HeroSection');
      expect(extractComponentName('/* Component: FeatureGrid */')).toBe('FeatureGrid');
    });

    test('handles invalid markers', () => {
      expect(extractComponentName('/* Not a component */')).toBeNull();
      expect(extractComponentName('/* Component: 123 */')).toBeNull();
    });

    test('extracts names from mixed content', () => {
      const text = `
        Some thoughts here
        /* Component: NavBar */
        const code = true;
      `;
      expect(extractComponentName(text)).toBe('NavBar');
    });
  });
}); 