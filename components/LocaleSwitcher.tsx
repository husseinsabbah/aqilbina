'use client';

import { ChevronDown, Globe } from 'lucide-react';
import { locales, setLocale, getLocaleFromStorage, type Locale } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';

const localeLabels: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'AR',
};

export function LocaleSwitcher() {
  const [locale, setLocalLocale] = useState<Locale>(() => getLocaleFromStorage());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: Locale) => {
    setLocalLocale(item);
    setOpen(false);
    setLocale(item);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
        aria-expanded={open}
        aria-label="Sélecteur de langue"
      >
        <Globe className="h-3.5 w-3.5 text-slate-500" />
        <span>{localeLabels[locale]}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-28 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {locales.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                locale === item ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{localeLabels[item]}</span>
              {locale === item && <span className="text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
