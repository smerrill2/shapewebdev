import { cleanCode } from '../transform/cleanCode';
import { fixIncompleteJSX } from '../transform/fixIncompleteJSX';
import { applyTransformations } from '../transform/applyTransformations';

test('should handle streaming incomplete code', () => {
  const input = `return <header className="p-4
  `;
  const transformed = fixIncompleteJSX(input);
  expect(transformed).toBe(input);
}); 