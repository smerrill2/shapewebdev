/**
 * Parses a code snippet with component markers to extract metadata
 * @param {string} snippet - The code snippet to parse
 * @returns {Object} The parsed component data
 */
function parseSnippet(snippet) {
  // Match START marker with optional position
  const startMatch = snippet.match(/\/\/\/\s*START\s+(\w+)(?:\s+position=(\w+))?\s*\n/);
  if (!startMatch) {
    throw new Error('Invalid snippet format: Missing START marker');
  }

  // Match END marker
  const endMatch = snippet.match(/\/\/\/\s*END\s+(\w+)\s*(?:\n|$)/);
  if (!endMatch) {
    throw new Error('Invalid snippet format: Missing END marker');
  }

  const startComponentName = startMatch[1];
  const endComponentName = endMatch[1];

  if (startComponentName !== endComponentName) {
    throw new Error(`Mismatched component names: ${startComponentName} vs ${endComponentName}`);
  }

  return {
    componentName: startComponentName,
    position: startMatch[2] || 'main',
    code: snippet
  };
}

module.exports = {
  parseSnippet
}; 