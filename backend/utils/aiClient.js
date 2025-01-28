require('@anthropic-ai/sdk/shims/node');
const { Anthropic } = require('@anthropic-ai/sdk');
const { Readable } = require('stream');

const formatPrompt = (prompt, style, requirements) => `
You are helping generate a React landing page. Follow these exact requirements:

1. Component Requirements:
   - Use ONLY Tailwind CSS for styling (NO inline styles or raw CSS)
   - REQUIRED: Use shadcn/ui components with EXACT namespace pattern:
     * Navigation components MUST use these EXACT names:
       <NavigationMenu>
         <NavigationMenu.List>
           <NavigationMenu.Item>
             <NavigationMenu.Link>Link Text</NavigationMenu.Link>
           </NavigationMenu.Item>
         </NavigationMenu.List>
       </NavigationMenu>
     * NEVER nest NavigationMenu.List components inside each other
     * All components support dark mode and are fully accessible
   - REQUIRED: Access ALL icons through Icons namespace:
     - Social icons: <Icons.Twitter />, <Icons.Linkedin />, <Icons.Github />
     - Navigation: <Icons.Menu />, <Icons.ChevronRight />
     - NEVER use icon components directly (e.g., NO: <Twitter />)
   - REQUIRED: Use Placeholder components for ALL media content:
     * ANY image MUST use <Placeholder.Image />
     * ANY video MUST use <Placeholder.Video />
     * ANY avatar MUST use <Placeholder.Avatar />
     * NO raw <img>, <video>, or background-image allowed
   - All components must be functional React components using hooks if needed
   - NO raw HTML elements for buttons, inputs, etc - use our UI components

2. Style Requirements:
   - Use ONLY Tailwind utility classes (e.g., 'bg-slate-900 p-4')
   - NO inline styles or style objects
   - For spacing use Tailwind's spacing scale (e.g., p-4, my-6, gap-2)
   - For colors use Tailwind's color palette
   - For responsive design use Tailwind breakpoints (sm:, md:, lg:)
   - NO background-image CSS - use Placeholder.Image instead

3. Structure:
   - Define each section as a named export function component
   - RootLayout component MUST be the final component
   - Use EXACT markers:
     /// START ComponentName position=header
     export function ComponentName() { ... }
     /// END ComponentName
   - Include position metadata (header, main, footer)

4. Code Style:
   - Use double quotes (") for strings with apostrophes
   - Use single quotes (') for all other strings
   - Ensure all string literals use straight quotes
   - ${style}

5. Media Placeholders (REQUIRED):
   - Hero backgrounds: <Placeholder.Image width="100%" height="500px" label="Hero Background" />
   - Product images: <Placeholder.Image width="400px" height="300px" label="Product Image" />
   - Videos: <Placeholder.Video width="100%" height="400px" label="Product Demo" />
   - Avatars: <Placeholder.Avatar size="64px" label="User Avatar" />
   - EVERY image/video/avatar MUST use a Placeholder component
   - NO exceptions - do not use divs with background colors for image areas

6. Additional Requirements:
   ${requirements}

Now, generate a landing page based on this prompt: ${prompt}
Return ONLY code blocks with markers. No additional text or explanations.`;

const formatSSE = (data) => {
  return `data: ${JSON.stringify(data)}\n\n`;
};

async function generate(prompt, style, requirements) {
  console.log('🚀 Starting generation with:', { prompt, style, requirements });

  try {
    // Check for API key in environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey
    });

    console.log('📡 Creating Claude stream...');

    // Create the stream
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: formatPrompt(prompt, style, requirements)
      }],
      stream: true
    });

    // Transform Anthropic's stream into a Node.js stream
    const stream = new Readable({
      objectMode: true,
      read() {} // No-op since we'll push data manually
    });

    // Process Claude's streaming chunks
    (async () => {
      try {
        for await (const chunk of response) {
          console.log('🔍 Raw Claude chunk:', chunk);

          switch (chunk.type) {
            case 'content_block_start':
            case 'content_block_stop':
            case 'message_stop':
              // Push these through untouched
              stream.push(JSON.stringify(chunk));
              break;

            case 'content_block_delta':
              // Preserve the full structure including type and delta
              stream.push(JSON.stringify({
                type: 'content_block_delta',
                metadata: chunk.metadata || {},
                delta: chunk.delta
              }));
              break;

            case 'message_delta':
              // Only push message_delta if it has content
              if (chunk.delta?.text) {
                stream.push(JSON.stringify({
                  type: 'message_delta',
                  delta: chunk.delta
                }));
              }
              break;

            default:
              // Log unhandled types but don't break the stream
              console.log('Unhandled chunk type:', chunk.type);
              break;
          }
        }
        // End the readable stream once Claude is done
        stream.push(null);
      } catch (error) {
        stream.emit('error', error);
      }
    })();

    return stream;
  } catch (error) {
    console.error('❌ Generation error:', error);
    
    // Handle Anthropic's error format
    const errorResponse = {
      type: 'error',
      code: 'CLAUDE_API_ERROR',
      message: error.message || 'Unknown error',
      retryable: false
    };

    // Handle specific error types
    if (error.error?.type === 'authentication_error') {
      errorResponse.code = 'CLAUDE_AUTH_ERROR';
      errorResponse.message = error.error.message;
    } else if (error.error?.type === 'rate_limit_error') {
      errorResponse.code = 'CLAUDE_RATE_LIMIT';
      errorResponse.message = error.error.message;
      errorResponse.retryable = true;
    } else if (error.error?.type === 'internal_error') {
      errorResponse.code = 'CLAUDE_API_ERROR';
      errorResponse.message = error.error.message;
      errorResponse.retryable = true;
    } else if (error.message === 'ANTHROPIC_API_KEY environment variable is not set') {
      errorResponse.code = 'CLAUDE_API_ERROR';
      errorResponse.message = error.message;
      errorResponse.retryable = false;
    }

    throw errorResponse;
  }
}

module.exports = {
  generate,
  formatPrompt
};