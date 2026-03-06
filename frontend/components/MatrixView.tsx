"use client";

import { Check, X } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

interface MatrixRow {
    keyword: string;
    search_volume: number;
    rank: number;
    conversion_rate?: string | number;
    cpc?: string | number;
    competitors?: string | number;
    [key: string]: string | number | boolean | undefined;
}

interface MatrixViewProps {
    data: MatrixRow[];
    asins: string[];
}

export default function MatrixView({ data, asins }: MatrixViewProps) {
    const { t } = useTranslation();

    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[200px] sticky left-0 bg-gray-50/50 z-10 font-bold">{t('results.matrix_keyword') || 'Keyword'}</TableHead>
                            <TableHead className="whitespace-nowrap font-bold">Translation</TableHead>
                            <TableHead className="whitespace-nowrap font-bold">Type</TableHead>
                            <TableHead className="whitespace-nowrap font-bold text-right">Search Vol</TableHead>
                            <TableHead className="whitespace-nowrap font-bold text-right">Rank</TableHead>
                            <TableHead className="whitespace-nowrap font-bold text-right">CVR (%)</TableHead>
                            <TableHead className="whitespace-nowrap font-bold text-right">CPC ($)</TableHead>
                            <TableHead className="whitespace-nowrap font-bold text-right">Competitors</TableHead>
                            {asins.map((asin) => (
                                <TableHead key={asin} className="text-center min-w-[100px] font-bold text-primary">
                                    {asin}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/50">
                                <TableCell className="font-medium sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {row.keyword}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {row.translation || '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`${row.segment === 'Core' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        row.segment === 'Mid-tail' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                        {row.segment || 'Long-tail'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground font-mono">
                                    {(row.search_volume ?? 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground font-mono">
                                    {row.rank == null || row.rank === 999999 ? '--' : row.rank}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground font-mono">
                                    {row.conversion_rate || '--'}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground font-mono">
                                    {row.cpc || '--'}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground font-mono">
                                    {row.competitors || '--'}
                                </TableCell>
                                {asins.map((asin) => (
                                    <TableCell key={asin} className="text-center">
                                        <div className="flex justify-center">
                                            {row[asin] === 1 ? (
                                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <X className="w-4 h-4 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
