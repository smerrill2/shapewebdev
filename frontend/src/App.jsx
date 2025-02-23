import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { StreamingTestPage } from './components/streaming/TestPage';
import { ThemeProvider } from 'next-themes';

const Navigation = () => (
  <nav className="p-4 border-b bg-card">
    <div className="container mx-auto">
      <ul className="flex space-x-4">
        <li>
          <Link to="/" className="text-primary hover:underline">
            Home
          </Link>
        </li>
        <li>
          <Link to="/preview" className="text-primary hover:underline">
            Component Preview
          </Link>
        </li>
      </ul>
    </div>
  </nav>
);

const HomePage = () => (
  <div className="container mx-auto p-8">
    <h1 className="text-3xl font-bold mb-4">Welcome to ShapeWeb</h1>
    <p>Visit the Component Preview page to test the live component streaming and rendering.</p>
  </div>
);

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/preview" element={<StreamingTestPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App; 