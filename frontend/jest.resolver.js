const path = require('path');
const defaultResolver = require('jest-resolve').default;

module.exports = (request, options) => {
  if (request.includes('@bundled-es-modules/tough-cookie')) {
    return path.resolve(
      __dirname,
      'node_modules',
      '@bundled-es-modules',
      'tough-cookie',
      'index-esm.js'
    );
  }
  return defaultResolver(request, options);
};
