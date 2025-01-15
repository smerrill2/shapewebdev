import * as LucideIcons from 'lucide-react';

// Pre-bundled icons that are commonly used
export const preBundledIcons = {
  // Navigation
  ChevronRight: LucideIcons.ChevronRight,
  ChevronLeft: LucideIcons.ChevronLeft,
  ChevronUp: LucideIcons.ChevronUp,
  ChevronDown: LucideIcons.ChevronDown,
  ArrowRight: LucideIcons.ArrowRight,
  ArrowLeft: LucideIcons.ArrowLeft,
  Menu: LucideIcons.Menu,
  
  // Actions
  Plus: LucideIcons.Plus,
  Minus: LucideIcons.Minus,
  X: LucideIcons.X,
  Check: LucideIcons.Check,
  Search: LucideIcons.Search,
  Settings: LucideIcons.Settings,
  
  // Common
  User: LucideIcons.User,
  Mail: LucideIcons.Mail,
  Calendar: LucideIcons.Calendar,
  Clock: LucideIcons.Clock,
  Home: LucideIcons.Home,
  
  // Status/Feedback
  AlertCircle: LucideIcons.AlertCircle,
  CheckCircle: LucideIcons.CheckCircle,
  XCircle: LucideIcons.XCircle,
  Info: LucideIcons.Info,
  Loader: LucideIcons.Loader2
};

class IconRegistry {
  constructor() {
    this.icons = new Map();
    // Pre-load commonly used icons
    Object.entries(preBundledIcons).forEach(([name, component]) => {
      this.icons.set(name.toLowerCase(), component);
    });
  }

  async getIcon(name) {
    const normalizedName = name.toLowerCase();
    
    // Check if icon is already loaded
    if (this.icons.has(normalizedName)) {
      return this.icons.get(normalizedName);
    }

    // If not in registry, try to get it from Lucide
    if (name in LucideIcons) {
      const icon = LucideIcons[name];
      this.icons.set(normalizedName, icon);
      return icon;
    }

    console.warn(`Icon "${name}" not found in Lucide icons`);
    return LucideIcons.HelpCircle; // Fallback icon
  }

  hasIcon(name) {
    return this.icons.has(name.toLowerCase()) || name in LucideIcons;
  }

  getAllIconNames() {
    return Object.keys(LucideIcons);
  }
}

export const iconRegistry = new IconRegistry();
export default iconRegistry; 