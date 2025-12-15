"use client";

import { I18nProvider } from '@/lib/i18n';
import MainPage from '@/components/MainPage';

export default function Home() {
  return (
    <I18nProvider>
      <MainPage />
    </I18nProvider>
  );
}
