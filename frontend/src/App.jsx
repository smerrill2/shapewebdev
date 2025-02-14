import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import LivePreviewTestPage from './test/LivePreviewTestPage';
import MockPreviewPage from './components/MockPreviewPage';
import { ThemeProvider } from 'next-themes';

const Navigation = () => (
  <nav className="p-4 border-b">
    <ul className="flex space-x-4">
      <li>
        <Link to="/" className="text-primary hover:underline">
          Home
        </Link>
      </li>
      <li>
        <Link to="/mock" className="text-primary hover:underline">
          Mock Preview
        </Link>
      </li>
      <li>
        <Link to="/test" className="text-primary hover:underline">
          Live Preview Tests
        </Link>
      </li>
    </ul>
  </nav>
);

const HomePage = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Welcome to ShapeWeb</h1>
    <p>Choose a page from the navigation above to get started.</p>
  </div>
);

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="container mx-auto">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/mock" element={<MockPreviewPage />} />
              <Route path="/test" element={<LivePreviewTestPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App; 