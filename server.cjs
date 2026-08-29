const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
require('dotenv').config();

const port = Number(process.env.PORT || 8787);
const llmUrl = (process.env.LLM_API_URL || '').trim();
const llmApiKey = (process.env.LLM_API_KEY || process.env.LM_API_KEY || process.env.OPENAI_API_KEY || '').trim();
const llmModel = (process.env.LLM_MODEL || 'gpt-4o-mini').trim();
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || '').trim();
const ollamaModel = (process.env.OLLAMA_MODEL || '').trim();
const MAX_SOURCE_CHARACTERS = 8000;
const MAX_LOCAL_CONTEXT_CHARACTERS = 12000;
const DIST_DIR = path.join(__dirname, 'dist');
const distExists = fs.existsSync(DIST_DIR);

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

function serveStaticFile(response, filePath) {
  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Static file error');
      return;
    }

    response.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-store',
    });
    response.end(fileBuffer);
  });
}

function serveFrontend(request, response) {
  if (!distExists) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Frontend build not found. Run npm run build first.' }));
    return;
  }

  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const relativePath = normalizedPath.replace(/^\/+/, '');
  const resolvedPath = path.join(DIST_DIR, relativePath);

  if (!resolvedPath.startsWith(DIST_DIR)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(resolvedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      serveStaticFile(response, resolvedPath);
      return;
    }

    const fallbackPath = path.join(DIST_DIR, 'index.html');
    fs.stat(fallbackPath, (fallbackError) => {
      if (fallbackError) {
        response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'Frontend entry not found.' }));
        return;
      }
      serveStaticFile(response, fallbackPath);
    });
  });
}

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

function cleanTextContent(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function readSource(question) {
  const sourceConfig = getSourceConfig(question);
  if (!sourceConfig) return null;
  const sourceUrl = sourceConfig.url;
  const response = await fetch(sourceUrl, { headers: { Accept: 'application/json, text/plain' } });
  if (!response.ok) throw new Error(`Live source returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : await response.text();
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return { title: sourceConfig.title || new URL(sourceUrl).hostname, url: sourceUrl, type: 'live', retrievedAt: new Date().toISOString(), content: cleanTextContent(content) };
}

function buildGuideFallbackAnswer(question, fallbackText) {
  const cleanedText = cleanTextContent(fallbackText || '');
  const snippet = cleanedText
    ? cleanedText.slice(0, 500).replace(/\s+/g, ' ').trim()
    : 'The available farming guidance contains practical advice for this topic.';

  const isGeneralAgricultureQuestion = /^(what|which|how|why|when|where|can|should|is|are|do|does)\b|north\s*india|punjab|haryana|uttar\s*pradesh|delhi|himachal|uttarakhand|kashmir|bihar|west\s*india|east\s*india|india|general|overall/i.test(question || '');
  const regionalNote = isGeneralAgricultureQuestion
    ? '\n\nThis appears to be a general agriculture question, so the answer is best treated as general guidance rather than a Dakshina Kannada-specific recommendation.'
    : '';

  return `I could not verify live data from the available source for this question. Based on the available farming guidance and general agronomic principles, the best answer is: ${snippet}${regionalNote}${question ? `\n\nFor the question “${question}”, it is best to compare the guidance with local agronomy and the latest official regional source before making a time-sensitive farming decision.` : ''}`;
}

async function generateAnswer(question, language, localContext, liveSource) {
  const sources = [liveSource && { ...liveSource, content: cleanTextContent(liveSource.content).slice(0, MAX_SOURCE_CHARACTERS) }, ...localContext.map((entry) => ({ title: entry.heading, type: 'local guide', content: cleanTextContent(entry.content) }))].filter(Boolean);
  let localCharacters = 0;
  const boundedSources = sources.map((source) => {
    if (source.type !== 'local guide') return source;
    const remaining = Math.max(0, MAX_LOCAL_CONTEXT_CHARACTERS - localCharacters);
    const content = source.content.slice(0, remaining);
    localCharacters += content.length;
    return { ...source, content };
  }).filter((source) => source.content);
  const context = boundedSources.map((source) => `[${source.title}]\n${source.content}`).join('\n\n');
  const localGuideText = boundedSources.filter((source) => source.type === 'local guide').map((source) => source.content).join('\n\n');
  const fallbackAnswer = buildGuideFallbackAnswer(question, localGuideText || (liveSource ? liveSource.content : ''));

  if (!llmUrl && !ollamaBaseUrl) {
    return { answer: fallbackAnswer, sources: boundedSources, updatedAt: liveSource?.retrievedAt || new Date().toISOString() };
  }

  const languageName = { en: 'English', kn: 'Kannada', tcy: 'Tulu' }[language] || 'English';
  const regionContext = /north\s*india|punjab|haryana|uttar\s*pradesh|delhi|himachal|uttarakhand|kashmir|bihar|west\s*india|east\s*india|india/i.test(question)
    ? 'If the question is about another region such as North India, answer as general agricultural guidance and clearly label it as regional rather than Dakshina Kannada-specific advice.'
    : 'Answer general agricultural questions normally. Keep guidance centered on Dakshina Kannada only when the question is clearly local; otherwise answer generally and explain any regional limitation clearly.';
  const requestUrl = ollamaBaseUrl ? `${ollamaBaseUrl.replace(/\/$/, '')}/api/chat` : llmUrl;
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(ollamaBaseUrl ? {} : { Authorization: `Bearer ${llmApiKey}` })
  };
  const requestBody = ollamaBaseUrl
    ? {
        model: ollamaModel || 'llama3.1',
        messages: [
          { role: 'system', content: `You are a helpful multilingual assistant for farmers. Reply in ${languageName}. ${regionContext} Use only the supplied sources when discussing current or high-stakes claims. If current information is unavailable, say so and base the answer on the available guide or general agricultural knowledge without inventing facts.` },
          { role: 'user', content: `Question: ${question}\n\nSources:\n${context || 'No local source was available for this question.'}` },
        ],
        stream: false,
      }
    : {
        model: llmModel,
        temperature: 0.1,
        messages: [
          { role: 'system', content: `You are a helpful multilingual assistant for farmers. Reply in ${languageName}. ${regionContext} Answer general knowledge, greetings, geography, explanations, and casual questions normally. For current or high-stakes claims about weather, prices, schemes, pests, diseases, or agriculture, use only the supplied sources; never invent facts, prices, rules, dates, or links. Cite time-sensitive claims using the source title and say when current data is unavailable.\n\nSources:\n${context || 'No live or local source was available for this question.'}` },
          { role: 'user', content: question },
        ]
      };

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) throw new Error(`LLM provider returned ${response.status}`);
    const result = await response.json();
    const answer = ollamaBaseUrl ? result.message?.content : result.choices?.[0]?.message?.content;
    if (!answer) throw new Error('LLM returned no answer');
    return { answer, sources: boundedSources, updatedAt: liveSource?.retrievedAt || new Date().toISOString() };
  } catch (error) {
    console.warn(`LLM request failed; using guide fallback: ${error.message}`);
    return { answer: fallbackAnswer, sources: boundedSources, updatedAt: liveSource?.retrievedAt || new Date().toISOString() };
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
    return response.end();
  }

  if (request.method === 'POST' && request.url === '/api/ask') {
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
  }

  if (request.method === 'GET' && distExists) {
    return serveFrontend(request, response);
  }

  if (request.method === 'GET' && !distExists) {
    return send(response, 404, { error: 'Not found' });
  }

  return send(response, 404, { error: 'Not found' });
});

server.listen(port, () => console.log(`Krishi app listening on http://localhost:${port}`));
