// Debug flags
export const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Component configuration
export const REACT_INTERNAL_PROPS = new Set([
  '$$typeof',
  'render',
  'displayName'
]);

// Complete list of all compound components that need subcomponent attachment
export const NAMESPACED_COMPONENTS = new Set([
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