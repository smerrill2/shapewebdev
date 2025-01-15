import React, { useState } from 'react';
import { typeScriptPatterns, expectedOutputs } from './TypeScriptTestCases';

const removeTypes = (code) => {
  return code
    // Remove interface and type definitions
    .replace(/(?:interface|type)\s+\w+(?:<[^>]*>)?\s*(?:extends[^{]*)?{[^}]*}/gs, '')
    
    // Remove React.FC and other React types
    .replace(/: React\.(?:FC|FunctionComponent)(?:<[^>]*>)?/g, '')
    
    // Remove type assertions
    .replace(/\bas\b[^;\n}]*(?=[;\n}])/g, '')
    
    // Remove parameter type annotations
    .replace(/:\s*(?:{[^}]*}|\w+(?:\[\])?|(?:React|JSX)\.[a-zA-Z]+(?:<[^>]*>)?)/g, '')
    
    // Remove generic type parameters
    .replace(/<[^>]*>/g, '')
    
    // Clean up any double spaces or empty lines
    .replace(/\s+/g, ' ')
    .replace(/{\s+}/g, '{}')
    .trim();
};

const TestTypeRemoval = () => {
  const [selectedTest, setSelectedTest] = useState('reactFC');
  const [output, setOutput] = useState('');
  
  const runTest = (code) => {
    const result = removeTypes(code);
    setOutput(result);
  };
  
  return (
    <div className="p-4">
      <div className="mb-4 space-x-4">
        {Object.keys(typeScriptPatterns).map(key => (
          <button
            key={key}
            onClick={() => {
              setSelectedTest(key);
              runTest(typeScriptPatterns[key]);
            }}
            className={selectedTest === key ? 'px-3 py-1 rounded bg-blue-500 text-white' : 'px-3 py-1 rounded bg-gray-200'}
          >
            {key}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h3 className="font-bold mb-2">Input:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-sm">
            {typeScriptPatterns[selectedTest]}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold mb-2">Output:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-sm">
            {output}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold mb-2">Expected:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-sm">
            {expectedOutputs[selectedTest]}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestTypeRemoval; 