const MarkerValidator = require('../../utils/markerValidator');

describe('MarkerValidator', () => {
  describe('Basic Marker Validation', () => {
    test('valid START marker', () => {
      const markerStr = '/// START HeroSection position=header';
      const result = MarkerValidator.validateMarker(markerStr);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('START');
      expect(result.name).toBe('HeroSection');
      expect(result.position).toBe('header');
    });

    test('valid END marker with matching name', () => {
      const markerStr = '/// END HeroSection';
      const result = MarkerValidator.validateMarker(markerStr, 'HeroSection');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('END');
      expect(result.name).toBe('HeroSection');
    });

    test('invalid marker format', () => {
      const markerStr = '/// STARTHeroSection';
      const result = MarkerValidator.validateMarker(markerStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/does not match required pattern/i);
    });
  });

  describe('Whitespace and Formatting', () => {
    test('whitespace normalization', () => {
      const markerWithWeirdSpaces = '///    START    HeroSection    position=header   ';
      const result = MarkerValidator.validateMarker(markerWithWeirdSpaces);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('START');
      expect(result.name).toBe('HeroSection');
      expect(result.position).toBe('header');
    });

    test('handles Unicode whitespace characters', () => {
      const markerWithUnicode = '///\u2000START\u2001HeroSection\u2002position=header\u2003';
      const result = MarkerValidator.validateMarker(markerWithUnicode);
      expect(result.isValid).toBe(true);
      expect(result.name).toBe('HeroSection');
    });

    test('normalizes multiple consecutive spaces', () => {
      const markerWithMultipleSpaces = '///   START     HeroSection      position=header';
      const result = MarkerValidator.validateMarker(markerWithMultipleSpaces);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('START');
    });
  });

  describe('Position Validation', () => {
    test('invalid position value', () => {
      const markerStr = '/// START HeroSection position=invalid';
      const result = MarkerValidator.validateMarker(markerStr);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/Invalid position/);
    });

    test('defaults to main position when not specified', () => {
      const markerStr = '/// START HeroSection';
      const result = MarkerValidator.validateMarker(markerStr);
      expect(result.isValid).toBe(true);
      expect(result.position).toBe('main');
    });

    test('accepts all valid positions', () => {
      const positions = ['main', 'header', 'footer'];
      positions.forEach(pos => {
        const markerStr = `/// START HeroSection position=${pos}`;
        const result = MarkerValidator.validateMarker(markerStr);
        expect(result.isValid).toBe(true);
        expect(result.position).toBe(pos);
      });
    });
  });

  describe('Component Name Validation', () => {
    test('component name normalization', () => {
      const name = 'HHeroSection';
      const normalized = MarkerValidator.normalizeComponentName(name);
      expect(normalized).toBe('HeroSection');
    });

    test('validates component name format', () => {
      const validNames = ['HeroSection', 'NavbarComponent', 'FooterLayout'];
      const invalidNames = ['heroSection', '1Component', 'invalid-name'];

      validNames.forEach(name => {
        expect(MarkerValidator.isValidComponentName(name)).toBe(true);
      });

      invalidNames.forEach(name => {
        expect(MarkerValidator.isValidComponentName(name)).toBe(false);
      });
    });

    test('END marker mismatch', () => {
      const markerStr = '/// END FooterSection';
      const result = MarkerValidator.validateMarker(markerStr, 'HeaderSection');
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/END marker mismatch/i);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles null or undefined input', () => {
      expect(MarkerValidator.validateMarker(null).isValid).toBe(false);
      expect(MarkerValidator.validateMarker(undefined).isValid).toBe(false);
      expect(MarkerValidator.validateMarker('').isValid).toBe(false);
    });

    test('handles incomplete markers', () => {
      const incompleteMarkers = [
        '/// STA',
        '/// START',
        '/// END',
        '///',
      ];

      incompleteMarkers.forEach(marker => {
        const result = MarkerValidator.validateMarker(marker);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    test('handles malformed position attribute', () => {
      const malformedMarkers = [
        '/// START Component position=',
        '/// START Component position',
        '/// START Component position= main',
      ];

      malformedMarkers.forEach(marker => {
        const result = MarkerValidator.validateMarker(marker);
        expect(result.isValid).toBe(false);
      });
    });
  });
}); 