'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/lib/AuthContext';

export default function DoctorDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-[#1F2933]">Doctor Portal</h1>
                <p className="text-[#6B7280] mt-1 text-lg font-medium">Welcome, Dr. {user?.name}. Manage your patients and lab results.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-lg font-bold text-[#1F2933] mb-2">Patient Records</h3>
                    <p className="text-[#6B7280] mb-4">Access detailed medical history and reports for your patients.</p>
                    <Link href="/dashboard/doctor/patients" className="text-[#4F6F6F] font-bold hover:underline">Manage Patients →</Link>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                    <h3 className="text-lg font-bold text-[#1F2933] mb-2">Recent Lab Results</h3>
                    <p className="text-[#6B7280] mb-4">Review shared pathology reports from connected labs.</p>
                    <Link href="/dashboard/doctor/shared-reports" className="text-[#4F6F6F] font-bold hover:underline">Review Results →</Link>
                </div>
            </div>
        </div>
    );
}
