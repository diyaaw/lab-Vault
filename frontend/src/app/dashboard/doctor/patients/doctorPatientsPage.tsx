'use client';

import { useState, useEffect } from 'react';
import { patientService } from '@/services/patientService';
import { Patient } from '@/types';

export default function DoctorPatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await patientService.getDoctorPatients();
                setPatients(data);
            } catch (err) {
                console.error('Failed to fetch patients', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-[#1F2933]">Assigned Patients</h1>
                <p className="text-[#6B7280] mt-1 text-lg font-medium">Manage patients medical history and shared reports.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-[#4F6F6F] font-bold">Loading patients...</p>
                ) : patients.map((p) => (
                    <div key={p._id} className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow group">
                        <div className="w-12 h-12 bg-[#F6F7F5] text-[#4F6F6F] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#4F6F6F] group-hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-[#1F2933]">{p.name}</h3>
                        <p className="text-[#6B7280] text-sm font-medium mb-6">{p.email}</p>
                        <button className="w-full btn-secondary font-black py-3 rounded-xl">View Records</button>
                    </div>
                ))}
                {!loading && patients.length === 0 && (
                    <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dashed border-[#E2E8F0]">
                        <p className="text-[#6B7280] font-bold">No patients assigned to you yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
