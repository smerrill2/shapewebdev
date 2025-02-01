import { DEBUG_MODE } from './config';
import * as ShadcnAll from './shadcnAll';

// Complete mapping of all compound components to their subcomponents
const COMPOUND_MAPPINGS = {
  // Layout & Navigation
  NavigationMenu: ['List', 'Item', 'Link', 'Content', 'Trigger', 'Viewport', 'Indicator'],
  DropdownMenu: ['Trigger', 'Content', 'Item', 'CheckboxItem', 'RadioItem', 'Label', 'Separator', 'Shortcut', 'SubTrigger', 'SubContent', 'Group'],
  Menubar: ['Menu', 'Trigger', 'Content', 'Item', 'Separator', 'Label', 'Shortcut', 'Group'],
  
  // Content & Cards
  Card: ['Header', 'Title', 'Description', 'Content', 'Footer'],
  Accordion: ['Item', 'Trigger', 'Content'],
  Table: ['Header', 'Body', 'Footer', 'Row', 'Cell', 'Head', 'Caption'],
  
  // Dialogs & Overlays
  Dialog: ['Trigger', 'Content', 'Header', 'Footer', 'Title', 'Description', 'Close'],
  AlertDialog: ['Trigger', 'Content', 'Header', 'Footer', 'Title', 'Description', 'Action', 'Cancel'],
  Sheet: ['Trigger', 'Content', 'Header', 'Footer', 'Title', 'Description', 'Close'],
  HoverCard: ['Trigger', 'Content'],
  Popover: ['Trigger', 'Content', 'Close'],
  
  // Form Elements
  Form: ['Item', 'Label', 'Control', 'Description', 'Message', 'Field'],
  Select: ['Trigger', 'Content', 'Item', 'Group', 'Label', 'Separator', 'Value'],
  RadioGroup: ['Item', 'Indicator'],
  
  // Navigation & Tabs
  Tabs: ['List', 'Trigger', 'Content'],
  Command: ['Input', 'List', 'Empty', 'Group', 'Item', 'Separator', 'Dialog', 'Loading'],
  
  // Other Components
  ScrollArea: ['Viewport', 'Scrollbar', 'Thumb', 'Corner'],
  ContextMenu: ['Trigger', 'Content', 'Item', 'Group', 'Label', 'Separator', 'Shortcut', 'SubContent', 'SubTrigger'],
  Toolbar: ['Button', 'Link', 'ToggleGroup', 'ToggleItem', 'Separator']
};

/**
 * Attaches subcomponents to their parent components
 * @param {string} baseName - The base component name (e.g., 'Card')
 * @returns {Object} - The component with its subcomponents attached
 */
export function createCompoundComponent(baseName) {
  if (DEBUG_MODE) {
    console.debug(`🏗 Creating compound component: ${baseName}`);
  }

  // Get the base component
  const BaseComponent = ShadcnAll[baseName];
  if (!BaseComponent) {
    console.warn(`Base component ${baseName} not found in ShadcnAll`);
    return null;
  }

  // Get the subcomponents list
  const subComponents = COMPOUND_MAPPINGS[baseName] || [];

  // Attach each subcomponent
  subComponents.forEach(subName => {
    const fullSubName = `${baseName}${subName}`;
    if (ShadcnAll[fullSubName]) {
      BaseComponent[subName] = ShadcnAll[fullSubName];
      if (DEBUG_MODE) {
        console.debug(`📎 Attached ${subName} to ${baseName}`);
      }
    } else {
      console.warn(`Subcomponent ${fullSubName} not found in ShadcnAll`);
    }
  });

  return BaseComponent;
}

// Pre-create all compound components
export const CompoundComponents = Object.fromEntries(
  Object.keys(COMPOUND_MAPPINGS).map(name => [
    name,
    createCompoundComponent(name)
  ])
); 