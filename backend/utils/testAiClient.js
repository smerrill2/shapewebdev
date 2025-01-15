const { aiClient } = require('./aiClient.js');
const { Readable } = require('stream');

// State variables (matching aiClient.js)
let currentComponent = '';
let isInComponent = false;
let thoughtBuffer = '';
let braceBalance = 0;
let hasSeenExport = false;
let currentComponentName = null;

// Helper functions from aiClient.js
function countBraces(text) {
  return (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
}

function isLineComplete(text) {
  const lastChar = text.trim().slice(-1);
  return lastChar === ';' || lastChar === '{' || lastChar === '}' || lastChar === '\n';
}

function extractComponentName(text) {
  // Only match component markers at the start of a line or after a clear boundary
  const match = text.match(/(?:^|\n|\.|;)\s*\/\*\s*Component:\s*([A-Za-z0-9_]+)\s*\*\//);
  return match ? match[1] : null;
}

function findComponentMarkers(text) {
  const markers = [];
  let pos = 0;
  let inString = false;
  let stringChar = '';
  
  while (pos < text.length) {
    // Skip string literals
    if (text[pos] === '"' || text[pos] === "'") {
      if (!inString) {
        inString = true;
        stringChar = text[pos];
      } else if (text[pos] === stringChar && text[pos-1] !== '\\') {
        inString = false;
      }
      pos++;
      continue;
    }
    
    if (!inString && text.slice(pos).match(/^\/\*\s*Component:/)) {
      const endPos = text.indexOf('*/', pos);
      if (endPos !== -1) {
        markers.push({
          start: pos,
          end: endPos + 2,
          name: text.slice(pos, endPos + 2).match(/Component:\s*([A-Za-z0-9_]+)/)[1]
        });
        pos = endPos + 2;
      }
    }
    pos++;
  }
  return markers;
}

// Create a mock stream to capture output
const mockStream = new Readable({
  read() {}
});

// Add listener to capture output
mockStream.on('data', (data) => {
  const message = JSON.parse(data.toString().replace('data: ', ''));
  console.log('\nProcessed Output:', {
    type: message.type,
    content: message.type === 'code' ? message.code.slice(0, 50) + '...' : message.thought,
    metadata: message.metadata
  });
});

// Test cases that mimic Claude's output
const testCases = [
  {
    description: "Thoughts with markdown and component marker mid-sentence",
    text: "# Design Vision\n- Modern interface\n- Sleek animations\nLet's implement /* Component: HeroSection */\nimport React from 'react';"
  },
  {
    description: "Component ending and new thoughts without clear separation",
    text: "export default HeroSection;/* Component: FeatureGrid */\nimport React from 'react';"
  },
  {
    description: "Multiple component transitions with thoughts between",
    text: "export default NavBar; \n\nNext, we'll create a hero section for impact./* Component: HeroSection */\nimport React from 'react';"
  },
  {
    description: "Code-like content in thoughts",
    text: "We'll use the <Button> component with custom styling. Here's the next component:/* Component: Features */\nimport React from 'react';"
  },
  {
    description: "Component marker in string literal",
    text: "const str = '/* Component: Fake */'; // This shouldn't trigger\nreal code here"
  },
  {
    description: "Partial component marker",
    text: "Let's make it /* Compon interrupted...\n\n/* Component: RealComponent */\nimport React from 'react';"
  },
  {
    description: "Multiple thoughts and code chunks mixed",
    text: "First thought. /* Component: A */\nimport React;\nexport default A;\nSecond thought. /* Component: B */\nimport React;"
  }
];

console.log('Starting tests...\n');

// Process each test case
testCases.forEach((test, index) => {
  console.log(`\n=== Test Case ${index + 1}: ${test.description} ===`);
  console.log('Input:', test.text);
  
  const newText = test.text;
  
  if (newText && newText.trim()) {
    // Find all valid component markers
    const markers = findComponentMarkers(newText);
    
    if (markers.length > 0) {
      let lastPos = 0;
      
      // Process each marker and the content before it
      markers.forEach(marker => {
        // Process any content before this marker as thoughts
        if (marker.start > lastPos) {
          const thoughts = newText.slice(lastPos, marker.start).trim();
          if (thoughts) {
            console.log('Found thoughts before component:', thoughts);
            mockStream.push(`data: ${JSON.stringify({
              type: 'thought',
              thought: thoughts
            })}\n\n`);
          }
        }
        
        // Process the component
        const code = newText.slice(marker.start);
        isInComponent = true;
        currentComponentName = marker.name;
        braceBalance = countBraces(code);
        currentComponent = code;
        
        console.log('Starting new component:', currentComponentName);
        mockStream.push(`data: ${JSON.stringify({
          type: 'code',
          code: code,
          isPartial: true,
          isComplete: false,
          metadata: {
            isLineComplete: isLineComplete(code),
            isBlockComplete: false,
            bracketBalance: braceBalance
          }
        })}\n\n`);
        
        lastPos = marker.end;
      });
      
      // Process any remaining content after the last marker
      if (lastPos < newText.length) {
        const remaining = newText.slice(lastPos).trim();
        if (remaining) {
          if (isInComponent) {
            braceBalance += countBraces(remaining);
            currentComponent += remaining;
            
            const isComplete = remaining.includes('export default') && braceBalance === 0;
            
            console.log('Continuing component, braceBalance:', braceBalance);
            mockStream.push(`data: ${JSON.stringify({
              type: 'code',
              code: remaining,
              isPartial: !isComplete,
              isComplete: isComplete,
              metadata: {
                isLineComplete: isLineComplete(remaining),
                isBlockComplete: braceBalance === 0,
                bracketBalance: braceBalance
              }
            })}\n\n`);
            
            if (isComplete) {
              console.log('Component completed');
              isInComponent = false;
              currentComponent = '';
              braceBalance = 0;
              currentComponentName = null;
            }
          } else {
            console.log('Processing remaining thought:', remaining);
            mockStream.push(`data: ${JSON.stringify({
              type: 'thought',
              thought: remaining
            })}\n\n`);
          }
        }
      }
    } else if (isInComponent) {
      // Continue existing component
      braceBalance += countBraces(newText);
      currentComponent += newText;
      
      const isComplete = newText.includes('export default') && braceBalance === 0;
      
      console.log('Continuing component, braceBalance:', braceBalance);
      mockStream.push(`data: ${JSON.stringify({
        type: 'code',
        code: newText,
        isPartial: !isComplete,
        isComplete: isComplete,
        metadata: {
          isLineComplete: isLineComplete(newText),
          isBlockComplete: braceBalance === 0,
          bracketBalance: braceBalance
        }
      })}\n\n`);
      
      if (isComplete) {
        console.log('Component completed');
        isInComponent = false;
        currentComponent = '';
        braceBalance = 0;
        currentComponentName = null;
      }
    } else {
      // Pure thought content
      thoughtBuffer += newText;
      const sentences = thoughtBuffer.match(/[^.!?]+[.!?]+/g);
      if (sentences) {
        sentences.forEach(sentence => {
          console.log('Processing thought:', sentence.trim());
          mockStream.push(`data: ${JSON.stringify({
            type: 'thought',
            thought: sentence.trim()
          })}\n\n`);
        });
        thoughtBuffer = thoughtBuffer.slice(sentences.join('').length);
      }
    }
  }
});

console.log('\nTests completed'); 