import React, { useState } from 'react';
import LivePreview from './LivePreview';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

// Lucide icons
import {
  Bell,
  Mail,
  Settings,
  Home,
  User,
  Trash,
  Calendar,
  Bike,
  Pizza,
  Car,
  MapPin,
  Navigation,
  Clock,
  AlertCircle,
  Phone,
  MessageSquare,
  ChevronDown,
  LogOut,
  HelpCircle,
  Terminal,
  ArrowRight,
  BarChart as Chart,
  ListTodo,
  Smartphone,
  Tablet,
  Monitor,
  Eye
} from 'lucide-react';

const sampleAIResponses = {
  singleComponent: {
    code: `\`\`\`jsx
const TransportationCard = () => {
  return (
    <Card className={cn(
      "hover:shadow-lg transition-shadow duration-200",
      "bg-gradient-to-r from-red-500 to-black",
      "text-white"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bike className="w-5 h-5" />
          Transportation
        </CardTitle>
        <CardDescription className="text-gray-200">Available vehicles nearby</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>4 cars</span>
          <MapPin className="w-5 h-5" />
        </div>
        <Button className="w-full bg-white/10 hover:bg-white/20">
          <Navigation className="w-4 h-4 mr-2" /> Get Directions
        </Button>
      </CardContent>
    </Card>
  );
};
\`\`\``
  },
  multipleComponents: {
    code: `\`\`\`jsx
const NotificationCard = () => {
  return (
    <div className="rounded-xl p-6 bg-gradient-to-r from-amber-500 to-orange-600">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <Bell className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-semibold text-white">New Message</h3>
            <p className="text-white/80 text-sm">You have 3 unread notifications</p>
          </div>
        </div>
        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
          View All
        </Button>
      </div>
    </div>
  );
};
\`\`\`

\`\`\`jsx
const ProfileCard = () => {
  return (
    <div className="rounded-xl p-6 bg-gradient-to-r from-violet-500 to-purple-600">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <User className="w-6 h-6 text-white" />
          <div>
            <h3 className="font-semibold text-white">User Profile</h3>
            <p className="text-white/80 text-sm">View and edit your profile</p>
          </div>
        </div>
        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white">
          Edit
        </Button>
      </div>
    </div>
  );
};
\`\`\``
  },
  noExport: {
    code: `\`\`\`jsx
const IconGrid = () => {
  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 rounded">
      <div className="flex flex-col items-center p-3 bg-white rounded shadow hover:shadow-md transition-shadow">
        <Mail className="w-8 h-8 text-blue-500" />
        <span className="mt-2 text-sm">Messages</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-white rounded shadow hover:shadow-md transition-shadow">
        <Calendar className="w-8 h-8 text-green-500" />
        <span className="mt-2 text-sm">Schedule</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-white rounded shadow hover:shadow-md transition-shadow">
        <Bell className="w-8 h-8 text-yellow-500" />
        <span className="mt-2 text-sm">Alerts</span>
      </div>
    </div>
  );
};
\`\`\``
  }
};

const TestAIResponse = () => {
  const [selectedTest, setSelectedTest] = useState('singleComponent');
  
  return (
    <div className="p-4">
      <div className="mb-4 space-x-4">
        <button 
          onClick={() => setSelectedTest('singleComponent')}
          className={selectedTest === 'singleComponent' ? 'px-3 py-1 rounded bg-blue-500 text-white' : 'px-3 py-1 rounded bg-gray-200'}
        >
          Single Component
        </button>
        <button 
          onClick={() => setSelectedTest('multipleComponents')}
          className={selectedTest === 'multipleComponents' ? 'px-3 py-1 rounded bg-blue-500 text-white' : 'px-3 py-1 rounded bg-gray-200'}
        >
          Multiple Components
        </button>
        <button 
          onClick={() => setSelectedTest('noExport')}
          className={selectedTest === 'noExport' ? 'px-3 py-1 rounded bg-blue-500 text-white' : 'px-3 py-1 rounded bg-gray-200'}
        >
          No Export
        </button>
      </div>
      
      <div className="mb-4">
        <h3 className="font-bold mb-2">Raw AI Response:</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
          {sampleAIResponses[selectedTest].code}
        </pre>
      </div>
      
      <div>
        <h3 className="font-bold mb-2">Live Preview:</h3>
        <LivePreview 
          code={sampleAIResponses[selectedTest].code}
          onComponentHover={() => {}}
        />
      </div>
    </div>
  );
};

export default TestAIResponse; 