import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pipeline, env } from '@xenova/transformers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, ChevronRight, Leaf, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { bundledGuideRelease, loadGuideRelease } from './guideRelease';
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.remoteHost = 'https://huggingface.co';
const guideNames = { en: 'English', kn: 'ಕನ್ನಡ (Kannada)', tcy: 'ತುಳು (Tulu)' };
const suggestions = { en: ['How should I manage water during monsoon?', 'Which crops work well under areca?', 'How can I reduce disease risk?'], kn: ['ಮುಂಗಾರಿನಲ್ಲಿ ನೀರನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸಬೇಕು?', 'ಅಡಿಕೆಯೊಂದಿಗೆ ಯಾವ ಬೆಳೆಗಳನ್ನು ಬೆಳೆಯಬಹುದು?', 'ರೋಗದ ಅಪಾಯವನ್ನು ಹೇಗೆ ಕಡಿಮೆ ಮಾಡಬಹುದು?'], tcy: ['ಮುಂಗಾರೊಡು ನೀರ್ ಎಂಚ ನಿರ್ವಹಣೆ ಮಲ್ಪುನೆ?', 'ಅಡಿಕೆದ ಒಟ್ಟುಗು ವಾ ಬೆಳೆಕುಲು ಎಡ್ಡೆ?', 'ಸೀಕ್‌ದ ಅಪಾಯ ಎಂಚ ಕಮ್ಮಿ ಮಲ್ಪುನೆ?'] };
const labels = {
  en: { title: 'Ask Krishi', subtitle: 'Answers from your farming guide', latestSubtitle: 'Answers from the web', placeholder: 'Ask about crops, soil, water or schemes...', welcome: 'Hello. Ask me about farming in Dakshina Kannada.', greeting: 'Hello. How can I help with your farm today?', grounded: 'Grounded in your selected guide', latest: 'Ask the internet', guide: 'From the guide', sources: 'Source', empty: 'I could not find a close match in this guide. Try asking about a crop, season, soil, drainage, pests, schemes or markets.', latestError: 'Internet search is unavailable. Choose From the guide for an answer from the local guide, or start the API server and check its configuration.', close: 'Close assistant' },
  kn: { title: 'ಕೃಷಿಯನ್ನು ಕೇಳಿ', subtitle: 'ನಿಮ್ಮ ಕೃಷಿ ಮಾರ್ಗದರ್ಶಿಯಿಂದ ಉತ್ತರಗಳು', latestSubtitle: 'ಅಂತರ್ಜಾಲದಿಂದ ಉತ್ತರಗಳು', placeholder: 'ಬೆಳೆ, ಮಣ್ಣು, ನೀರು ಅಥವಾ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...', welcome: 'ನಮಸ್ಕಾರ. ದಕ್ಷಿಣ ಕನ್ನಡದ ಕೃಷಿಯ ಬಗ್ಗೆ ಕೇಳಿ.', greeting: 'ನಮಸ್ಕಾರ. ಇಂದು ನಿಮ್ಮ ಕೃಷಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?', grounded: 'ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಮಾರ್ಗದರ್ಶಿ ಆಧಾರಿತ', latest: 'ಇಂಟರ್ನೆಟ್ ಕೇಳಿ', guide: 'ಮಾರ್ಗದರ್ಶಿಯಿಂದ', sources: 'ಮೂಲ', empty: 'ಈ ಮಾರ್ಗದರ್ಶಿಯಲ್ಲಿ ಹತ್ತಿರದ ಉತ್ತರ ಸಿಗಲಿಲ್ಲ. ಬೆಳೆ, ಋತು, ಮಣ್ಣು, ಒಳಚರಂಡಿ, ಕೀಟ, ಯೋಜನೆ ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬಗ್ಗೆ ಕೇಳಿ.', latestError: 'ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಲಭ್ಯವಿಲ್ಲ. ಸ್ಥಳೀಯ ಮಾರ್ಗದರ್ಶಿಯ ಉತ್ತರಕ್ಕಾಗಿ ಮಾರ್ಗದರ್ಶಿಯಿಂದ ಆಯ್ಕೆಮಾಡಿ.', close: 'ಸಹಾಯಕನನ್ನು ಮುಚ್ಚಿ' },
  tcy: { title: 'ಕೃಷಿನ್ ಕೇಳಲೆ', subtitle: 'ನಿಕ್ಲೆನ ಮಾರ್ಗದರ್ಶಿರ್ದ್ ಉತ್ತರ', latestSubtitle: 'ಇಂಟರ್ನೆಟ್‌ರ್ದ್ ಉತ್ತರೊಲು', placeholder: 'ಬೆಳೆ, ಮಣ್ಣ್, ನೀರ್ ಅತ್ತ್ಂಡ ಯೋಜನೆ ಬಗ್ಗೆ ಕೇಳಲೆ...', welcome: 'ನಮಸ್ಕಾರ. ದಕ್ಷಿಣ ಕನ್ನಡದ ಕೃಷಿದ ಬಗ್ಗೆ ಕೇಳಲೆ.', greeting: 'ನಮಸ್ಕಾರ. ಈ ದಿನ ಉಮೆರ್ ಕೃಷಿಗ್ ಯಾನ್ ಎಂಚ ಸಹಾಯ ಮಲ್ಪೊಲಿ?', grounded: 'ಆಯ್ಕೆ ಮಲ್ತಿನ ಮಾರ್ಗದರ್ಶಿ ಆಧಾರಿತ', latest: 'ಇಂಟರ್ನೆಟ್ನ್ ಕೇಳಲೆ', guide: 'ಮಾರ್ಗದರ್ಶಿರ್ದ್', sources: 'ಮೂಲ', empty: 'ಈ ಮಾರ್ಗದರ್ಶಿಡ್ ಹತ್ತಿರದ ಉತ್ತರ ಸಿಕ್ಕಿಜಿ. ಬೆಳೆ, ಋತು, ಮಣ್ಣ್, ಡ್ರೈನೇಜ್, ಕೀಟ, ಯೋಜನೆ ಅತ್ತ್ಂಡ ಮಾರುಕಟ್ಟೆ ಬಗ್ಗೆ ಕೇಳಲೆ.', latestError: 'ಇಂಟರ್ನೆಟ್ ಲಭ್ಯವಿಜ್ಜಿ. ಸ್ಥಳೀಯ ಮಾರ್ಗದರ್ಶಿರ್ದ ಉತ್ತರೊಕ್ ಮಾರ್ಗದರ್ಶಿರ್ದ್ ಆಯ್ಕೆ ಮಲ್ಪುಲೆ.', close: 'ಸಹಾಯಕನ್ ಮುಚ್ಚಲೆ' }
};
// A separate store ensures old English-only vectors are never reused after changing models.
const VECTOR_DB_NAME = 'krishi-vector-database-multilingual-v2';
const VECTOR_STORE_NAME = 'guide-sections';
const MAX_RETRIEVED_SECTIONS = 3;
const SEMANTIC_RELEVANCE_THRESHOLD = 0.32;
let embedderPromise;
const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function buildSections(content, language, version) {
  return content.split(/(?=^##\s)/m).map((section, index) => {
    const heading = section.match(/^##\s+(.+)$/m)?.[1]?.trim();
    return heading ? { id: `${version}:${language}:${index}`, heading, content: section.trim() } : null;
  }).filter(Boolean);
}
// [
//   {
//     id: "v1:en:0",
//     heading: "Arecanut Farming",
//     content: "..."
//   },
//   {
//     id: "v1:en:1",
//     heading: "Monsoon Management",
//     content: "..."
//   },
//   {
//     id: "v1:en:2",
//     heading: "Disease Management",
//     content: "..."
//   }
// ]
function getEmbedder() { embedderPromise ||= pipeline('feature-extraction', EMBEDDING_MODEL); return embedderPromise; }
async function getContentHash(section) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${section.heading}\n${section.content}`));
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
async function readVectorIndex(language, version) {
  const database = await openVectorDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(VECTOR_STORE_NAME, 'readonly').objectStore(VECTOR_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result.filter((entry) => entry.language === language && entry.version === version));
    request.onerror = () => reject(request.error);
  });
}
async function writeVectorIndex(language, version, sections) {
  const embed = await getEmbedder();
  const vectors = await Promise.all(sections.map(async (section) => {
    const output = await embed(`${section.heading}\n${section.content}`, { pooling: 'mean', normalize: true });
    return { ...section, language, version, contentHash: await getContentHash(section), vector: Array.from(output.data) };
  }));
  const database = await openVectorDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(VECTOR_STORE_NAME, 'readwrite');
    vectors.forEach((vector) => transaction.objectStore(VECTOR_STORE_NAME).put(vector));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  return vectors;
}
async function getVectorIndex(language, version, sections) {
  const stored = await readVectorIndex(language, version);
  const hashes = await Promise.all(sections.map(getContentHash));
  return stored.length === sections.length && stored.every((entry, index) => entry.id === sections[index].id && entry.contentHash === hashes[index]) ? stored : writeVectorIndex(language, version, sections);
}
function cosineSimilarity(first, second) { return first.reduce((total, value, index) => total + value * second[index], 0); }
function isGreeting(question) { return /^(hi|hello|hey|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ)\s*[!.?]*$/iu.test(question); }
function findKeywordAnswer(question, sections) {
  const stopWords = new Set(['what', 'which', 'how', 'can', 'are', 'the', 'for', 'about', 'from', 'and', 'you', 'your', 'present']);
  const relatedTerms = { weather: ['climate', 'rainfall', 'monsoon'], climate: ['weather', 'rainfall', 'monsoon'], rain: ['rainfall', 'monsoon', 'drainage'], rainfall: ['rain', 'monsoon', 'drainage'] };
  // Kannada and Tulu words contain combining marks, so include them in a token instead of splitting words apart.
  const tokenize = (text) => text.toLocaleLowerCase().match(/[\p{L}\p{M}\p{N}]{2,}/gu) || [];
  const terms = [...new Set(tokenize(question).filter((term) => !stopWords.has(term)).flatMap((term) => [term, ...(relatedTerms[term] || [])]))];
  const ranked = sections.map((section) => {
    const headingTerms = new Set(tokenize(section.heading)); const contentTerms = new Set(tokenize(section.content));
    return { ...section, score: terms.reduce((total, term) => total + (headingTerms.has(term) ? 4 : contentTerms.has(term) ? 1 : 0), 0) };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked.slice(0, MAX_RETRIEVED_SECTIONS) : [];
}
async function findSemanticAnswer(question, language, version, sections) {
  try {
    const embed = await getEmbedder();
    const output = await embed(question, { pooling: 'mean', normalize: true });
    const index = await getVectorIndex(language, version, sections);
    const ranked = index.map((entry) => ({ ...entry, score: cosineSimilarity(Array.from(output.data), entry.vector) })).sort((a, b) => b.score - a.score);
    return ranked[0]?.score >= SEMANTIC_RELEVANCE_THRESHOLD ? ranked.slice(0, MAX_RETRIEVED_SECTIONS) : findKeywordAnswer(question, sections);
  } catch { return findKeywordAnswer(question, sections); }
}
async function askLatest(question, language, guideVersion, localMatches) {
  const response = await fetch(`${API_BASE_URL}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, language, guideVersion, localContext: localMatches.map(({ id, heading, content }) => ({ id, heading, content })) }) });
  if (!response.ok) throw new Error('Latest information is unavailable');
  return response.json();
}
function getGuideAnswer(matches, emptyMessage) {
  if (!matches.length) return emptyMessage;
  return matches.map((match) => match.content.replace(/^##\s+.+\r?\n/, '')).join('\n\n');
}
async function sendFeedback(message, category, comment) {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answerId: message.answerId, guideVersion: message.guideVersion, language: message.language, sectionIds: message.sectionIds, category, comment }) });
  if (!response.ok) throw new Error('Feedback could not be sent');
}

export default function App() {
  const [lang, setLang] = useState('en');
  const [release, setRelease] = useState(bundledGuideRelease);
  const [releaseStatus, setReleaseStatus] = useState('loading');
  const [chatOpen, setChatOpen] = useState(true);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('guide');
  const [asking, setAsking] = useState(false);
  const [indexStatus, setIndexStatus] = useState('loading');
  const refreshingRelease = useRef(false);
  const currentGuide = release.guides[lang];
  const currentLabels = labels[lang];
  const sections = useMemo(() => buildSections(currentGuide.content, lang, release.activeVersion), [currentGuide.content, lang, release.activeVersion]);
  //Take the current farming guide, split it into sections, and attach the language and guide version

  useEffect(() => {
    let cancelled = false;
    const refreshRelease = async () => {
      if (refreshingRelease.current) return;
      refreshingRelease.current = true;
      try {
        const next = await loadGuideRelease();
        if (next.activeVersion !== release.activeVersion) {
          await Promise.all(Object.keys(guideNames).map((language) =>
            getVectorIndex(language, next.activeVersion, buildSections(next.guides[language].content, language, next.activeVersion))
          ));
        }
        if (!cancelled) { setRelease(next); setReleaseStatus('ready'); }
      }
            catch (error) {
        console.error('Guide release failed:', error);

        if (!cancelled) {
          setReleaseStatus('unavailable');
        }
      }
      finally { refreshingRelease.current = false; }
    };
    refreshRelease();
    const interval = window.setInterval(refreshRelease, 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [release.activeVersion]);
  useEffect(() => {
    let cancelled = false; setIndexStatus('loading');
    getVectorIndex(lang, release.activeVersion, sections).then(() => !cancelled && setIndexStatus('ready')).catch(() => !cancelled && setIndexStatus('fallback'));
    return () => { cancelled = true; };
  }, [lang, release.activeVersion, sections]);

  function switchLanguage(nextLanguage) { setLang(nextLanguage); setMessages([]); }
  async function submitFeedback(message, category) {
    const comment = window.prompt('Optional comment for the reviewer:') || '';
    try { await sendFeedback(message, category, comment); setMessages((items) => items.map((item) => item.answerId === message.answerId ? { ...item, feedback: 'sent' } : item)); }
    catch { setMessages((items) => items.map((item) => item.answerId === message.answerId ? { ...item, feedback: 'failed' } : item)); }
  }
  async function ask(value = question) {
    const trimmed = value.trim(); if (!trimmed || asking) return;
    if (isGreeting(trimmed)) { setMessages((items) => [...items, { answerId: crypto.randomUUID(), question: trimmed, answer: currentLabels.greeting, language: lang, guideVersion: release.activeVersion, sectionIds: [] }]); setQuestion(''); return; }
    setAsking(true);
    try {
      const matches = await findSemanticAnswer(trimmed, lang, release.activeVersion, sections);
      const answer = mode === 'guide'
        ? getGuideAnswer(matches, currentLabels.empty)
        : (await askLatest(trimmed, lang, release.activeVersion, matches)).answer;
      setMessages((items) => [...items, { answerId: crypto.randomUUID(), question: trimmed, answer, source: matches.length ? matches.map((match) => match.heading).join(' · ') : null, sectionIds: matches.map((match) => match.id), language: lang, guideVersion: release.activeVersion }]); setQuestion('');
    } catch (error) {
      console.error(error);
      setMessages((items) => [...items, { answerId: crypto.randomUUID(), question: trimmed, answer: currentLabels.latestError, error: true, language: lang, guideVersion: release.activeVersion, sectionIds: [] }]);
    } finally { setAsking(false); }
  }

  return <div className="app-shell">
    <nav className="topbar"><div className="brand"><span className="brand-mark"><Leaf size={19} /></span><span>Krishi</span></div><div className="language-switcher" aria-label="Guide language">{Object.entries(guideNames).map(([key, name]) => <button key={key} onClick={() => switchLanguage(key)} className={lang === key ? 'language-button active' : 'language-button'}>{name}</button>)}</div></nav>
    <main className="content-layout"><section className="guide-column"><div className="guide-intro"><p className="eyebrow">FIELD NOTES / DAKSHINA KANNADA</p><h1>Practical knowledge<br /><em>for your next season.</em></h1><p className="intro-copy">A locally grounded guide to crops, climate, soil health and resilient farm decisions.</p><p className="guide-release">Guide v{release.activeVersion} · reviewed {currentGuide.reviewedAt || 'not recorded'}{releaseStatus === 'bundled' ? ' · using bundled release' : ''}</p></div><article className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{currentGuide.content}</ReactMarkdown></article></section>
    {chatOpen && <aside className="chat-panel" aria-label={currentLabels.title}><div className="chat-header"><div className="chat-title"><span className="chat-icon"><MessageCircle size={18} /></span><div><strong>{currentLabels.title}</strong><small>{mode === 'latest' ? currentLabels.latestSubtitle : currentLabels.subtitle}</small></div></div><button className="icon-button" onClick={() => setChatOpen(false)} aria-label={currentLabels.close}><X size={18} /></button></div><div className="chat-body"><div className="mode-switcher" role="group" aria-label="Answer mode"><button className={mode === 'guide' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('guide')}>{currentLabels.guide}</button><button className={mode === 'latest' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('latest')}>{currentLabels.latest}</button></div><div className="assistant-message"><span className="mini-avatar"><Sparkles size={14} /></span><p>{currentLabels.welcome}</p></div>{messages.map((message) => <div className="message-group" key={message.answerId}><div className="user-message">{message.question}</div><div className="assistant-message"><span className="mini-avatar"><Sparkles size={14} /></span><div><div className="chat-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.answer}</ReactMarkdown></div>{message.source && <small className="citation"><BookOpen size={13} /> {currentLabels.sources}: {message.source}</small>}{!message.error && (message.feedback ? <small className="feedback-status">{message.feedback === 'sent' ? 'Feedback recorded' : 'Feedback unavailable'}</small> : <div className="feedback-actions"><span>Report this answer:</span>{['outdated', 'unsafe', 'unclear'].map((category) => <button key={category} onClick={() => submitFeedback(message, category)}>{category}</button>)}</div>)}</div></div></div>)}<div className="suggestion-list">{suggestions[lang].map((suggestion) => <button key={suggestion} className="suggestion" onClick={() => ask(suggestion)} disabled={asking}>{suggestion}<ChevronRight size={15} /></button>)}</div></div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={currentLabels.placeholder} aria-label={currentLabels.placeholder} disabled={asking} /><button type="submit" aria-label="Send question" disabled={asking}><Send size={17} /></button></form><div className="grounding-note"><span className="status-dot" /> {indexStatus === 'loading' ? 'Preparing semantic search...' : indexStatus === 'fallback' ? 'Keyword matching is in use' : currentLabels.grounded}</div></aside>}
    {!chatOpen && <button className="reopen-chat" onClick={() => setChatOpen(true)}><MessageCircle size={18} /> {currentLabels.title}</button>}</main>
  </div>;
}
