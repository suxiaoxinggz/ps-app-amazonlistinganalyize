"use client";

import { BarChart3, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n";

interface HeaderProps {
    onSettingsClick: () => void;
    onHomeClick: () => void;
}

export function Header({ onSettingsClick, onHomeClick }: HeaderProps) {
    const { t } = useTranslation();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-16 items-center justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={onHomeClick}
                >
                    <div className="p-2 bg-primary rounded-lg shadow-sm">
                        <BarChart3 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground hidden md:inline-block">
                        {t('app.title')}
                    </span>
                    <span className="text-xl font-bold tracking-tight text-foreground md:hidden">
                        ALA
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSettingsClick}
                        className="gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline-block">{t('app.settings')}</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
