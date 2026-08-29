const http = require('node:http');
require('dotenv').config();

const port = Number(process.env.PORT || 8787);
const llmUrl = process.env.LLM_API_URL;
const llmApiKey = process.env.LLM_API_KEY;
const llmModel = process.env.LLM_MODEL || 'gpt-4o-mini';
const MAX_SOURCE_CHARACTERS = 8000;
const MAX_LOCAL_CONTEXT_CHARACTERS = 12000;

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

function getSourceConfig(question) {
  const sourceGroups = [
    { terms: ['weather', 'rain', 'rainfall', 'forecast', 'temperature', 'ಮಳೆ'], url: process.env.WEATHER_SOURCE_URL, title: process.env.WEATHER_SOURCE_TITLE },
    { terms: ['price', 'market', 'cost', 'rate', 'ಬೆಲೆ', 'ಮಾರುಕಟ್ಟೆ'], url: process.env.MARKET_SOURCE_URL, title: process.env.MARKET_SOURCE_TITLE },
    { terms: ['scheme', 'subsidy', 'government', 'ಯೋಜನೆ'], url: process.env.AGRI_SOURCE_URL, title: process.env.AGRI_SOURCE_TITLE },
    { terms: ['pest', 'disease', 'crop', 'coffee', 'areca', 'pepper', 'ಕೀಟ', 'ರೋಗ'], url: process.env.CROP_SOURCE_URL, title: process.env.CROP_SOURCE_TITLE },
  ];
  const normalizedQuestion = question.toLocaleLowerCase();
  return sourceGroups.find((group) => group.url && group.terms.some((term) => normalizedQuestion.includes(term))) || (process.env.LIVE_SOURCE_URL ? { url: process.env.LIVE_SOURCE_URL, title: process.env.LIVE_SOURCE_TITLE } : null);
}

async function readSource(question) {
  const sourceConfig = getSourceConfig(question);
  if (!sourceConfig) return null;
  const sourceUrl = sourceConfig.url;
  const response = await fetch(sourceUrl, { headers: { Accept: 'application/json, text/plain' } });
  if (!response.ok) throw new Error(`Live source returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : await response.text();
  return { title: sourceConfig.title || new URL(sourceUrl).hostname, url: sourceUrl, type: 'live', retrievedAt: new Date().toISOString(), content: typeof data === 'string' ? data : JSON.stringify(data) };
}

async function generateAnswer(question, language, localContext, liveSource) {
  if (!llmUrl || !llmApiKey) throw new Error('LLM provider is not configured');
  const languageName = { en: 'English', kn: 'Kannada', tcy: 'Tulu' }[language] || 'English';
  const sources = [liveSource && { ...liveSource, content: liveSource.content.slice(0, MAX_SOURCE_CHARACTERS) }, ...localContext.map((entry) => ({ title: entry.heading, type: 'local guide', content: entry.content }))].filter(Boolean);
  let localCharacters = 0;
  const boundedSources = sources.map((source) => {
    if (source.type !== 'local guide') return source;
    const remaining = Math.max(0, MAX_LOCAL_CONTEXT_CHARACTERS - localCharacters);
    const content = source.content.slice(0, remaining);
    localCharacters += content.length;
    return { ...source, content };
  }).filter((source) => source.content);
  const context = boundedSources.map((source) => `[${source.title}]\n${source.content}`).join('\n\n');
  const response = await fetch(llmUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llmApiKey}` },
    body: JSON.stringify({ model: llmModel, temperature: 0.1, messages: [
      { role: 'system', content: `You are a helpful multilingual assistant for farmers in Dakshina Kannada. Reply in ${languageName}. Answer general knowledge, greetings, geography, explanations, and casual questions normally. For current or high-stakes claims about weather, prices, schemes, pests, diseases, or agriculture, use only the supplied sources; never invent facts, prices, rules, dates, or links. Cite time-sensitive claims using the source title and say when current data is unavailable.\n\nSources:\n${context || 'No live or local source was available for this question.'}` },
      { role: 'user', content: question },
    ] }),
  });
  if (!response.ok) throw new Error(`LLM provider returned ${response.status}`);
  const result = await response.json();
  const answer = result.choices?.[0]?.message?.content;
  if (!answer) throw new Error('LLM returned no answer');
  return { answer, sources: boundedSources, updatedAt: liveSource?.retrievedAt || new Date().toISOString() };
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
    let liveSource = null;
    try {
      liveSource = await readSource(question);
    } catch (error) {
      console.warn(`Live source unavailable: ${error.message}`);
    }
    return send(response, 200, await generateAnswer(question.trim(), language, Array.isArray(localContext) ? localContext : [], liveSource));
  } catch (error) {
    return send(response, 503, { error: 'Current information is unavailable', detail: error.message });
  }
});

server.listen(port, () => console.log(`Krishi API listening on http://localhost:${port}`));
