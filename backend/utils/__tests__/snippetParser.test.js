const { parseSnippet } = require('../snippetParser');

describe('Snippet Parser', () => {
  it('should parse component markers correctly', () => {
    const input = `/// START HeroSection position=header
export function HeroSection() {
  return (
    <div>Hero Content</div>
  );
}
/// END HeroSection`;

    const result = parseSnippet(input);
    expect(result).toEqual({
      componentName: 'HeroSection',
      position: 'header',
      code: input
    });
  });

  it('should handle missing position', () => {
    const input = `/// START HeroSection
export function HeroSection() {
  return (
    <div>Hero Content</div>
  );
}
/// END HeroSection`;

    const result = parseSnippet(input);
    expect(result).toEqual({
      componentName: 'HeroSection',
      position: 'main',
      code: input
    });
  });

  it('should handle invalid markers', () => {
    const input = `export function HeroSection() {
  return (
    <div>Hero Content</div>
  );
}`;

    expect(() => parseSnippet(input)).toThrow('Invalid snippet format');
  });

  it('should handle mismatched component names', () => {
    const input = `/// START HeroSection position=header
export function HeroSection() {
  return (
    <div>Hero Content</div>
  );
}
/// END Footer`;

    expect(() => parseSnippet(input)).toThrow('Mismatched component names');
  });
}); 