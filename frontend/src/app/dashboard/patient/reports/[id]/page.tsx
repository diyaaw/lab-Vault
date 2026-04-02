'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import HealthInsightCard from '@/components/patient/HealthInsightCard';
import VoiceSummaryButton from '@/components/patient/VoiceSummaryButton';
import { reportService } from '@/services/reportService';
import { Report } from '@/types';

export default function PatientReportViewerPage() {
    const { id } = useParams();
    const router = useRouter();
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState('English');

    // Map display names to backend language codes
    const langMap: Record<string, string> = {
        'English': 'en',
        'Hindi': 'hi',
        'Punjabi': 'pa',
        'Marathi': 'mr',
        'Tamil': 'ta'
    };

    useEffect(() => {
        const fetchReport = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await reportService.getReportById(id as string);
                setReport(data);
            } catch (err: any) {
                console.error('Failed to fetch report:', err);
                setError(err.response?.data?.message || 'Failed to load report details.');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    const handleRegenerate = async () => {
        if (!id) return;
        try {
            setIsRegenerating(true);
            const langCode = langMap[selectedLanguage] || 'en';
            // Trigger backend re-scan with force=true
            await reportService.getAISummary(id as string, langCode, true);
            // Re-fetch report data to see updated extractedData
            const data = await reportService.getReportById(id as string);
            setReport(data);
        } catch (err) {
            console.error('Regeneration failed:', err);
        } finally {
            setIsRegenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-[#8FB9A8] border-t-[#4F6F6F] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="text-center p-20 bg-white rounded-[40px] shadow-sm border border-[#E2E8F0]">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h3 className="text-xl font-black text-[#1F2933] mb-2">{error || 'Report not found'}</h3>
                <p className="text-[#6B7280] font-medium mb-8">We couldn't retrieve the requested laboratory report.</p>
                <button onClick={() => router.back()} className="btn-primary px-8 py-3 bg-[#4F6F6F] text-white rounded-2xl font-black text-xs uppercase tracking-widest">Go Back</button>
            </div>
        );
    }

    const isPdf = report.fileUrl.toLowerCase().endsWith('.pdf');
    const fullFileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${report.fileUrl}`;

    // Map extractedData (Record<string, number>) to HealthInsightCard format
    const insights = Object.entries(report.extractedData || {}).map(([label, value]) => {
        const norms: Record<string, { min: number, max: number, unit: string }> = {
            'Hemoglobin': { min: 13.5, max: 17.5, unit: 'g/dL' },
            'WBC': { min: 4000, max: 11000, unit: 'cells/mcL' },
            'RBC': { min: 4.5, max: 5.9, unit: 'million/uL' },
            'Platelets': { min: 150000, max: 450000, unit: '/uL' },
            'Hematocrit': { min: 40, max: 50, unit: '%' },
            'Glucose': { min: 70, max: 100, unit: 'mg/dL' },
            'Cholesterol': { min: 125, max: 200, unit: 'mg/dL' },
            'Sodium': { min: 136, max: 145, unit: 'mEq/L' },
            'Potassium': { min: 3.5, max: 5.2, unit: 'mEq/L' },
            'Chloride': { min: 96, max: 108, unit: 'mEq/L' },
            'Calcium': { min: 8.5, max: 10.5, unit: 'mg/dl' },
            'Creatinine': { min: 0.70, max: 1.40, unit: 'mg/dl' },
            'Urea': { min: 4, max: 40, unit: 'mg/dl' },
            'Uric Acid': { min: 2.7, max: 7.0, unit: 'mg/dl' }
        };
        const norm = norms[label] || norms[Object.keys(norms).find(k => k.toLowerCase() === label.toLowerCase()) || ''] || { min: 0, max: 1000, unit: '' };
        return {
            label: label.toLowerCase(),
            value: value as number,
            unit: norm.unit,
            ranges: { min: norm.min, max: norm.max }
        };
    });

    const pathologyName = typeof report.pathologyId === 'object' ? report.pathologyId?.name : 'Diagnostic Lab';

    return (
        <div className="space-y-8 pb-12 h-full flex flex-col animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-xl transition-colors text-[#4F6F6F]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <h1 className="text-2xl font-black text-[#1F2933] tracking-tight">{report.reportName}</h1>
                    </div>
                    <p className="text-[#6B7280] text-sm font-bold uppercase tracking-widest flex items-center">
                        <span className="w-2 h-2 bg-[#8FB9A8] rounded-full mr-2"></span>
                        {pathologyName} • {new Date(report.uploadDate).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-40">
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full bg-white border border-[#E2E8F0] px-4 py-2.5 rounded-xl text-xs font-bold text-[#4F6F6F] outline-none focus:ring-4 focus:ring-[#4F6F6F]/10 appearance-none cursor-pointer"
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

                    <VoiceSummaryButton 
                        text={report.aiSummary || `Health summary for your ${report.reportName}.`} 
                        lang={langMap[selectedLanguage] || 'en'}
                        reportId={report._id}
                    />
                    <button 
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className="bg-[#F6F7F5] text-[#4F6F6F] border border-[#E2E8F0] px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-white hover:shadow-md transition-all flex items-center space-x-2"
                    >
                        {isRegenerating ? (
                            <div className="w-4 h-4 border-2 border-[#4F6F6F]/30 border-t-[#4F6F6F] rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        )}
                        <span>{isRegenerating ? 'Scanning...' : 'Regenerate'}</span>
                    </button>
                    <a 
                        href={fullFileUrl} 
                        download 
                        className="bg-[#4F6F6F] text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#1F2933] transition-all"
                    >
                        Download {isPdf ? 'PDF' : 'Report'}
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-[600px]">
                {/* Left: Report Preview */}
                <div className="lg:col-span-12 xl:col-span-8 bg-white rounded-[40px] shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
                    <div className="p-4 bg-[#F6F7F5] border-b border-[#E2E8F0] flex justify-between items-center">
                        <span className="text-xs font-black text-[#6B7280] uppercase tracking-widest">
                            {isPdf ? 'Digital PDF Document' : 'Report Image View'}
                        </span>
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        </div>
                    </div>
                    <div className="flex-1 bg-[#DEE2E6] overflow-auto flex items-center justify-center p-4">
                        {isPdf ? (
                            <iframe 
                                src={`${fullFileUrl}#toolbar=0`} 
                                className="w-full h-full min-h-[600px] border-0 rounded-lg shadow-2xl"
                                title="Report PDF"
                            />
                        ) : (
                            <div className="relative group max-w-full">
                                <img 
                                    src={fullFileUrl} 
                                    alt={report.reportName} 
                                    className="max-w-full rounded-lg shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-lg"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Insights & AI Summary */}
                <div className="lg:col-span-12 xl:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-[#E2E8F0]">
                        <h3 className="text-xl font-black text-[#1F2933] mb-6 flex items-center space-x-2 text-[#4F6F6F]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                            <span>AI Health Analysis</span>
                        </h3>

                        <div className="space-y-4">
                            {insights.length > 0 ? (
                                insights.map((insight, idx) => (
                                    <HealthInsightCard
                                        key={idx}
                                        label={insight.label}
                                        value={insight.value}
                                        unit={insight.unit}
                                        ranges={insight.ranges}
                                    />
                                ))
                            ) : (
                                <div className="p-6 bg-[#F6F7F5] rounded-3xl border border-dashed border-[#E2E8F0] text-center">
                                    <p className="text-sm font-bold text-[#6B7280]">Processing for AI insights...</p>
                                </div>
                            )}
                        </div>
                    </div>



                    {report.doctorComment && (
                        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-[#E2E8F0] animate-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-[#F6F7F5] rounded-full flex items-center justify-center border border-[#E2E8F0]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F6F6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                </div>
                                <h3 className="text-lg font-black text-[#1F2933] tracking-tight">Clinical Review</h3>
                            </div>
                            <div className="bg-[#F6F7F5] p-6 rounded-3xl border border-[#E2E8F0]">
                                <p className="text-sm italic font-medium leading-relaxed text-[#4F6F6F]">
                                    "{report.doctorComment}"
                                </p>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Pathology Verified</span>
                                    <span className="text-[10px] font-bold text-[#94A3B8]">{new Date(report.uploadDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
