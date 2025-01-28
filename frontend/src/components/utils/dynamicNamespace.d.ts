import { ComponentType } from 'react';

// Simple base props - allows anything since AI can generate any props
export interface DynamicComponentProps {
  [key: string]: any;
}

// Simple dynamic component type that can be infinitely nested
export type DynamicComponent = ComponentType<DynamicComponentProps> & {
  [subcomponent: string]: DynamicComponent;
};

// Main function type for creating dynamic namespaces
export declare function createDynamicNamespace(
  baseName: string,
  config?: {
    elementMap?: { [key: string]: string };
    defaultProps?: { [key: string]: any };
  }
): DynamicComponent;

// Example usage in ESSENTIAL_SCOPE:
export interface TypographyNamespace {
  H1: DynamicComponent;
  H2: DynamicComponent;
  H3: DynamicComponent;
  H4: DynamicComponent;
  H5: DynamicComponent;
  H6: DynamicComponent;
  P: DynamicComponent;
  // Can be extended with any dynamic subcomponent
  [key: string]: DynamicComponent;
}

export interface NavigationNamespace {
  List: DynamicComponent;
  Item: DynamicComponent;
  Link: DynamicComponent;
  Trigger: DynamicComponent;
  Content: DynamicComponent;
  Viewport: DynamicComponent;
  // Can be extended with any dynamic subcomponent
  [key: string]: DynamicComponent;
}

// Define button-specific props
export interface ButtonProps extends DynamicComponentProps {
  variant?: 'default' | 'outline' | 'ghost';
}

export interface ButtonNamespace {
  Primary: DynamicComponent<ButtonProps>;
  Secondary: DynamicComponent<ButtonProps>;
  Ghost: DynamicComponent<ButtonProps>;
  Link: DynamicComponent<ButtonProps>;
  // Can be extended with any dynamic subcomponent
  [key: string]: DynamicComponent<ButtonProps>;
}

// Type for the entire ESSENTIAL_SCOPE
export interface EssentialScope {
  Typography: TypographyNamespace;
  NavigationMenu: NavigationNamespace;
  Button: ButtonNamespace;
  Icons: {
    [iconName: string]: DynamicComponent;
  };
  [key: string]: any;
} 
