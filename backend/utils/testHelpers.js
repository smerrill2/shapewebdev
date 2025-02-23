/**
 * Checks if an ID is a test ID (starts with 'test-')
 * @param {string} id - The ID to check
 * @returns {boolean} - Whether the ID is a test ID
 */
const isTestId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return id.startsWith('test-');
};

module.exports = {
  isTestId
}; 