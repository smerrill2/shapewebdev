import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LivePreviewTestPage from './test/LivePreviewTestPage';
import { ThemeProvider } from 'next-themes';

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router>
        <div className="min-h-screen bg-background">
          <nav className="p-4 border-b">
            <ul className="flex space-x-4">
              <li>
                <Link to="/test" className="text-primary hover:underline">
                  Live Preview Tests
                </Link>
              </li>
            </ul>
          </nav>

          <Routes>
            <Route path="/test" element={<LivePreviewTestPage />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App; 