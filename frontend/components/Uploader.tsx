"use client";

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Download, Info } from 'lucide-react';
import axios from 'axios';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/lib/i18n";

interface UploaderProps {
    onUploadSuccess: (summary: unknown) => void;
    backendUrl: string;
}

export default function Uploader({ onUploadSuccess, backendUrl }: UploaderProps) {
    const { t } = useTranslation();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${backendUrl}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadSuccess(response.data);
        } catch (err: unknown) {
            console.error(err);
            let errorMessage: string;
            if (axios.isAxiosError(err)) {
                errorMessage = err.response?.data?.detail || err.message || 'Failed to upload file. Please try again.';
            } else if (err instanceof Error) {
                errorMessage = err.message;
            } else {
                errorMessage = 'An unknown error occurred during upload.';
            }
            setError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-dashed border-2 bg-white/50 backdrop-blur-sm">
            <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="p-6 bg-primary/10 rounded-full animate-pulse">
                        <FileSpreadsheet className="w-12 h-12 text-primary" />
                    </div>

                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold tracking-tight text-gray-900">{t('upload.title')}</h3>
                        <p className="text-muted-foreground">
                            {t('upload.subtitle')}
                        </p>
                    </div>

                    <div className="w-full space-y-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx,.xls"
                            className="hidden"
                            disabled={isUploading}
                        />
                        <div
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${isUploading ? 'bg-gray-50 cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-gray-50/50'
                                }`}
                        >
                            {isUploading ? (
                                <>
                                    <div className="animate-spin mb-2">
                                        <Upload className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <span className="text-sm text-blue-600 font-medium">Processing File... Please wait</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-500 font-medium">{t('upload.drop_text')}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex w-full justify-between items-center pt-2">
                        <a href="/keyword_template.xlsx" download className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            {t('upload.download_template')}
                        </a>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Info className="w-3 h-3" /> {t('upload.note_2')}
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
