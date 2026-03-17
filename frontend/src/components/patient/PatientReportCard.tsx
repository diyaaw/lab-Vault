'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import VoiceSummaryButton from './VoiceSummaryButton';
import { reportService } from '@/services/reportService';
import Link from 'next/link';

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
        
        const norms: Record<string, { min: number, max: number }> = {
            'Hemoglobin': { min: 13.5, max: 17.5 },
            'WBC': { min: 4000, max: 11000 },
            'RBC': { min: 4.5, max: 5.9 },
            'Platelets': { min: 150000, max: 450000 },
            'Hematocrit': { min: 40, max: 50 },
            'Glucose': { min: 70, max: 100 },
            'Cholesterol': { min: 125, max: 200 }
        };

        let isAbnormal = false;
        Object.entries(report.extractedData).forEach(([key, value]) => {
            const norm = norms[key];
            if (norm && (typeof value === 'number')) {
                if (value < norm.min || value > norm.max) isAbnormal = true;
            }
        });

        return isAbnormal ? 'abnormal' : 'normal';
    };

    const healthStatus = getHealthStatus();

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-md transition-all group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="p-4 bg-[#F6F7F5] rounded-2xl border border-[#E2E8F0] group-hover:bg-[#8FB9A8]/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F6F6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-black text-[#1F2933]">{report.reportName}</h3>
                            {report.aiSummary ? (
                                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${healthStatus === 'abnormal' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} title={healthStatus === 'abnormal' ? "Clinical Attention Required" : "Values in Range"}></div>
                            ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" title="Processing pending"></div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <span className="text-sm font-bold text-[#4F6F6F] flex items-center">
                                <span className="w-2 h-2 rounded-full bg-[#8FB9A8] mr-2"></span>
                                {report.testType}
                            </span>
                            <span className="text-sm font-medium text-[#6B7280]">
                                {new Date(report.uploadDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                            </span>
                            {report.aiSummary && (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-tighter">AI Ready</span>
                            )}
                        </div>
                        {report.aiSummary && (
                            <p className="mt-3 text-sm text-[#4F6F6F] font-medium bg-[#F6F7F5] p-3 rounded-xl border border-[#E2E8F0] leading-relaxed italic">
                                "{report.aiSummary}"
                            </p>
                        )}

                        <div className="mt-4 flex flex-col items-start gap-4">
                            {!report.aiSummary && (
                                <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                    </svg>
                                    <span className="text-[11px] font-black uppercase tracking-wider">AI Analysis Pending processing</span>
                                </div>
                            )}
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                <div className="relative w-full sm:w-48">
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        className="w-full bg-white border border-[#E2E8F0] px-4 py-2.5 rounded-2xl text-xs font-bold text-[#4F6F6F] outline-none focus:ring-4 focus:ring-[#4F6F6F]/10 appearance-none cursor-pointer"
                                    >
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi (हिंदी)</option>
                                        <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                                        <option value="Marathi">Marathi (मराठी)</option>
                                        <option value="Tamil">Tamil (தமிழ்)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#4F6F6F]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleGenerateInsights}
                                    disabled={processing}
                                    className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all w-full sm:w-auto ${
                                        processing 
                                        ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed' 
                                        : 'bg-[#4F6F6F] text-white hover:bg-[#1F2933] shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                                    }`}
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                                            <span>{report.aiSummary ? 'Regenerate Insight' : 'Generate Insight'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            {error && <p className="text-[10px] font-bold text-rose-500 italic mt-1">{error}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <VoiceSummaryButton 
                        text={generateSummary()} 
                        lang={langMap[selectedLanguage] || 'en'} 
                        reportId={report._id}
                    />

                    <Link
                        href={`/dashboard/patient/reports/${report._id}`}
                        className="bg-[#4F6F6F] text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#1F2933] transition-all"
                    >
                        View
                    </Link>

                    <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${report.fileUrl}`}
                        download
                        className="bg-white text-[#4F6F6F] border border-[#E2E8F0] px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#F6F7F5] transition-all"
                    >
                        Download
                    </a>
                </div>
            </div>
        </div>
    );
}
