'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SharedReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSharedReports = async () => {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                const res = await axios.get(`${apiUrl}/api/doctor/reports`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setReports(res.data);
            } catch (err) {
                console.error('Failed to fetch shared reports', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSharedReports();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-[#1F2933]">Shared Reports</h1>
                <p className="text-[#6B7280] mt-1 text-lg font-medium">Review pathology reports shared by laboratories for your patients.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-[#E2E8F0] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#F6F7F5]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">Patient</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">Report Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-[#6B7280] uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-[#4F6F6F]">Loading reports...</td></tr>
                            ) : reports.map((report) => (
                                <tr key={report._id} className="hover:bg-[#F6F7F5] transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-[#1F2933]">{report.patientId?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-sm text-[#4F6F6F]">{report.reportName}</td>
                                    <td className="px-6 py-4 text-sm text-[#6B7280]">{new Date(report.uploadDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${report.fileUrl}`} target="_blank" className="btn-secondary py-2 px-4 text-xs font-bold">View Report</a>
                                    </td>
                                </tr>
                            ))}
                            {!loading && reports.length === 0 && (
                                <tr><td colSpan={4} className="p-12 text-center text-[#6B7280] font-medium">No shared reports found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
