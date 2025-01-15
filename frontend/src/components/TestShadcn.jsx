import React from 'react';
import { Button } from './ui/button';
import iconRegistry from '../utils/iconRegistry';

const TestShadcn = () => {
  // Get icons from registry
  const {
    Mail,
    Trash,
    Github,
    Bell,
    Settings,
    Calendar,
    User,
    Plus,
    Loader: LoaderIcon,
    ArrowLeft,
    ArrowRight
  } = iconRegistry.preBundledIcons;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-6">Shadcn Button Test</h1>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Default Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Default Button
          </Button>
          <Button variant="destructive">
            <Trash className="mr-2 h-4 w-4" />
            Destructive
          </Button>
          <Button variant="outline">
            <Github className="mr-2 h-4 w-4" />
            Outline
          </Button>
          <Button variant="secondary">
            <Bell className="mr-2 h-4 w-4" />
            Secondary
          </Button>
          <Button variant="ghost">
            <Settings className="mr-2 h-4 w-4" />
            Ghost
          </Button>
          <Button variant="link">
            <Calendar className="mr-2 h-4 w-4" />
            Link
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Size Variants</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button size="sm">
            <User className="mr-2 h-3 w-3" />
            Small
          </Button>
          <Button size="default">
            <User className="mr-2 h-4 w-4" />
            Default
          </Button>
          <Button size="lg">
            <User className="mr-2 h-5 w-5" />
            Large
          </Button>
          <Button size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">States</h2>
        <div className="flex flex-wrap gap-4">
          <Button disabled>
            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
            Loading
          </Button>
          <Button variant="destructive" disabled>
            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </Button>
          <Button variant="outline" disabled>
            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
            Please wait
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">With Icons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="secondary">
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestShadcn; 