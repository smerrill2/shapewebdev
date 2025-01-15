const axios = require('axios');
const { Readable } = require('stream');

// Add debugging for environment variables
console.log('Environment check:', {
  hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  keyLength: process.env.ANTHROPIC_API_KEY?.length
});

// Helper to properly format SSE data
const formatSSE = (data) => {
  try {
    // Format thought messages
    if (data.type === 'thought' || data.type === 'message_start') {
      return `data: ${JSON.stringify({
        type: data.type,
        content: data.content || data.thought
      })}\n\n`;
    }
    
    // Format content block messages
    if (data.type === 'content_block_delta' || data.type === 'content_block_start') {
      return `data: ${JSON.stringify({
        type: data.type,
        delta: data.delta || {},
        metadata: data.metadata || {},
        index: data.index
      })}\n\n`;
    }

    // Format completion messages
    if (data.type === 'content_block_stop' || data.type === 'message_stop') {
      return `data: ${JSON.stringify({
        type: data.type,
        index: data.index
      })}\n\n`;
    }

    // Format error messages
    if (data.type === 'error') {
      return `data: ${JSON.stringify({
        type: 'error',
        error: data.error
      })}\n\n`;
    }

    // Default case - pass through the data
    return `data: ${JSON.stringify(data)}\n\n`;
  } catch (error) {
    console.error('Error formatting SSE data:', error);
    return `data: ${JSON.stringify({ type: 'error', error: 'Error formatting response' })}\n\n`;
  }
};

// Helper to detect component boundaries
const detectComponent = (text) => {
  const componentMarker = text.match(/\/\*\s*Component:\s*([A-Za-z0-9]+)\s*\*\//);
  const exportMarker = text.match(/export\s+default\s+([A-Za-z0-9]+)/);
  
  return {
    isStart: !!componentMarker,
    isEnd: !!exportMarker,
    componentName: componentMarker?.[1] || exportMarker?.[1],
    hasJSX: /return\s*\(\s*</.test(text) || /<[A-Z][A-Za-z]*/.test(text)
  };
};

// Enhanced content processing
async function processAnthropicStream(response, stream) {
  let buffer = '';
  let currentBlock = {
    type: null,
    index: null,
    content: '',
    metadata: {}
  };

  console.log('Starting stream processing...');

  try {
    for await (const chunk of response.data) {
      const text = chunk.toString();
      console.log('Received chunk:', text);

      // Split on newlines but handle partial lines
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(5)); // Remove 'data: ' prefix
          
          if (!data.type) {
            console.warn('Missing type in data:', data);
            continue;
          }

          switch (data.type) {
            case 'message_start':
              stream.push(formatSSE({
                type: 'message_start',
                content: 'Starting generation...'
              }));
              break;

            case 'content_block_start':
              currentBlock = {
                type: 'content_block',
                index: data.index,
                content: '',
                metadata: {}
              };
              
              if (data.content?.text) {
                const componentInfo = detectComponent(data.content.text);
                if (componentInfo.isStart) {
                  currentBlock.metadata = {
                    ...currentBlock.metadata,
                    ...componentInfo,
                    isComponent: true
                  };
                }
              }
              
              stream.push(formatSSE({
                type: 'content_block_start',
                index: data.index,
                metadata: currentBlock.metadata
              }));
              break;

            case 'content_block_delta':
              if (data.delta?.text) {
                currentBlock.content += data.delta.text;
                const componentInfo = detectComponent(currentBlock.content);
                
                // Update metadata if we detect component information
                if (componentInfo.componentName && !currentBlock.metadata.componentName) {
                  currentBlock.metadata = {
                    ...currentBlock.metadata,
                    ...componentInfo,
                    isComponent: true
                  };
                }

                // Mark component as complete if we see the export
                if (componentInfo.isEnd && 
                    componentInfo.componentName === currentBlock.metadata.componentName) {
                  currentBlock.metadata.isComplete = true;
                }

                stream.push(formatSSE({
                  type: 'content_block_delta',
                  index: data.index,
                  delta: data.delta,
                  metadata: currentBlock.metadata
                }));
              }
              break;

            case 'content_block_stop':
              if (currentBlock.content) {
                stream.push(formatSSE({
                  type: 'content_block_stop',
                  index: data.index,
                  metadata: currentBlock.metadata
                }));
              }
              currentBlock = {
                type: null,
                index: null,
                content: '',
                metadata: {}
              };
              break;

            case 'message_stop':
              stream.push(formatSSE({
                type: 'message_stop'
              }));
              break;

            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Error processing line:', err);
          console.error('Problematic line:', line);
          stream.push(formatSSE({
            type: 'error',
            error: `Error processing stream data: ${err.message}`
          }));
        }
      }
    }
  } catch (error) {
    console.error('Stream processing error:', error);
    stream.push(formatSSE({
      type: 'error',
      error: `Stream processing failed: ${error.message}`
    }));
  } finally {
    if (currentBlock.content) {
      stream.push(formatSSE({
        type: 'content_block_stop',
        index: currentBlock.index,
        metadata: currentBlock.metadata
      }));
    }
    stream.push(null);
  }
}

// Helper for exponential backoff
const backoff = (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000);

// Main generate function
module.exports = {
  generate: async function({ prompt, style, requirements }) {
    try {
      console.log('Starting generation with:', { 
        prompt: prompt?.slice(0, 100), 
        hasStyle: !!style, 
        hasRequirements: !!requirements 
      });
      
      const stream = new Readable({
        read() {}
      });

      let fullPrompt = `You are a highly creative web developer specialized in creating stunning, unique React landing pages. Your task is to generate an innovative and visually striking landing page that pushes the boundaries of modern web design.

Important: Use ONLY icons from the 'lucide-react' library. Available icons include: Globe, Shield, ChartLine, User, Heart, etc. Import them directly from 'lucide-react', NOT from any other icon library.

Here is the request: ${prompt}${style ? `\nStyle preferences: ${style}` : ''}${requirements ? `\nSpecific requirements: ${requirements}` : ''}`;

      let attempt = 0;
      let response;

      while (attempt < 3) {
        try {
          response = await axios({
            method: 'post',
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'accept': 'text/event-stream'
            },
            data: {
              model: 'claude-3-haiku-20240307',
              messages: [{
                role: 'user',
                content: [{
                  type: 'text',
                  text: fullPrompt
                }]
              }],
              stream: true,
              max_tokens: 4000,
              temperature: 0.7
            },
            responseType: 'stream'
          });
          
          break; // Success, exit retry loop
        } catch (error) {
          attempt++;
          if (attempt === 3) throw error;
          
          // Handle rate limiting
          if (error.response?.status === 429) {
            const delay = backoff(attempt);
            console.log(`Rate limited, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      await processAnthropicStream(response, stream);
      return stream;

    } catch (error) {
      console.error('Generation error:', error);
      const stream = new Readable({
        read() {}
      });
      stream.push(formatSSE({
        type: 'error',
        error: `Generation failed: ${error.message}`
      }));
      stream.push(null);
      return stream;
    }
  }
};