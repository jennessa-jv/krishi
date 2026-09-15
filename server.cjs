const http = require('node:http');
require('dotenv').config();

const PORT = process.env.PORT || 8787;

const LLM_API_URL = process.env.LLM_API_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

async function generateAnswer(question, language, localContext) {
  const context = localContext
    .map(item => `${item.heading}\n${item.content}`)
    .join('\n\n');

  const response = await fetch(LLM_API_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`
    },

    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.1,

      messages: [
        {
          role: 'system',
          content: `
You are a helpful farming assistant.

Answer in ${language}.

If the local farming guide contains relevant information, use it to answer the question.

If the local farming guide does not contain relevant information, answer the question using your general knowledge.

Do not invent information or pretend that information came from the guide when it did not.
`
        },

        {
          role: 'user',
          content: `
Question:
${question}

Local farming guide:
${context || 'No relevant guide information was found.'}
`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      'LLM error:',
      response.status,
      errorText
    );

    throw new Error(
      `LLM request failed: ${response.status}`
    );
  }

  const result = await response.json();

  return result.choices[0].message.content;
}

//?frontend JavaScript is visible to users.
const server = http.createServer(async (request, response) => {   //Every time the frontend sends an HTTP request, this function runs.

  // -------------------------
  // CORS
  // -------------------------

  response.setHeader(
    'Access-Control-Allow-Origin',
    process.env.FRONTEND_ORIGIN
  );

  response.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );


  // -------------------------
  // Handle CORS preflight
  // -------------------------

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }


  // -------------------------
  // POST /api/ask
  // -------------------------

  if (
    request.method === 'POST' &&
    request.url === '/api/ask'
  ) {

    let body = '';

    for await (const chunk of request) {
      body += chunk;
    }

    try {

      const {
        question,
        language = 'en',
        localContext = []
      } = JSON.parse(body);


      // -------------------------
      // Validate question
      // -------------------------

      if (!question?.trim()) {

        response.writeHead(400, {
          'Content-Type': 'application/json'
        });

        response.end(
          JSON.stringify({
            error: 'Question is required'
          })
        );

        return;
      }


      // -------------------------
      // Ask LLM
      // -------------------------

      const answer = await generateAnswer(
        question,
        language,
        localContext
      );


      // -------------------------
      // Send answer
      // -------------------------

      response.writeHead(200, {
        'Content-Type': 'application/json'
      });

      response.end(
        JSON.stringify({
          answer
        })
      );

    } catch (error) {

      console.error(error);

      response.writeHead(500, {
        'Content-Type': 'application/json'
      });

      response.end(
        JSON.stringify({
          error: error.message
        })
      );
    }

    return;
  }


  // -------------------------
  // Unknown route
  // -------------------------

  response.writeHead(404);
  response.end('Not found');
});


server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Server running on port ${PORT}`
  );
});