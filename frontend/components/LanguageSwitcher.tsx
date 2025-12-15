"use client";

import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { locale, setLocale } = useTranslation();



    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 text-foreground font-semibold hover:bg-muted/80">
                    <Globe className="h-4 w-4" />
                    <span className="uppercase">{locale}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale('zh')}>
                    🇨🇳 中文 {locale === 'zh' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('en')}>
                    🇺🇸 English {locale === 'en' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('es')}>
                    🇪🇸 Español {locale === 'es' && '✓'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
