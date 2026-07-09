import React from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf, Search, Globe } from 'lucide-react';

export default function Navbar({ onSearch }) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('en') ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <nav className="h-16 border-b border-dark-border bg-dark-surface flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-dark-primary/20 p-2 rounded-lg">
          <Leaf className="w-6 h-6 text-dark-primary" />
        </div>
        <span className="text-lg font-bold text-dark-text tracking-wide hidden sm:block">
          {t('app_title')}
        </span>
      </div>

      <div className="flex-1 max-w-md mx-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-dark-muted group-focus-within:text-dark-primary transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-dark-border rounded-xl leading-5 bg-dark-bg text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-dark-primary/50 focus:border-dark-primary sm:text-sm transition-all"
            placeholder={t('search')}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-bg transition-colors border border-transparent hover:border-dark-border"
          title={t('select_language')}
        >
          <Globe className="w-5 h-5 text-dark-muted" />
          <span className="text-sm font-medium text-dark-text uppercase">{i18n.language.substring(0,2)}</span>
        </button>
      </div>
    </nav>
  );
}
