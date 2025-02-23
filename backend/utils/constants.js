// backend/utils/constants.js

// Define compound component relationships with validation patterns
const COMPOUND_COMPONENTS = {
  NavigationMenu: {
    subcomponentPatterns: {
      List: /NavigationMenuList/,
      Item: /NavigationMenuItem/,
      Link: /NavigationMenuLink/,
      Content: /NavigationMenuContent/,
      Trigger: /NavigationMenuTrigger/,
      Viewport: /NavigationMenuViewport/
    }
  },
  Card: {
    subcomponentPatterns: {
      Header: /Card\.Header/,
      Title: /Card\.Title/,
      Description: /Card\.Description/,
      Content: /Card\.Content/,
      Footer: /Card\.Footer/
    }
  },
  Dialog: {
    subcomponentPatterns: {
      Trigger: /Dialog\.Trigger/,
      Content: /Dialog\.Content/,
      Header: /Dialog\.Header/,
      Footer: /Dialog\.Footer/,
      Title: /Dialog\.Title/,
      Description: /Dialog\.Description/,
      Close: /Dialog\.Close/
    }
  },
  DropdownMenu: {
    subcomponentPatterns: {
      Trigger: /DropdownMenu\.Trigger/,
      Content: /DropdownMenu\.Content/,
      Item: /DropdownMenu\.Item/,
      CheckboxItem: /DropdownMenu\.CheckboxItem/,
      RadioItem: /DropdownMenu\.RadioItem/,
      Label: /DropdownMenu\.Label/,
      Separator: /DropdownMenu\.Separator/,
      Shortcut: /DropdownMenu\.Shortcut/,
      SubTrigger: /DropdownMenu\.SubTrigger/,
      SubContent: /DropdownMenu\.SubContent/,
      Group: /DropdownMenu\.Group/
    }
  }
};

// Critical components that need error recovery
const CRITICAL_COMPONENTS = new Set([
  'Header',
  'NavigationMenu',
  'RootLayout'
]);

module.exports = {
  COMPOUND_COMPONENTS,
  CRITICAL_COMPONENTS
}; 