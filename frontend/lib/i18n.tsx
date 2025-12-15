"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import es from '@/locales/es.json';

type Locale = 'en' | 'zh' | 'es';
type Translations = typeof en;

const translations: Record<Locale, Translations> = {
    en,
    zh,
    es
};

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en'); // Default to English

    useEffect(() => {
        // Load from localStorage
        const saved = localStorage.getItem('app_locale') as Locale;
        if (saved && (saved === 'en' || saved === 'zh' || saved === 'es')) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocaleState(saved);
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('app_locale', newLocale);
    };

    const t = (path: string) => {
        const keys = path.split('.');
        let current: unknown = translations[locale];

        for (const key of keys) {
            if (typeof current === 'object' && current !== null && key in current) {
                current = (current as Record<string, unknown>)[key];
            } else {
                console.warn(`Translation missing for key: ${path} in locale: ${locale}`);
                return path;
            }
        }

        return String(current);
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
}
