'use client';

import { useState, useEffect } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { AnalyticsData } from '@/types';

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const analyticsData = await analyticsService.getAnalytics();
                setData(analyticsData);
            } catch (err: any) {
                console.error('Failed to fetch analytics', err);
                setError('Failed to load analytics data.');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-[#8FB9A8] border-t-[#4F6F6F] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 text-red-700 rounded-3xl border border-red-100">
                <h2 className="text-xl font-bold mb-2">Error Loading Analytics</h2>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-extrabold text-[#1F2933]">Lab Analytics</h1>
                <p className="text-[#6B7280] mt-1 text-lg font-medium">Performance insights and laboratory growth metrics.</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-xs font-bold uppercase tracking-widest mb-1">Total Reports</h3>
                    <p className="text-3xl font-black text-[#1F2933]">{data?.totalReports ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-xs font-bold uppercase tracking-widest mb-1">Total Patients</h3>
                    <p className="text-3xl font-black text-[#1F2933]">{data?.totalPatients ?? 0}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-xs font-bold uppercase tracking-widest mb-1">Growth Rate</h3>
                    <p className={`text-3xl font-black ${(data?.patientGrowthRate ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {(data?.patientGrowthRate ?? 0) >= 0 ? '+' : ''}{data?.patientGrowthRate ?? 0}%
                    </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-xs font-bold uppercase tracking-widest mb-1">Efficiency</h3>
                    <p className="text-3xl font-black text-[#4F6F6F]">{data?.efficiencyRate ?? 0}%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-sm font-bold uppercase tracking-widest mb-6">Weekly Report Volume</h3>
                    <div className="h-48 flex items-end justify-between space-x-2">
                        {(data?.weeklyVolume || [0, 0, 0, 0, 0, 0, 0]).map((count: number, i: number) => {
                            const max = Math.max(...(data?.weeklyVolume || [1]), 1);
                            const height = (count / max) * 100;
                            return (
                                <div key={i} className="w-full bg-[#8FB9A8]/20 rounded-t-lg relative group transition-all hover:bg-[#4F6F6F]/40 cursor-pointer" style={{ height: `${Math.max(height, 5)}%` }}>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1F2933] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {count} Reports
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-[#6B7280] font-bold">
                        {['6D AGO', '5D', '4D', '3D', '2D', 'YEST', 'TODAY'].map(day => <span key={day}>{day}</span>)}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-sm font-bold uppercase tracking-widest mb-6">Patient Growth</h3>
                    <div className="relative h-48 flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 100 40">
                            <path d="M0,35 Q20,30 40,25 T80,10 T100,5" fill="none" stroke="#4F6F6F" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="40" cy="25" r="2" fill="#8FB9A8" stroke="#FFFFFF" strokeWidth="1" />
                            <circle cx="80" cy="10" r="2" fill="#8FB9A8" stroke="#FFFFFF" strokeWidth="1" />
                        </svg>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <p className="text-4xl font-extrabold text-[#1F2933]">
                                {(data?.patientGrowthRate ?? 0) >= 0 ? '+' : ''}{data?.patientGrowthRate ?? 0}%
                            </p>
                            <p className="text-[10px] text-[#4F6F6F] font-bold text-center uppercase">Monthly Increase</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0] h-full flex flex-col">
                    <h3 className="text-[#6B7280] text-sm font-bold uppercase tracking-widest mb-6">Top Test Types</h3>
                    <div className="space-y-4 flex-grow">
                        {(data?.testTypes || []).map((test: any, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-[#1F2933]">{test.name}</span>
                                    <span className="text-[#4F6F6F]">{test.count}</span>
                                </div>
                                <div className="h-2 w-full bg-[#F6F7F5] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#8FB9A8] transition-all duration-1000" 
                                        style={{ width: `${(test.count / (data?.totalReports || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {(!data?.testTypes || data.testTypes.length === 0) && (
                            <p className="text-center text-[#6B7280] font-medium py-10">No test data available.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-[#6B7280] text-sm font-bold uppercase tracking-widest mb-6">Efficiency Rate</h3>
                    <div className="flex items-center justify-center pt-4">
                        <div className="relative w-32 h-32 rounded-full border-[10px] border-[#E2E8F0] flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
                                <circle
                                    cx="16" cy="16" r="14"
                                    fill="transparent"
                                    stroke="#8FB9A8"
                                    strokeWidth="2.5"
                                    strokeDasharray={`${(data?.efficiencyRate || 0) * 0.88} 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="text-3xl font-black text-[#1F2933]">{data?.efficiencyRate || 0}%</span>
                        </div>
                    </div>
                    <p className="text-center mt-6 text-sm font-bold text-[#4F6F6F]">Average Report Turnaround</p>
                </div>
            </div>

            <div className="bg-[#1F2933] rounded-3xl p-10 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-[#4F6F6F]/10 rounded-full -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Detailed Monthly Audit</h2>
                        <p className="text-[#8FB9A8] font-medium">Download the clinical performance report for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.</p>
                    </div>
                    <button className="bg-[#8FB9A8] text-[#1F2933] px-8 py-3 rounded-xl font-bold hover:bg-white transition-all shadow-lg inline-flex items-center justify-center">
                        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        Download Report
                    </button>
                </div>
            </div>
        </div>
    );
}

