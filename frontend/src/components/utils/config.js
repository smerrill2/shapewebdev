// Debug and environment flags
export const DEBUG_MODE = process.env.NODE_ENV === 'development';
export const IS_TEST_ENV = process.env.NODE_ENV === 'test';

// Component categories
export const CRITICAL_COMPONENTS = new Set([
  'Header',
  'NavigationMenu',
  'RootLayout'
]);

// Namespaced components for compound handling
export const NAMESPACED_COMPONENTS = new Set([
  'NavigationMenu',
  'Card',
  'Dialog',
  'DropdownMenu'
]);

// Complete list of all compound components that need subcomponent attachment
export const COMPLETE_NAMESPACED_COMPONENTS = new Set([
  'Card',
  'NavigationMenu',
  'DropdownMenu',
  'Dialog',
  'Tabs',
  'Select',
  'ContextMenu',
  'Menubar',
  'AlertDialog',
  'HoverCard',
  'Popover',
  'Form',
  'Table',
  'Accordion',
  'Command',
  'RadioGroup',
  'ScrollArea',
  'Sheet',
  'Toolbar'
]);

// Component error states
export const ERROR_STATES = {
  // Compound component errors
  COMPOUND_TIMEOUT: 'COMPOUND_TIMEOUT',
  INCOMPLETE_COMPOUND: 'INCOMPLETE_COMPOUND',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_SYNTAX: 'INVALID_SYNTAX',
  MISSING_RETURN: 'MISSING_RETURN',
  
  // Runtime errors
  RENDER_ERROR: 'RENDER_ERROR',
  PROP_TYPE_ERROR: 'PROP_TYPE_ERROR',
  
  // System errors
  STREAM_ERROR: 'STREAM_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR'
};

// Component status types
export const COMPONENT_STATUS = {
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  ERROR: 'error',
  PENDING: 'pending'
};

// Valid component positions
export const VALID_POSITIONS = [
  // Layout positions
  'header',
  'main',
  'footer',
  'nav',
  'sidebar',
  // Content sections
  'hero',
  'features',
  'testimonials',
  'pricing',
  'cta',
  'contact',
  'content',
  'stats',
  'faq',
  'team',
  // Special handling
  'custom'
];

// React internal props to filter
export const REACT_INTERNAL_PROPS = new Set([
  '$$typeof',
  'render',
  'displayName',
  'defaultProps',
  'propTypes'
]);

// Timeouts and limits
export const TIMEOUTS = {
  COMPOUND_COMPONENT: 10000, // 10s for compound components
  COMPONENT_RENDER: 5000,    // 5s for individual component render
  STREAM_TIMEOUT: 30000,     // 30s for entire stream
  VALIDATION_TIMEOUT: 3000   // 3s for validation
};

// Component positions
export const POSITIONS = {
  HEADER: 'header',
  MAIN: 'main',
  FOOTER: 'footer',
  NAV: 'nav',
  SIDEBAR: 'sidebar',
  HERO: 'hero',
  FEATURES: 'features',
  TESTIMONIALS: 'testimonials',
  PRICING: 'pricing',
  CTA: 'cta',
  CONTACT: 'contact',
  CONTENT: 'content',
  STATS: 'stats',
  FAQ: 'faq',
  TEAM: 'team',
  CUSTOM: 'custom'
}; 