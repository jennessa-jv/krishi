import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { pipeline } from '@xenova/transformers';
import { BookOpen, ChevronRight, Leaf, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import guideEn from './content/guide_en.md?raw';
import guideKn from './content/guide_kn.md?raw';
import guideTcy from './content/guide_tcy.md?raw';

const guides = {
  en: { name: 'English', content: guideEn },
  kn: { name: 'ಕನ್ನಡ (Kannada)', content: guideKn },
  tcy: { name: 'ತುಳು (Tulu)', content: guideTcy }
};

const suggestions = {
  en: ['How should I manage water during monsoon?', 'Which crops work well under areca?', 'How can I reduce disease risk?'],
  kn: ['ಮುಂಗಾರಿನಲ್ಲಿ ನೀರನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸಬೇಕು?', 'ಅಡಿಕೆಯೊಂದಿಗೆ ಯಾವ ಬೆಳೆಗಳನ್ನು ಬೆಳೆಯಬಹುದು?', 'ರೋಗದ ಅಪಾಯವನ್ನು ಹೇಗೆ ಕಡಿಮೆ ಮಾಡಬಹುದು?'],
  tcy: ['ಮುಂಗಾರೊಡು ನೀರ್ ಎಂಚ ನಿರ್ವಹಣೆ ಮಲ್ಪುನೆ?', 'ಅಡಿಕೆದ ಒಟ್ಟುಗು ವಾ ಬೆಳೆಕುಲು ಎಡ್ಡೆ?', 'ಸೀಕ್‌ದ ಅಪಾಯ ಎಂಚ ಕಮ್ಮಿ ಮಲ್ಪುನೆ?']
};

const labels = {
  en: { title: 'Ask Krishi', subtitle: 'Answers from your farming guide', latestSubtitle: 'Current sources with citations', placeholder: 'Ask about crops, soil, water or schemes...', welcome: 'Hello. Ask me about farming in Dakshina Kannada.', greeting: 'Hello. How can I help with your farm today?', grounded: 'Grounded in your selected guide', latest: 'Latest information', guide: 'Guide answer', sources: 'Source', empty: 'I could not find a close match in this guide. Try asking about a crop, season, soil, drainage, pests, schemes or markets.', open: 'Open guide', close: 'Close assistant' },
  kn: { title: 'ಕೃಷಿಯನ್ನು ಕೇಳಿ', subtitle: 'ನಿಮ್ಮ ಕೃಷಿ ಮಾರ್ಗದರ್ಶಿಯಿಂದ ಉತ್ತರಗಳು', latestSubtitle: 'ಪ್ರಸ್ತುತ ಮೂಲಗಳು ಮತ್ತು ಉಲ್ಲೇಖಗಳು', placeholder: 'ಬೆಳೆ, ಮಣ್ಣು, ನೀರು ಅಥವಾ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...', welcome: 'ನಮಸ್ಕಾರ. ದಕ್ಷಿಣ ಕನ್ನಡದ ಕೃಷಿಯ ಬಗ್ಗೆ ಕೇಳಿ.', greeting: 'ನಮಸ್ಕಾರ. ಇಂದು ನಿಮ್ಮ ಕೃಷಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?', grounded: 'ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಮಾರ್ಗದರ್ಶಿ ಆಧಾರಿತ', latest: 'ಇತ್ತೀಚಿನ ಮಾಹಿತಿ', guide: 'ಮಾರ್ಗದರ್ಶಿ ಉತ್ತರ', sources: 'ಮೂಲ', empty: 'ಈ ಮಾರ್ಗದರ್ಶಿಯಲ್ಲಿ ಹತ್ತಿರದ ಉತ್ತರ ಸಿಗಲಿಲ್ಲ. ಬೆಳೆ, ಋತು, ಮಣ್ಣು, ಒಳಚರಂಡಿ, ಕೀಟ, ಯೋಜನೆ ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬಗ್ಗೆ ಕೇಳಿ.', open: 'ಮಾರ್ಗದರ್ಶಿ ತೆರೆಯಿರಿ', close: 'ಸಹಾಯಕನನ್ನು ಮುಚ್ಚಿ' },
  tcy: { title: 'ಕೃಷಿನ್ ಕೇಳಲೆ', subtitle: 'ನಿಕ್ಲೆನ ಮಾರ್ಗದರ್ಶಿರ್ದ್ ಉತ್ತರ', latestSubtitle: 'ಇತ್ತೀಚಿನ ಮೂಲೊಲು ಅತ್ತ್ಂಡ ಉಲ್ಲೇಖೊಲು', placeholder: 'ಬೆಳೆ, ಮಣ್ಣ್, ನೀರ್ ಅತ್ತ್ಂಡ ಯೋಜನೆ ಬಗ್ಗೆ ಕೇಳಲೆ...', welcome: 'ನಮಸ್ಕಾರ. ದಕ್ಷಿಣ ಕನ್ನಡದ ಕೃಷಿದ ಬಗ್ಗೆ ಕೇಳಲೆ.', greeting: 'ನಮಸ್ಕಾರ. ಈ ದಿನ ಉಮೆರ್ ಕೃಷಿಗ್ ಯಾನ್ ಎಂಚ ಸಹಾಯ ಮಲ್ಪೊಲಿ?', grounded: 'ಆಯ್ಕೆ ಮಲ್ತಿನ ಮಾರ್ಗದರ್ಶಿ ಆಧಾರಿತ', latest: 'ಇತ್ತೀಚಿನ ಮಾಹಿತಿ', guide: 'ಮಾರ್ಗದರ್ಶಿ ಉತ್ತರ', sources: 'ಮೂಲ', empty: 'ಈ ಮಾರ್ಗದರ್ಶಿಡ್ ಹತ್ತಿರದ ಉತ್ತರ ಸಿಕ್ಕಿಜಿ. ಬೆಳೆ, ಋತು, ಮಣ್ಣ್, ಡ್ರೈನೇಜ್, ಕೀಟ, ಯೋಜನೆ ಅತ್ತ್ಂಡ ಮಾರುಕಟ್ಟೆ ಬಗ್ಗೆ ಕೇಳಲೆ.', open: 'ಮಾರ್ಗದರ್ಶಿ ತೆರೆಲೆ', close: 'ಸಹಾಯಕನ್ ಮುಚ್ಚಲೆ' }
};

function buildSections(content) {
  return content.split(/(?=^##\s)/m).map((section) => {
    const heading = section.match(/^##\s+(.+)$/m)?.[1]?.trim();
    return heading ? { heading, content: section.trim() } : null;
  }).filter(Boolean);
}

const VECTOR_DB_NAME = 'krishi-vector-database';
const VECTOR_STORE_NAME = 'guide-sections';
const MAX_RETRIEVED_SECTIONS = 3;
const SEMANTIC_RELEVANCE_THRESHOLD = 0.32;
let embedderPromise;

function getEmbedder() {
  embedderPromise ||= pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return embedderPromise;
}

async function getContentHash(section) {
  const data = new TextEncoder().encode(`${section.heading}\n${section.content}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function openVectorDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VECTOR_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(VECTOR_STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readVectorIndex(language) {
  const database = await openVectorDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(VECTOR_STORE_NAME, 'readonly').objectStore(VECTOR_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.filter((entry) => entry.language === language));
    request.onerror = () => reject(request.error);
  });
}

async function writeVectorIndex(language, sections) {
  const embed = await getEmbedder();
  const vectors = await Promise.all(sections.map(async (section, index) => {
    const output = await embed(`${section.heading}\n${section.content}`, { pooling: 'mean', normalize: true });
    return { id: `${language}-${index}`, language, heading: section.heading, content: section.content, contentHash: await getContentHash(section), vector: Array.from(output.data) };
  }));
  const database = await openVectorDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(VECTOR_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(VECTOR_STORE_NAME);
    store.getAll().onsuccess = (event) => event.target.result
      .filter((entry) => entry.language === language)
      .forEach((entry) => store.delete(entry.id));
    vectors.forEach((vector) => store.put(vector));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  return vectors;
}

async function getVectorIndex(language, sections) {
  const stored = await readVectorIndex(language);
  const currentHashes = await Promise.all(sections.map(getContentHash));
  const isCurrent = stored.length === sections.length && stored.every((entry, index) => entry.heading === sections[index].heading && entry.contentHash === currentHashes[index]);
  return isCurrent ? stored : writeVectorIndex(language, sections);
}

function cosineSimilarity(first, second) {
  return first.reduce((total, value, index) => total + value * second[index], 0);
}

function isGreeting(question) {
  return /^(hi|hello|hey|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ)\s*[!.?]*$/iu.test(question);
}

function findKeywordAnswer(question, sections) {
  const stopWords = new Set(['what', 'which', 'how', 'can', 'are', 'the', 'for', 'about', 'from', 'and', 'you', 'your', 'present']);
  const relatedTerms = {
    weather: ['climate', 'rainfall', 'monsoon'],
    climate: ['weather', 'rainfall', 'monsoon'],
    rain: ['rainfall', 'monsoon', 'drainage'],
    rainfall: ['rain', 'monsoon', 'drainage']
  };
  const tokenize = (text) => text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  const terms = [...new Set(tokenize(question)
    .filter((term) => !stopWords.has(term))
    .flatMap((term) => [term, ...(relatedTerms[term] || [])]))];
  const ranked = sections.map((section) => {
    const headingTerms = new Set(tokenize(section.heading));
    const contentTerms = new Set(tokenize(section.content));
    const score = terms.reduce((total, term) => total + (headingTerms.has(term) ? 4 : contentTerms.has(term) ? 1 : 0), 0);
    return { ...section, score };
  }).sort((first, second) => second.score - first.score);
  return ranked[0]?.score ? ranked.slice(0, MAX_RETRIEVED_SECTIONS) : [];
}

async function findSemanticAnswer(question, language, sections) {
  try {
    const embed = await getEmbedder();
    const output = await embed(question, { pooling: 'mean', normalize: true });
    const questionVector = Array.from(output.data);
    const index = await getVectorIndex(language, sections);
    const ranked = index.map((entry) => ({ ...entry, score: cosineSimilarity(questionVector, entry.vector) }))
      .sort((first, second) => second.score - first.score);
    return ranked[0]?.score >= SEMANTIC_RELEVANCE_THRESHOLD
      ? ranked.slice(0, MAX_RETRIEVED_SECTIONS)
      : findKeywordAnswer(question, sections);
  } catch {
    return findKeywordAnswer(question, sections);
  }
}

async function askLatest(question, language, localMatches) {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language, localContext: localMatches.map(({ heading, content }) => ({ heading, content })) })
  });
  if (!response.ok) throw new Error('Latest information is unavailable');
  return response.json();
}

export default function App() {
  const [lang, setLang] = useState('en');
  const [chatOpen, setChatOpen] = useState(true);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('guide');
  const [asking, setAsking] = useState(false);
  const [indexStatus, setIndexStatus] = useState('loading');
  const currentLabels = labels[lang];
  const sections = useMemo(() => buildSections(guides[lang].content), [lang]);

  useEffect(() => {
    let cancelled = false;
    setIndexStatus('loading');
    getVectorIndex(lang, sections)
      .then(() => !cancelled && setIndexStatus('ready'))
      .catch(() => !cancelled && setIndexStatus('fallback'));
    return () => { cancelled = true; };
  }, [lang, sections]);

  function switchLanguage(nextLanguage) {
    setLang(nextLanguage);
    setMessages([]);
  }

  async function ask(value = question) {
  const trimmed = value.trim();
  if (!trimmed) return;

  if (isGreeting(trimmed)) {
    setMessages((previous) => [
      ...previous,
      {
        question: trimmed,
        answer: currentLabels.greeting
      }
    ]);
    setQuestion('');
    return;
  }

  setAsking(true);

  try {
    const matches = await findSemanticAnswer(trimmed, lang, sections);

    const result = await askLatest(
      trimmed,
      lang,
      matches
    );

    setMessages((previous) => [
      ...previous,
      {
        question: trimmed,
        answer: result.answer,
        source: matches.length
          ? matches.map((match) => match.heading).join(' · ')
          : null
      }
    ]);

    setQuestion('');
  }  catch (error) {
  console.error(error);
  }
   finally {
    setAsking(false);
  }
}
  return (
    <div className="app-shell">
      <nav className="topbar">
        <div className="brand"><span className="brand-mark"><Leaf size={19} /></span><span>Krishi</span></div>
        <div className="language-switcher" aria-label="Guide language">
          {Object.entries(guides).map(([key, { name }]) => (
            <button
              key={key}
              onClick={() => switchLanguage(key)}
              className={lang === key ? 'language-button active' : 'language-button'}
            >
              {name}
            </button>
          ))}
        </div>
      </nav>
      <main className="content-layout">
        <section className="guide-column">
          <div className="guide-intro"><p className="eyebrow">FIELD NOTES / DAKSHINA KANNADA</p><h1>Practical knowledge<br /><em>for your next season.</em></h1><p className="intro-copy">A locally grounded guide to crops, climate, soil health and resilient farm decisions.</p></div>
          <article className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{guides[lang].content}</ReactMarkdown></article>
        </section>
        {chatOpen && <aside className="chat-panel" aria-label={currentLabels.title}>
          <div className="chat-header"><div className="chat-title"><span className="chat-icon"><MessageCircle size={18} /></span><div><strong>{currentLabels.title}</strong><small>{mode === 'latest' ? currentLabels.latestSubtitle : currentLabels.subtitle}</small></div></div><button className="icon-button" onClick={() => setChatOpen(false)} aria-label={currentLabels.close}><X size={18} /></button></div>
          <div className="chat-body">
            <div className="mode-switcher" role="group" aria-label="Answer mode"><button className={mode === 'guide' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('guide')}>{currentLabels.guide}</button><button className={mode === 'latest' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('latest')}>{currentLabels.latest}</button></div>
            <div className="assistant-message"><span className="mini-avatar"><Sparkles size={14} /></span><p>{currentLabels.welcome}</p></div>
            {messages.map((message, index) => <div className="message-group" key={`${message.question}-${index}`}><div className="user-message">{message.question}</div><div className="assistant-message"><span className="mini-avatar"><Sparkles size={14} /></span><div><p>{message.answer}</p>{message.source && <small className="citation"><BookOpen size={13} /> {currentLabels.sources}: {message.source}</small>}{message.updatedAt && <small className="citation">Updated: {new Date(message.updatedAt).toLocaleString()}</small>}</div></div></div>)}
            <div className="suggestion-list">{suggestions[lang].map((suggestion) => <button key={suggestion} className="suggestion" onClick={() => ask(suggestion)}>{suggestion}<ChevronRight size={15} /></button>)}</div>
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={currentLabels.placeholder} aria-label={currentLabels.placeholder} disabled={asking} /><button type="submit" aria-label="Send question" disabled={asking}><Send size={17} /></button></form>
          <div className="grounding-note"><span className="status-dot" /> {indexStatus === 'loading' ? 'Preparing semantic search...' : currentLabels.grounded}</div>
        </aside>}
        {!chatOpen && <button className="reopen-chat" onClick={() => setChatOpen(true)}><MessageCircle size={18} /> {currentLabels.title}</button>}
      </main>
    </div>
  );
}
