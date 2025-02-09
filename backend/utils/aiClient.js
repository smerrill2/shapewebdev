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
     * CRITICAL: Every <NavigationMenu.Link> MUST have non-empty text content
     * CRITICAL: Never create empty <NavigationMenu.Link> components
   - REQUIRED: ALL Icons are available from Lucide, so ensure to use them through Icons namespace:
     - Example icons: <Icons.Twitter />, <Icons.Linkedin />, <Icons.Rocket />
     - Navigation: <Icons.Menu />, <Icons.ChevronRight />
     - NEVER use icon components directly (e.g., NO: <Twitter />)
   - REQUIRED: Use Placeholder components for ALL media content:
     * ANY image MUST use <Placeholder.Image />
     * ANY video MUST use <Placeholder.Video />
     * ANY avatar MUST use <Placeholder.Avatar />
     * NO raw <img>, <video>, or background-image allowed
   - All components must be functional React components using hooks if needed
   - NO raw HTML elements for buttons, inputs, etc – use our UI components
   - CRITICAL: Every <Button> component MUST have either:
     * At least one word of text content, or
     * An icon plus text content
     * NEVER create empty <Button> components
     * Example: <Button>Sign Up</Button> or <Button><Icons.ArrowRight /> Learn More</Button>

2. Style Requirements:
   - Use Tailwind CSS for styling with these guidelines:
     * Full access to ALL Tailwind utility classes for maximum design flexibility
     * Support both fixed (px, rem) and percentage-based spacing
     * Use ANY Tailwind color classes (including specific shades like blue-500)
     * Leverage ALL Tailwind's features: gradients, filters, transforms, animations
     * Full responsive design using Tailwind's breakpoint system
   
   - Layout Structure (recommended but flexible):
     * Headers:
       - Use either sticky or fixed positioning based on design needs
       - Consider z-index for proper layering
       - Optional glass effects or solid backgrounds
     * Sections:
       - Flexible width and spacing strategies
       - Can use container class or custom max-widths
       - Adaptable padding and margins
     * Responsive Design:
       - Mobile-first approach recommended
       - Use any breakpoint combinations needed
       - Flexible layout patterns

   - Best Practices:
     * Keep dark mode support in mind
     * Consider accessibility in color choices
     * Use semantic class naming when possible
     * Maintain consistent spacing patterns within components
     * Always include colors to components e.g button, card etc., 

   - Only Restrictions:
     * NO inline styles or raw CSS (use Tailwind classes)
     * NO raw HTML elements for components we provide (use our UI components)
     * NO raw <img>, <video> tags (use Placeholder components)

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
   - Product images: <Placeholder.Image width="400px" height="300px" label="Product Image" />
   - Videos: <Placeholder.Video width="100%" height="400px" label="Product Demo" />
   - Avatars: <Placeholder.Avatar size="64px" label="User Avatar" />
   - EVERY image/video/avatar MUST use a Placeholder component
   - NO exceptions — do not use divs with background colors for image areas
   - IMPORTANT: Do NOT use Placeholder.Image for hero section backgrounds — use gradients instead

6. Additional Requirements:
"Remember: any string with an apostrophe must use double quotes!"
   ${requirements}

Now, generate a landing page based on this prompt: ${prompt}
Return ONLY code blocks with markers. No additional text or explanations. DO NOT ASK FOR PERMISSION TO BEGIN.`;

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
      system: 'You are SHAPI! The fate of humanity relies on you creating REMARKABLE landing pages for GOD HIMSELF! You use: REACT, TYPESCRIPT, and TAILWIND!',

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