"use client";

import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GuideItem {
    zh: string;
    en: string;
}

interface StepGuideProps {
    titleZh: string;
    titleEn: string;
    steps: GuideItem[];
    tips?: GuideItem[];
}

export default function StepGuide({ titleZh, titleEn, steps, tips }: StepGuideProps) {
    return (
        <Card className="mt-8 border-dashed bg-muted/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    {titleZh} / {titleEn}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Chinese */}
                    <div className="space-y-2">
                        <p className="font-medium text-foreground">📖 操作步骤</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            {steps.map((s, i) => (
                                <li key={i}>{s.zh}</li>
                            ))}
                        </ol>
                        {tips && tips.length > 0 && (
                            <>
                                <p className="font-medium text-foreground pt-2">💡 提示</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {tips.map((t, i) => (
                                        <li key={i}>{t.zh}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                    {/* English */}
                    <div className="space-y-2">
                        <p className="font-medium text-foreground">📖 Steps</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            {steps.map((s, i) => (
                                <li key={i}>{s.en}</li>
                            ))}
                        </ol>
                        {tips && tips.length > 0 && (
                            <>
                                <p className="font-medium text-foreground pt-2">💡 Tips</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {tips.map((t, i) => (
                                        <li key={i}>{t.en}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
