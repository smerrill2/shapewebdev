const aiClient = require('../utils/aiClient');
const { setupSSE, sendSSEMessage } = require('../utils/sseHelpers');

function formatStreamMessage(data) {
  try {
    // If it's a string, it might be SSE formatted data
    if (typeof data === 'string') {
      // Remove the 'data: ' prefix if it exists
      const jsonStr = data.startsWith('data: ') ? data.slice(6) : data;
      try {
        data = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse stream data:', e);
        console.error('Raw data:', jsonStr);
        return `data: ${JSON.stringify({ type: 'error', message: 'Failed to parse stream data' })}\n\n`;
      }
    }

    // Format based on message type
    if (data.type === 'content_block_delta' && data.delta?.text) {
      return `data: ${JSON.stringify({
        type: 'content_block_delta',
        delta: {
          text: data.delta.text,
          ...data.delta
        },
        metadata: data.metadata || {}
      })}\n\n`;
    }
    
    // Pass through other message types with full data structure
    return `data: ${JSON.stringify(data)}\n\n`;
  } catch (error) {
    console.error('Error formatting stream message:', error);
    console.error('Problematic data:', data);
    return `data: ${JSON.stringify({ type: 'error', message: 'Error formatting message', details: error.message })}\n\n`;
  }
}

exports.generateLandingPage = async (req, res) => {
  try {
    console.log('Generate request received:', {
      method: req.method,
      prompt: req.method === 'GET' ? req.query.prompt?.slice(0, 100) : req.body.prompt?.slice(0, 100),
      hasStyle: req.method === 'GET' ? !!req.query.style : !!req.body.style,
      hasRequirements: req.method === 'GET' ? !!req.query.requirements : !!req.body.requirements
    });

    // Handle both GET and POST requests
    const { prompt, style, requirements } = req.method === 'GET' ? req.query : req.body;

    if (!prompt) {
      console.log('No prompt provided');
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Prompt is required' })}\n\n`);
      return res.end();
    }

    // Set up SSE
    setupSSE(req, res);
    console.log('SSE connection established');

    // Start the generation with all parameters
    console.log('Starting AI generation');
    const stream = await aiClient.generate({
      prompt,
      style,
      requirements
    });

    let messageCount = 0;
    let hasError = false;

    // Handle stream events
    stream.on('data', chunk => {
      try {
        messageCount++;
        const rawData = chunk.toString();
        console.log(`Received message #${messageCount}:`, rawData.slice(0, 100) + '...');
        
        // Format the message before sending
        const formattedData = formatStreamMessage(rawData);
        console.log(`Formatted message #${messageCount}:`, formattedData.slice(0, 100) + '...');
        
        // Check if it's an error message
        try {
          const parsed = JSON.parse(formattedData.slice(6)); // Remove 'data: '
          if (parsed.type === 'error') {
            hasError = true;
          }
        } catch (e) {
          console.error('Error parsing formatted data:', e);
        }

        const success = res.write(formattedData);
        console.log(`Message #${messageCount} sent:`, { success });

        if (!success) {
          console.warn('Back pressure detected in stream');
          stream.pause();
          res.once('drain', () => stream.resume());
        }
      } catch (error) {
        console.error('Error processing chunk:', error);
        console.error('Problematic chunk:', chunk.toString());
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Error processing generation chunk',
          details: error.message
        })}\n\n`);
        hasError = true;
      }
    });

    stream.on('end', () => {
      console.log('AI generation completed. Total messages sent:', messageCount);
      if (!hasError) {
        res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      }
      res.end();
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error.message || 'Generation failed',
        details: error.stack
      })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message || 'Generation failed',
      details: error.stack
    })}\n\n`);
    res.end();
  }
}; 