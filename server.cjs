const http = require('node:http');

const port = Number(process.env.PORT || 8787);
const sourceUrl = process.env.LIVE_SOURCE_URL;
const llmUrl = process.env.LLM_API_URL;
const llmApiKey = process.env.LLM_API_KEY;
const llmModel = process.env.LLM_MODEL || 'gpt-4o-mini';

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

async function readSource() {
  if (!sourceUrl) return null;
  const response = await fetch(sourceUrl, { headers: { Accept: 'application/json, text/plain' } });
  if (!response.ok) throw new Error(`Live source returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : await response.text();
  return { title: process.env.LIVE_SOURCE_TITLE || new URL(sourceUrl).hostname, url: sourceUrl, type: 'live', retrievedAt: new Date().toISOString(), content: typeof data === 'string' ? data : JSON.stringify(data) };
}

async function generateAnswer(question, language, localContext, liveSource) {
  if (!llmUrl || !llmApiKey) throw new Error('LLM provider is not configured');
  const languageName = { en: 'English', kn: 'Kannada', tcy: 'Tulu' }[language] || 'English';
  const sources = [liveSource, ...localContext.map((entry) => ({ title: entry.heading, type: 'local guide', content: entry.content }))].filter(Boolean);
  const context = sources.map((source) => `[${source.title}]\n${source.content}`).join('\n\n');
  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llmApiKey}` },
    body: JSON.stringify({ model: llmModel, temperature: 0.1, messages: [
      { role: 'system', content: `You are a farming assistant for Dakshina Kannada. Answer only from the supplied sources. Reply in ${languageName}. Do not invent facts, prices, rules, dates, or links. Cite time-sensitive claims using the source title. If sources do not answer the question, say that clearly.\n\nSources:\n${context}` },
      { role: 'user', content: question },
    ] }),
  });
  if (!response.ok) throw new Error(`LLM provider returned ${response.status}`);
  const result = await response.json();
  const answer = result.choices?.[0]?.message?.content;
  if (!answer) throw new Error('LLM returned no answer');
  return { answer, sources, updatedAt: liveSource?.retrievedAt || new Date().toISOString() };
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
    return response.end();
  }
  if (request.method !== 'POST' || request.url !== '/api/ask') return send(response, 404, { error: 'Not found' });
  let body = '';
  for await (const chunk of request) body += chunk;
  try {
    const { question, language = 'en', localContext = [] } = JSON.parse(body);
    if (typeof question !== 'string' || !question.trim()) return send(response, 400, { error: 'Question is required' });
    const liveSource = await readSource();
    return send(response, 200, await generateAnswer(question.trim(), language, Array.isArray(localContext) ? localContext : [], liveSource));
  } catch (error) {
    return send(response, 503, { error: 'Current information is unavailable', detail: error.message });
  }
});

server.listen(port, () => console.log(`Krishi API listening on http://localhost:${port}`));
