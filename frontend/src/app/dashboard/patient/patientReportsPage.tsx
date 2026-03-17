'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import PatientReportCard from '@/components/patient/PatientReportCard';

// Comprehensive Mock Data
const mockReports = [
    {
        _id: "1",
        reportName: "Complete Blood Count",
        testType: "Blood Test",
        pathologyLab: "City Pathology Lab",
        uploadDate: "2026-02-10",
        fileUrl: "/api/placeholder/pdf",
        status: "Normal"
    },
    {
        _id: "2",
        reportName: "Lipid Profile",
        testType: "Blood Test",
        pathologyLab: "Wellness Diagnostics",
        uploadDate: "2026-02-15",
        fileUrl: "/api/placeholder/pdf",
        status: "High"
    },
    {
        _id: "3",
        reportName: "Thyroid Profile",
        testType: "Hormone Test",
        pathologyLab: "City Pathology Lab",
        uploadDate: "2026-02-18",
        fileUrl: "/api/placeholder/pdf",
        status: "Normal",
    },
    {
        _id: "4",
        reportName: "Vitamin D Test",
        testType: "Blood Test",
        pathologyLab: "City Pathology Lab",
        uploadDate: "2026-03-01",
        fileUrl: "/api/placeholder/pdf",
        status: "Low",
    }
];

export default function PatientReportsPage() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    const filteredReports = mockReports.filter(report => {
        const matchesSearch = report.reportName.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || report.testType === filter;
        return matchesSearch && matchesFilter;
    });

    const testTypes = ['All', ...new Set(mockReports.map(r => r.testType))];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#1F2933] tracking-tight">{t('reports')}</h1>
                    <p className="text-[#6B7280] mt-1 text-lg font-medium tracking-tight">Access all your laboratory history in one place.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-[#6B7280] uppercase tracking-widest bg-[#E2E8F0] px-3 py-1.5 rounded-lg">TOTAL: {mockReports.length}</span>
                </div>
            </div>

            {/* toolbar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                        type="text"
                        placeholder="Search by report name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#F6F7F5] border-transparent focus:bg-white focus:border-[#8FB9A8] rounded-2xl outline-none transition-all font-bold text-sm text-[#1F2933]"
                    />
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <label className="text-xs font-black text-[#6B7280] uppercase tracking-widest hidden lg:block">Filter:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="flex-1 md:flex-none border-none bg-[#F6F7F5] px-6 py-3 rounded-2xl font-bold text-sm text-[#4F6F6F] outline-none focus:ring-2 focus:ring-[#8FB9A8] transition-all"
                    >
                        {testTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredReports.map(report => (
                    <PatientReportCard key={report._id} report={report} />
                ))}
                {filteredReports.length === 0 && (
                    <div className="bg-white p-20 rounded-[40px] border border-dashed border-[#E2E8F0] text-center">
                        <div className="w-20 h-20 bg-[#F6F7F5] rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-[#1F2933]">No matching reports found</h3>
                        <p className="text-[#6B7280] font-bold mt-1">Try adjusting your search or filter keywords.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
