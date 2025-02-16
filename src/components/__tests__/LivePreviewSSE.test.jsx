import { cleanCodeForLive, applyTransformations, fixSnippet, minimalTextFix, cleanCode, fixIncompleteTags, fixReturnStatement, balanceJSXTags, fixMissingHtmlTags, mergeJSXLines, needsMerge } from '../utils/babelTransformations';

test('should handle streaming incomplete code', () => {
  const input = `return <header className="p-4
  `;
  const transformed = mergeJSXLines(input);
  expect(transformed).toBe(input);
}); 