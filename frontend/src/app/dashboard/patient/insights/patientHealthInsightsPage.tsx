'use client';

import React, { useState, useEffect } from 'react';
import { reportService } from '@/services/reportService';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import HealthInsightCard from '@/components/patient/HealthInsightCard';
import VoiceSummaryButton from '@/components/patient/VoiceSummaryButton';

export default function PatientHealthInsightsPage() {
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await reportService.getPatientReports();
                // Filter reports that have either AI summary or extracted data
                const insightsReports = (Array.isArray(data) ? data : []).filter((r: any) => 
                    (r.aiSummary && r.aiSummary.length > 0) || 
                    (r.extractedData && Object.keys(r.extractedData).length > 0)
                );
                setReports(insightsReports);
            } catch (err) {
                console.error('Failed to fetch reports', err);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            if (user?.id || user?._id) {
                fetchReports();
            } else {
                setLoading(false);
            }
        }
    }, [user, authLoading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-[#8FB9A8] border-t-[#4F6F6F] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-[#1F2933] tracking-tight">{t('healthInsights')}</h1>
                <p className="text-[#6B7280] mt-1 text-lg font-medium tracking-tight">
                    {t('insights_subtitle')}
                </p>
            </div>

            {reports.length > 0 ? (
                <div className="space-y-12">
                    {reports.map((report) => {
                        const voiceText = report.aiSummary || 
                            `${t('reportSummary')}: ${report.reportName}. ${Object.entries(report.extractedData || {}).map(([k, v]) => `${t(k.toLowerCase())} is ${v}`).join('. ')}`;

                        return (
                            <div key={report._id} className="bg-white p-8 rounded-[40px] shadow-sm border border-[#E2E8F0] space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-2 h-full bg-[#8FB9A8] opacity-20 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center space-x-3">
                                            <h2 className="text-2xl font-black text-[#1F2933]">{report.reportName}</h2>
                                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">{t('latest')}</span>
                                        </div>
                                        <p className="text-sm font-bold text-[#4F6F6F] mt-1 italic opacity-80">
                                            {report.testType} • {new Date(report.uploadDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </p>
                                    </div>
                                    <VoiceSummaryButton 
                                        text={voiceText} 
                                        reportId={report._id}
                                    />
                                </div>

                                {report.aiSummary && (
                                    <div className="bg-[#F6F7F5] p-6 rounded-3xl border border-[#E2E8F0] relative">
                                        <div className="absolute top-4 right-6 flex items-center space-x-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[9px] font-black text-[#4F6F6F] uppercase tracking-widest">{t('ai_analysis')}</span>
                                        </div>
                                        <p className="text-[#1F2933] font-medium leading-relaxed pr-20">
                                            {report.aiSummary}
                                        </p>
                                    </div>
                                )}

                                {report.extractedData && Object.keys(report.extractedData).length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                        {Object.entries(report.extractedData).map(([key, value]: [string, any]) => {
                                            // Determine normal ranges if known
                                            let ranges = undefined;
                                            let unit = "";
                                            const k = key.toLowerCase();
                                            if (k.includes('hemoglobin')) { ranges = { min: 13.5, max: 17.5 }; unit = "g/dL"; }
                                            else if (k.includes('cholesterol')) { ranges = { min: 125, max: 200 }; unit = "mg/dL"; }
                                            else if (k.includes('glucose')) { ranges = { min: 70, max: 100 }; unit = "mg/dL"; }
                                            else if (k.includes('wbc')) { ranges = { min: 4000, max: 11000 }; unit = "/mcL"; }

                                            return (
                                                <HealthInsightCard
                                                    key={key}
                                                    label={key.toLowerCase()}
                                                    value={value}
                                                    unit={unit}
                                                    ranges={ranges}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-24 rounded-[50px] border-2 border-dashed border-[#E2E8F0] text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 bg-[#F6F7F5] rounded-full flex items-center justify-center text-[#94A3B8]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </div>
                    <div className="max-w-md">
                        <p className="text-xl font-black text-[#1F2933]">{t('no_insights_found')}</p>
                        <p className="text-[#6B7280] font-medium mt-2">Reports processed by our AI will automatically populate this section with indicators and analysis.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
