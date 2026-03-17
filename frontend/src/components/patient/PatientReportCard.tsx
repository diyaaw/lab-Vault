'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import VoiceSummaryButton from './VoiceSummaryButton';
import { reportService } from '@/services/reportService';
import Link from 'next/link';
import { getMetricConfig } from '@/utils/clinicalMetrics';

interface PatientReportCardProps {
    report: {
        _id: string;
        reportName: string;
        testType: string;
        uploadDate: string;
        fileUrl: string;
        extractedData?: any;
        aiSummary?: string;
    };
}

export default function PatientReportCard({ report: initialReport }: PatientReportCardProps) {
    const { t } = useLanguage();
    const [report, setReport] = useState(initialReport);
    const [processing, setProcessing] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [error, setError] = useState<string | null>(null);
 
    // Map display names to backend language codes
    const langMap: Record<string, string> = {
        'English': 'en',
        'Hindi': 'hi',
        'Punjabi': 'pa',
        'Marathi': 'mr',
        'Tamil': 'ta'
    };

    const handleGenerateInsights = async () => {
        setProcessing(true);
        setError(null);
        try {
            const langCode = langMap[selectedLanguage] || 'en';
            
            console.log(`[DEBUG] Requesting summary in ${selectedLanguage} (${langCode})`);
            const data = await reportService.getAISummary(report._id, langCode, true);
            
            const summary = typeof data === 'string' ? data : data.summary;
            const extractedData = typeof data === 'string' ? null : data.extractedData;
            
            setReport(prev => ({ 
                ...prev, 
                aiSummary: summary,
                extractedData: extractedData || prev.extractedData
            }));
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to generate insights. Please check document quality.");
        } finally {
            setProcessing(false);
        }
    };

    // Generate a summary for the voice feature
    const generateSummary = () => {
        if (report.aiSummary) return report.aiSummary;
        return `Report Summary: ${report.reportName}. Test Type: ${report.testType}. No automated summary available yet.`;
    };

    // Determine health status based on extracted data
    const getHealthStatus = () => {
        if (!report.extractedData) return 'normal';
        
        let isAbnormal = false;
        Object.entries(report.extractedData).forEach(([key, value]) => {
            const config = getMetricConfig(key);
            if (config && (typeof value === 'number')) {
                if (value < config.min || value > config.max) isAbnormal = true;
            }
        });

        return isAbnormal ? 'abnormal' : 'normal';
    };

    const healthStatus = getHealthStatus();

    const stripMarkdown = (text: string) => {
        if (!text) return "";
        return text
            .split(/---|Recommendation:/i)[0] // Only show analysis in preview
            .replace(/###/g, '')
            .replace(/\*\*/g, '')
            .replace(/[•\n]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    return (
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-[#E2E8F0] hover:shadow-xl hover:shadow-[#4F6F6F]/5 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F6F7F5] rounded-full -mr-32 -mt-32 opacity-50 group-hover:bg-[#8FB9A8]/10 transition-colors duration-700"></div>

            <div className="relative z-10 flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                    <div className="flex items-start space-x-5">
                        <div className="hidden sm:flex p-5 bg-[#F6F7F5] rounded-[24px] border border-[#E2E8F0] group-hover:border-[#8FB9A8]/50 transition-all duration-500 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F6F6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                                <path d="M8 13h8" /><path d="M8 17h8" /><path d="M10 9H8" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-2xl font-black text-[#1F2933] tracking-tight group-hover:text-[#4F6F6F] transition-colors">{report.reportName}</h3>
                                {report.aiSummary ? (
                                    <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border animate-in fade-in duration-1000 ${healthStatus === 'abnormal' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${healthStatus === 'abnormal' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                        <span>{healthStatus === 'abnormal' ? 'Attention' : 'Healthy'}</span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">Processing</span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#6B7280]">
                                <span className="flex items-center text-[#4F6F6F]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8FB9A8] mr-2"></span>
                                    {report.testType}
                                </span>
                                <span className="w-1 h-1 bg-[#E2E8F0] rounded-full hidden sm:block"></span>
                                <span className="flex items-center">
                                    <svg className="mr-1.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>
                                    {new Date(report.uploadDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </span>
                            </div>

                            {report.aiSummary && (
                                <div className="mt-6 group/summary relative">
                                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#4F6F6F]/10 rounded-full group-hover/summary:bg-[#4F6F6F]/30 transition-colors"></div>
                                    <div className="pl-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4F6F6F] mb-2">{t('clinical_insight')}</h4>
                                        <p className="text-base text-[#1F2933] font-medium leading-relaxed tracking-tight line-clamp-2 italic opacity-80">
                                            {stripMarkdown(report.aiSummary)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!report.aiSummary && (
                                <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="relative w-full sm:w-48">
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="w-full bg-[#F6F7F5] border border-transparent hover:border-[#E2E8F0] px-5 py-3 rounded-[20px] text-xs font-black text-[#4F6F6F] outline-none focus:ring-4 focus:ring-[#4F6F6F]/5 appearance-none cursor-pointer transition-all"
                                        >
                                            <option value="English">English</option>
                                            <option value="Hindi">Hindi (हिंदी)</option>
                                            <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                                            <option value="Marathi">Marathi (मराठी)</option>
                                            <option value="Tamil">Tamil (தமிழ்)</option>
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#4F6F6F]">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGenerateInsights}
                                        disabled={processing}
                                        className={`flex items-center justify-center space-x-3 px-8 py-3.5 rounded-[22px] font-black text-xs uppercase tracking-widest transition-all w-full sm:w-auto shadow-sm active:scale-95 ${
                                            processing 
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                            : 'bg-[#4F6F6F] text-white hover:bg-[#1F2933] hover:shadow-xl hover:shadow-[#4F6F6F]/20'
                                        }`}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                <span>{t('analyzing')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                                                <span>{t('generate')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-center lg:justify-start gap-3 lg:border-l lg:border-[#E2E8F0] lg:pl-8">
                    <VoiceSummaryButton 
                        text={generateSummary()} 
                        lang={langMap[selectedLanguage] || 'en'} 
                        reportId={report._id}
                        disabled={!report.aiSummary}
                    />

                    <Link
                        href={`/dashboard/patient/reports/${report._id}`}
                        className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-[#4F6F6F] text-white px-8 py-3.5 rounded-[22px] font-black text-xs uppercase tracking-widest hover:bg-[#1F2933] shadow-md hover:shadow-xl transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>{t('view') || 'View'}</span>
                    </Link>

                    <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${report.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={report.reportName || 'report.pdf'}
                        className="flex-1 lg:flex-none flex items-center justify-center space-x-2 bg-white text-[#4F6F6F] border-2 border-[#E2E8F0] px-8 py-3.5 rounded-[22px] font-black text-xs uppercase tracking-widest hover:border-[#4F6F6F] hover:bg-[#F6F7F5] transition-all active:scale-95"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>{t('download') || 'Download'}</span>
                    </a>
                    
                    {report.aiSummary && (
                        <button 
                            onClick={handleGenerateInsights}
                            className="p-3 text-[#94A3B8] hover:text-[#4F6F6F] hover:bg-[#F6F7F5] rounded-full transition-all mt-auto hidden lg:flex"
                            title="Regenerate Analysis"
                        >
                            <svg className={processing ? 'animate-spin' : ''} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        </button>
                    )}
                </div>
            </div>
            
            {error && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 animate-in slide-in-from-top-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p className="text-xs font-bold leading-tight">{error}</p>
                </div>
            )}
        </div>
    );
}
