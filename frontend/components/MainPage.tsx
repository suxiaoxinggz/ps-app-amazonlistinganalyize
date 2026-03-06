"use client";

import { useState, useEffect, useMemo } from 'react';
import Uploader from '@/components/Uploader';
import MatrixView from '@/components/MatrixView';
import { Header } from '@/components/Header';
import { Plus, Download, Maximize2, Trash2, Languages, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '@/lib/i18n';
import ProjectEntry from '@/components/ProjectEntry';
import StepGuide from '@/components/StepGuide';

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface Listing {
    asin: string;
    text: string;
    translation?: string;
}

interface SummaryStats {
    coverage_percentage: number;
    volume_coverage: number;
    segment_stats: Record<string, { total_count: number; matched_count: number }>;
}

interface KeywordStats {
    keyword: string;
    translation?: string;
    segment: string;
    search_volume: number;
    rank: number;
    conversion_rate?: number;
    cpc?: number;
    competitors?: number;
    [key: string]: string | number | boolean | undefined;
}

interface AnalysisResult {
    matrix: KeywordStats[];
    summary: Record<string, SummaryStats>;
    global_stats: {
        total_keywords: number;
        total_volume: number;
    };
}

export default function MainPage() {
    const { t } = useTranslation();

    // -- State --
    const [backendUrl, setBackendUrl] = useState(process.env.NEXT_PUBLIC_API_URL || 'https://api.mistorify.com');
    const [showSettings, setShowSettings] = useState(false);

    // Persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUrl = localStorage.getItem('backend_url');
            if (savedUrl) setBackendUrl(savedUrl);
        }
    }, []);

    const handleBackendUrlChange = (url: string) => {
        setBackendUrl(url);
        localStorage.setItem('backend_url', url);
    };

    const [step, setStep] = useState<'project' | 'upload' | 'listings' | 'results'>('project');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [listings, setListings] = useState<Listing[]>([{ asin: '', text: '' }]);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleProjectReady = (pid: string, name: string) => {
        setProjectId(pid);
        setProjectName(name);
        setStep('upload');
    };

    // API Settings
    const [provider, setProvider] = useState('OpenAI');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
    const [model, setModel] = useState('gpt-3.5-turbo');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // UI State
    const [expandedInput, setExpandedInput] = useState<number | null>(null);
    const [optimizationSetup, setOptimizationSetup] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [optimizationKeywords, setOptimizationKeywords] = useState<{ keyword: string; translation?: string; segment: string; selected: boolean }[]>([]);
    const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
    const [expandedTranslation, setExpandedTranslation] = useState<number | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const providers: Record<string, { url: string; models: string[] }> = useMemo(() => ({
        'OpenAI': { url: 'https://api.openai.com/v1', models: ['gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4o'] },
        'DeepSeek': { url: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-coder'] },
        'OpenRouter': { url: 'https://openrouter.ai/api/v1', models: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-opus', 'google/gemini-pro'] },
        'Google': { url: 'https://generativelanguage.googleapis.com/v1beta/openai/', models: ['gemini-1.5-flash', 'gemini-1.5-pro'] }
    }), []);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        setBaseUrl(providers[newProvider].url);
        setModel(providers[newProvider].models[0]);
    };

    useEffect(() => {
        setAvailableModels(providers[provider].models);
    }, [provider, providers]);

    const fetchModels = async () => {
        try {
            let fetchedModels: string[] = [];
            if (provider === 'OpenRouter') {
                const response = await axios.get('https://openrouter.ai/api/v1/models');
                fetchedModels = response.data.data.map((m: { id: string }) => m.id);
            } else if (provider === 'Google') {
                if (!apiKey) { alert('API Key Required'); return; }
                const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models`, {
                    headers: { 'x-goog-api-key': apiKey }
                });
                fetchedModels = response.data.models.map((m: { name: string }) => m.name.replace('models/', ''));
            } else {
                if (!apiKey) { alert('API Key Required'); return; }
                let url = baseUrl;
                if (!url.endsWith('/')) url += '/';
                url += 'models';
                const response = await axios.get(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                fetchedModels = response.data.data.map((m: { id: string }) => m.id);
            }
            fetchedModels.sort();
            setAvailableModels(fetchedModels);
            if (fetchedModels.length > 0) setModel(fetchedModels[0]);
        } catch (error) {
            console.error(error);
            alert("Failed to fetch models.");
        }
    };

    const handleUploadSuccess = (summary: unknown) => {
        console.log("Upload success:", summary);
        setStep('listings');
    };

    const addListing = () => setListings([...listings, { asin: '', text: '' }]);
    const updateListing = (index: number, field: keyof Listing, value: string) => {
        const newListings = [...listings];
        newListings[index][field] = value;
        setListings(newListings);
    };
    const deleteListing = (index: number) => {
        if (listings.length <= 1) return;
        setListings(listings.filter((_, i) => i !== index));
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const validListings = listings.filter(l => l.asin && l.text);
            const response = await axios.post(`${backendUrl}/analyze`, { listings: validListings, project_id: projectId });
            setAnalysisResult(response.data);
            setStep('results');
        } catch (error) {
            console.error(error);
            alert("Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTranslate = async () => {
        if (!apiKey) { setShowSettings(true); return; }
        if (!analysisResult) return;
        setIsTranslating(true);
        try {
            const allUntranslated = analysisResult.matrix
                .filter((r: KeywordStats) => !r.translation)
                .map((r: KeywordStats) => r.keyword);
            const keywordsToTranslate = allUntranslated.slice(0, 50);
            if (keywordsToTranslate.length === 0) return;
            if (allUntranslated.length > 50) {
                console.warn(`Translating first 50 of ${allUntranslated.length} keywords. Click again to translate more.`);
            }

            const response = await axios.post(`${backendUrl}/api/translate`, {
                keywords: keywordsToTranslate, api_key: apiKey, base_url: baseUrl, model: model
            });
            const translations = response.data;
            const newMatrix = analysisResult.matrix.map((row: KeywordStats) => ({
                ...row, translation: translations[row.keyword] || row.translation
            }));
            setAnalysisResult({ ...analysisResult, matrix: newMatrix });
        } catch (error) { console.error(error); } finally { setIsTranslating(false); }
    };

    const openOptimizationSetup = (asin: string) => {
        if (!analysisResult) return;
        const segments = ['Core', 'Mid-tail', 'Long-tail'];
        let allKeywords: (KeywordStats & { selected: boolean })[] = [];
        segments.forEach(seg => {
            const segmentKeywords = analysisResult.matrix
                .filter((r: KeywordStats) => r[asin] === 0 && r.segment === seg)
                .sort((a: KeywordStats, b: KeywordStats) => b.search_volume - a.search_volume)
                .slice(0, 20)
                .map((r: KeywordStats) => ({
                    ...r,
                    selected: false
                }));
            segmentKeywords.forEach((k: { selected: boolean }, idx: number) => {
                if (idx < 5) k.selected = true;
            });
            allKeywords = [...allKeywords, ...segmentKeywords];
        });
        setOptimizationKeywords(allKeywords);
        setCustomPrompt("Please rewrite the Title and Bullet Points to naturally include these missing keywords while maintaining readability and sales copy best practices.\nMark the inserted keywords in **bold**.");
        setOptimizationSetup(asin);
    };

    const toggleKeyword = (index: number) => {
        const newKeywords = [...optimizationKeywords];
        const target = newKeywords[index];
        if (!target.selected) {
            const currentSelectedCount = newKeywords.filter(k => k.selected).length;
            if (currentSelectedCount >= 30) {
                alert("You can select a maximum of 30 keywords.");
                return;
            }
        }
        target.selected = !target.selected;
        setOptimizationKeywords(newKeywords);
    };

    const runOptimization = async () => {
        if (!optimizationSetup || !apiKey) return;
        setIsOptimizing(true);
        try {
            const listing = listings.find(l => l.asin === optimizationSetup);
            if (!listing) return;
            const response = await axios.post(`${backendUrl}/api/optimize`, {
                listing: { title: listing.text, bullets: '' },
                missing_keywords: optimizationKeywords.filter(k => k.selected).map(k => k.keyword),
                api_key: apiKey, base_url: baseUrl, model: model, custom_prompt: customPrompt
            });
            const newAsin = `${optimizationSetup}-V2`;
            const newListing = { asin: newAsin, text: response.data.suggestion };
            setListings([...listings, newListing]);
            setStep('listings');
            setOptimizationSetup(null);
        } catch (error) { console.error(error); alert("Optimization failed."); } finally { setIsOptimizing(false); }
    };

    const handleTranslateListing = async (index: number) => {
        if (!apiKey) { setShowSettings(true); return; }
        setTranslatingIndex(index);
        try {
            const listing = listings[index];
            const response = await axios.post(`${backendUrl}/api/translate_listing`, {
                text: listing.text, api_key: apiKey, base_url: baseUrl, model: model
            });
            updateListing(index, 'translation', response.data.translation);
        } catch (error) { console.error(error); } finally { setTranslatingIndex(null); }
    };

    const exportToCSV = () => {
        if (!analysisResult) return;
        const asins = listings.filter(l => l.asin).map(l => l.asin);
        const escapeCsv = (val: unknown): string => {
            const str = String(val ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const headers = ['Keyword', 'Translation', 'Segment', 'Search Volume', 'Rank', 'CVR', 'CPC', 'Competitors', ...asins].map(h => escapeCsv(h));
        const rows = analysisResult.matrix.map((row: KeywordStats) => {
            return [
                escapeCsv(row.keyword),
                escapeCsv(row.translation || ''),
                escapeCsv(row.segment || 'Unknown'),
                escapeCsv(row.search_volume ?? 0),
                escapeCsv(row.rank == null || row.rank === 999999 ? '--' : row.rank),
                escapeCsv(row.conversion_rate || ''),
                escapeCsv(row.cpc || ''),
                escapeCsv(row.competitors || ''),
                ...asins.map((asin: string) => row[asin] === 1 ? 'Yes' : 'No')
            ];
        });
        // Add UTF-8 BOM for Excel Chinese display
        const bom = '\uFEFF';
        const csvContent = bom + [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'amazon_listing_analysis.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Header
                onSettingsClick={() => setShowSettings(true)}
                onHomeClick={() => setStep('project')}
            />

            <main className="container py-8 max-w-7xl mx-auto">
                {/* Project info badge */}
                {projectId && step !== 'project' && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">Project: {projectName} ({projectId})</Badge>
                        <Button variant="ghost" size="sm" onClick={() => { setStep('project'); setProjectId(null); setProjectName(''); setAnalysisResult(null); }}>
                            Switch Project
                        </Button>
                    </div>
                )}

                {step === 'project' && (
                    <ProjectEntry backendUrl={backendUrl} onProjectReady={handleProjectReady} />
                )}

                {step === 'upload' && (
                    <div className="relative isolate overflow-hidden bg-white px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0 rounded-3xl border shadow-sm">
                        <div className="absolute inset-0 -z-10 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/hero-bg.png" alt="Background" className="absolute top-0 left-0 w-full h-full object-cover opacity-40 blur-sm" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/70 to-white/30" />
                        </div>

                        <div className="mx-auto max-w-2xl text-center relative z-10">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
                                {t('upload.title')}
                            </h1>
                            <p className="text-lg leading-8 text-gray-600 mb-10">
                                {t('upload.subtitle')}
                            </p>
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-xl">
                                <Uploader onUploadSuccess={handleUploadSuccess} backendUrl={backendUrl} projectId={projectId} />
                            </div>
                        </div>

                        <div className="mx-auto max-w-3xl mt-8 relative z-10">
                            <StepGuide
                                titleZh="上传操作指南"
                                titleEn="Upload Guide"
                                steps={[
                                    { zh: '准备关键词Excel文件，需包含"关键词/Keyword"列', en: 'Prepare a keyword Excel file with a "Keyword/关键词" column' },
                                    { zh: '可选列：搜索量(Search Volume)、排名(Rank)、转化率(CVR)、CPC、竞争度(Competitors)', en: 'Optional columns: Search Volume, Rank, CVR, CPC, Competitors' },
                                    { zh: '点击上传区域或拖拽文件上传，支持 .xlsx/.xls 格式', en: 'Click the upload area or drag-and-drop, supports .xlsx/.xls format' },
                                    { zh: '上传成功后，系统自动索引关键词并跳转到下一步', en: 'After upload, the system auto-indexes keywords and advances to the next step' },
                                ]}
                                tips={[
                                    { zh: '可下载模板文件查看推荐的Excel格式', en: 'Download the template file to see the recommended Excel format' },
                                    { zh: '支持多级表头和不同列名格式，系统会自动识别', en: 'Multi-level headers and different column names are auto-detected' },
                                    { zh: '关键词数量建议控制在5万以内以获得最佳性能', en: 'For best performance, keep keyword count under 50,000' },
                                ]}
                            />
                        </div>
                    </div>
                )}

                {step === 'listings' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">{t('listings.title')}</h2>
                                <p className="text-muted-foreground text-sm">Add your ASINs and content to benchmark against the keyword database.</p>
                            </div>
                            <Button onClick={runAnalysis} disabled={isAnalyzing} size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all">
                                {isAnalyzing ? t('listings.analyzing') : <><Sparkles className="w-4 h-4" /> {t('listings.run_analysis')}</>}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {listings.map((listing, idx) => (
                                <Card key={idx} className="group hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Listing {idx + 1}</CardTitle>
                                        <Button variant="ghost" size="icon" onClick={() => deleteListing(idx)} className="text-muted-foreground hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>ASIN</Label>
                                            <Input
                                                value={listing.asin}
                                                onChange={(e) => updateListing(idx, 'asin', e.target.value)}
                                                placeholder={t('listings.asin_placeholder')}
                                                className="font-mono uppercase max-w-[200px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label>Listing Content</Label>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => handleTranslateListing(idx)}>
                                                        {translatingIndex === idx ? '...' : <><Languages className="w-3 h-3" /> {t('listings.translate_listing')}</>}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedInput(idx)}>
                                                        <Maximize2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Textarea
                                                value={listing.text}
                                                onChange={(e) => updateListing(idx, 'text', e.target.value)}
                                                placeholder={t('listings.text_placeholder')}
                                                className="min-h-[150px] font-sans"
                                            />
                                        </div>

                                        {listing.translation && (
                                            <div className="pt-4 border-t">
                                                <div className="flex justify-between mb-2">
                                                    <Label className="text-xs text-muted-foreground">Chinese Translation</Label>
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedTranslation(idx)}>
                                                        <Maximize2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <Textarea
                                                    value={listing.translation}
                                                    readOnly
                                                    className="bg-muted/50 min-h-[100px] text-sm"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Button variant="outline" className="w-full border-dashed py-8 border-2 gap-2 h-auto" onClick={addListing}>
                            <Plus className="w-4 h-4" /> {t('listings.add_new')}
                        </Button>

                        <StepGuide
                            titleZh="Listing输入操作指南"
                            titleEn="Listing Input Guide"
                            steps={[
                                { zh: '输入ASIN编号（10位亚马逊产品标识码）', en: 'Enter the ASIN (10-character Amazon product identifier)' },
                                { zh: '在"Listing Content"中粘贴完整的商品文案（标题+五点+描述+ST）', en: 'Paste the full listing text (Title + Bullets + Description + Search Terms) into "Listing Content"' },
                                { zh: '可添加多个Listing进行对比分析（点击底部"+"按钮）', en: 'Add multiple listings for comparison (click the "+" button at bottom)' },
                                { zh: '可使用翻译按钮将英文Listing翻译为中文（需先配置AI设置）', en: 'Use the translate button to translate English listings to Chinese (requires AI settings)' },
                                { zh: '确认无误后点击右上角"Run Analysis"开始分析', en: 'Click "Run Analysis" in the top right to start analysis' },
                            ]}
                            tips={[
                                { zh: '建议粘贴完整的Listing内容以获得最准确的覆盖率分析', en: 'Paste the complete listing content for the most accurate coverage analysis' },
                                { zh: '翻译功能需在右上角设置中配置AI Provider和API Key', en: 'Translation requires configuring AI Provider and API Key in settings (top-right)' },
                                { zh: '支持同时分析最多10个Listing进行竞品对比', en: 'Supports analyzing up to 10 listings for competitor comparison' },
                            ]}
                        />
                    </div>
                )}

                {step === 'results' && analysisResult && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">{t('results.title')}</h2>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep('listings')}>{t('results.back')}</Button>
                                <Button variant="outline" onClick={handleTranslate} disabled={isTranslating}>
                                    {isTranslating ? t('results.translating') : t('results.translate_keywords')}
                                </Button>
                                <Button onClick={exportToCSV} className="gap-2">
                                    <Download className="w-4 h-4" /> {t('results.export_csv')}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-primary text-primary-foreground">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium opacity-90">{t('results.total_keywords')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{analysisResult.global_stats.total_keywords.toLocaleString()}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{t('results.total_volume')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{analysisResult.global_stats.total_volume.toLocaleString()}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Per Listing Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.entries(analysisResult.summary).map(([asin, stats]) => (
                                <Card key={asin} className="overflow-hidden border-l-4 border-l-primary">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-base font-bold">{asin}</CardTitle>
                                        <Button size="sm" variant="secondary" onClick={() => openOptimizationSetup(asin)} disabled={isOptimizing}>
                                            {isOptimizing ? t('results.optimizing') : t('results.optimize')}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Keyword Coverage</div>
                                                <div className="text-lg font-bold">{stats.coverage_percentage.toFixed(1)}%</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Volume Coverage</div>
                                                <div className="text-lg font-bold">{stats.volume_coverage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="space-y-3">
                                            {['Core', 'Mid-tail', 'Long-tail'].map(seg => {
                                                const s = stats.segment_stats[seg];
                                                const countPct = s.total_count > 0 ? (s.matched_count / s.total_count * 100) : 0;
                                                return (
                                                    <div key={seg} className="space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">{seg}</span>
                                                            <span>{countPct.toFixed(0)}%</span>
                                                        </div>
                                                        <Progress value={countPct} className="h-1.5" />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('results.keyword_coverage')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MatrixView data={analysisResult.matrix} asins={listings.filter(l => l.asin).map(l => l.asin)} />
                            </CardContent>
                        </Card>

                        <StepGuide
                            titleZh="分析结果操作指南"
                            titleEn="Results Guide"
                            steps={[
                                { zh: '顶部卡片显示关键词总数、总搜索量等全局统计', en: 'Top cards show global stats: total keywords, total search volume, etc.' },
                                { zh: '每个ASIN卡片显示该Listing的关键词覆盖率和搜索量覆盖率', en: 'Each ASIN card shows that listing\'s keyword coverage and volume coverage' },
                                { zh: '点击"Translate Keywords"翻译所有关键词为中文（需配置AI）', en: 'Click "Translate Keywords" to translate all keywords to Chinese (requires AI setup)' },
                                { zh: '点击ASIN卡片中的"Optimize"按钮，AI会根据缺失关键词给出优化建议', en: 'Click "Optimize" on any ASIN card — AI suggests improvements based on missing keywords' },
                                { zh: '点击"Export CSV"下载完整的分析报告', en: 'Click "Export CSV" to download the complete analysis report' },
                            ]}
                            tips={[
                                { zh: '分段统计（核心词/长尾词等）帮助你了解不同重要级别的覆盖情况', en: 'Segment stats (Core/Long-tail) help you understand coverage by importance level' },
                                { zh: '矩阵表中绿色"✓"表示该关键词在该Listing中被覆盖', en: 'Green "✓" in the matrix means that keyword is covered in that listing' },
                                { zh: '搜索量覆盖率往往比关键词数量覆盖率更有参考价值', en: 'Volume coverage is often more valuable than keyword count coverage' },
                                { zh: '导出的CSV文件包含翻译列，用Excel打开中文不会乱码', en: 'The exported CSV includes translations and displays Chinese correctly in Excel' },
                            ]}
                        />
                    </div>
                )}
            </main>

            {/* Settings Dialog */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('settings_modal.title')}</DialogTitle>
                        <DialogDescription>
                            Configure your AI provider settings. API Keys are stored locally in your browser.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('settings_modal.backend_url')}</Label>
                            <Input value={backendUrl} onChange={(e) => handleBackendUrlChange(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('settings_modal.provider')}</Label>
                            <Select value={provider} onValueChange={handleProviderChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.keys(providers).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('settings_modal.api_key')}</Label>
                            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('settings_modal.model')}</Label>
                            <div className="flex gap-2">
                                <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={fetchModels}>{t('settings_modal.fetch_models')}</Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Optimization Dialog */}
            <Dialog open={!!optimizationSetup} onOpenChange={(open) => !open && setOptimizationSetup(null)}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('optimization.title')}: {optimizationSetup}</DialogTitle>
                        <DialogDescription>{t('optimization.subtitle')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="text-sm font-medium">{t('optimization.selected')}: {optimizationKeywords.filter(k => k.selected).length}/30</div>
                        </div>
                        <div className="flex-1 border rounded-md p-4 overflow-y-auto">
                            <div className="space-y-6">
                                {['Core', 'Mid-tail', 'Long-tail'].map(seg => {
                                    const segKeywords = optimizationKeywords.filter(k => k.segment === seg);
                                    if (segKeywords.length === 0) return null;
                                    return (
                                        <div key={seg} className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase text-muted-foreground sticky top-0 bg-white z-10 py-1">{seg}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {optimizationKeywords.map((kw, idx) => {
                                                    if (kw.segment !== seg) return null;
                                                    return (
                                                        <Badge
                                                            key={kw.keyword}
                                                            variant={kw.selected ? "default" : "outline"}
                                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => toggleKeyword(idx)}
                                                        >
                                                            {kw.keyword}
                                                            {kw.translation && <span className="ml-1 opacity-70 text-[10px]">({kw.translation})</span>}
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('optimization.custom_prompt')}</Label>
                            <Textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="h-24 text-xs font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setOptimizationSetup(null)}>{t('optimization.cancel')}</Button>
                        <Button onClick={runOptimization} disabled={isOptimizing}>
                            {isOptimizing ? t('optimization.generating') : t('optimization.start')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Expanded Input Dialog */}
            <Dialog open={expandedInput !== null} onOpenChange={(open) => !open && setExpandedInput(null)}>
                <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Edit Content</DialogTitle></DialogHeader>
                    <Textarea
                        value={expandedInput !== null ? listings[expandedInput].text : ''}
                        onChange={(e) => expandedInput !== null && updateListing(expandedInput, 'text', e.target.value)}
                        className="flex-1 font-mono resize-none"
                    />
                </DialogContent>
            </Dialog>

            {/* Expanded Translation Dialog */}
            <Dialog open={expandedTranslation !== null} onOpenChange={(open) => !open && setExpandedTranslation(null)}>
                <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Translation</DialogTitle></DialogHeader>
                    <Textarea
                        value={expandedTranslation !== null ? listings[expandedTranslation].translation || '' : ''}
                        readOnly
                        className="flex-1 font-mono resize-none bg-muted"
                    />
                </DialogContent>
            </Dialog>

        </div>
    );
}
