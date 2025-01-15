import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Button } from './components/ui/button';
import GeneratePage from './pages/GeneratePage';
import TestAIResponse from './components/TestAIResponse';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">ShapeWeb</Link>
          <div className="space-x-4">
            <Link to="/test">
              <Button variant="ghost" className="text-white">Test AI</Button>
            </Link>
            <Button variant="ghost" className="text-white">Sign Up</Button>
            <Button variant="ghost" className="text-white">Login</Button>
          </div>
        </nav>

        <Routes>
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/test" element={<TestAIResponse />} />
          <Route path="/" element={
            <main className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
              <h1 className="text-4xl font-bold mb-4">Build Web Components with AI</h1>
              <p className="text-lg text-gray-600 mb-8">
                Generate, customize, and manage your React components using AI
              </p>
              <Link to="/generate">
                <Button variant="destructive" size="lg" className="text-lg px-8">Try Generator</Button>
              </Link>
            </main>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 