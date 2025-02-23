/**
 * Define components that are critical for the application's functionality
 * These components get special error handling and recovery treatment
 */
const CRITICAL_COMPONENTS = new Set([
  'Header',
  'NavigationMenu',
  'RootLayout'
]);

module.exports = CRITICAL_COMPONENTS; 