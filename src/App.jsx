import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import guideEn from './content/guide_en.md?raw';
import guideKn from './content/guide_kn.md?raw';
import guideTcy from './content/guide_tcy.md?raw';

const guides = {
  en: { name: 'English', content: guideEn },
  kn: { name: 'ಕನ್ನಡ (Kannada)', content: guideKn },
  tcy: { name: 'ತುಳು (Tulu)', content: guideTcy }
};

export default function App() {
  const [lang, setLang] = useState('en');

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans flex flex-col">
      <nav className="sticky top-0 z-50 bg-dark-surface border-b border-dark-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="text-2xl font-extrabold text-dark-text tracking-tight" style={{ fontFamily: 'Merriweather, serif' }}>
          Krishi
        </div>
        <div className="flex gap-2">
          {Object.entries(guides).map(([key, { name }]) => (
            <button
              key={key}
              onClick={() => setLang(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                lang === key 
                  ? 'bg-dark-primary text-dark-bg shadow-sm' 
                  : 'bg-dark-bg text-dark-text border border-dark-border hover:bg-dark-secondary/50'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8 animate-in fade-in duration-500">
        <article className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {guides[lang].content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
