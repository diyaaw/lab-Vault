'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { patientService } from '@/services/patientService';

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Registration Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        phone: '', 
        age: '', 
        gender: 'Male' 
    });
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState('');

    const fetchPatients = async (searchQuery: string) => {
        setLoading(true);
        try {
            const data = await patientService.searchPatients(searchQuery);
            setPatients(data);
        } catch (err) {
            console.error('Failed to fetch patients', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPatients(query);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegLoading(true);
        setRegError('');
        try {
            await patientService.registerPatient(formData);
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', age: '', gender: 'Male' });
            fetchPatients(query);
        } catch (err: any) {
            setRegError(err.response?.data?.message || 'Registration failed');
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-[#1F2933]">Patient Directory</h1>
                    <p className="text-[#6B7280] mt-1 text-lg font-medium">Manage and view all registered patients.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
                    Register New Patient
                </button>
            </div>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2933]/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-[#1F2933]">New Patient</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-[#6B7280] hover:text-[#1F2933] transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-4">
                                {regError && (
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100 flex items-center">
                                        <svg className="mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        {regError}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#4F6F6F] ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 rounded-2xl border border-[#E2E8F0] focus:ring-4 focus:ring-[#4F6F6F]/10 outline-none transition-all font-medium"
                                        placeholder="Enter name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#4F6F6F] ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-4 py-3 rounded-2xl border border-[#E2E8F0] focus:ring-4 focus:ring-[#4F6F6F]/10 outline-none transition-all font-medium"
                                        placeholder="pat@example.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#4F6F6F] ml-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-4 py-3 rounded-2xl border border-[#E2E8F0] focus:ring-4 focus:ring-[#4F6F6F]/10 outline-none transition-all font-medium"
                                        placeholder="+1..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#4F6F6F] ml-1">Age</label>
                                        <input 
                                            type="number" 
                                            value={formData.age}
                                            onChange={(e) => setFormData({...formData, age: e.target.value})}
                                            className="w-full px-4 py-3 rounded-2xl border border-[#E2E8F0] focus:ring-4 focus:ring-[#4F6F6F]/10 outline-none transition-all font-medium"
                                            placeholder="eg. 25"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#4F6F6F] ml-1">Gender</label>
                                        <select 
                                            value={formData.gender}
                                            onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                            className="w-full px-4 py-3 rounded-2xl border border-[#E2E8F0] focus:ring-4 focus:ring-[#4F6F6F]/10 outline-none transition-all font-medium bg-white"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={regLoading}
                                    className="w-full btn-primary h-14 mt-4 shadow-lg shadow-[#4F6F6F]/20"
                                >
                                    {regLoading ? 'Registering...' : 'Register Patient'}
                                </button>
                                <p className="text-[10px] text-center text-[#6B7280] font-bold uppercase tracking-widest mt-2">
                                    Credentials will be sent via email automatically.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2E8F0] overflow-hidden">
                <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F6F7F5]/50">
                    <div className="relative w-full max-w-xl">
                        <input
                            type="text"
                            placeholder="Search patients by name, email, or metadata..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#E2E8F0] focus:ring-4 focus:ring-[#4F6F6F]/10 focus:border-[#4F6F6F] outline-none transition-all font-medium"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4F6F6F]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#F6F7F5] text-left">
                                <th className="px-8 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Patient Name</th>
                                <th className="px-8 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Contact Details</th>
                                <th className="px-8 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Demographics</th>
                                <th className="px-8 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-[#8FB9A8] border-t-[#4F6F6F] rounded-full animate-spin"></div>
                                    </td>
                                </tr>
                            ) : patients.map((patient) => (
                                <tr key={patient._id} className="hover:bg-[#F6F7F5] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-bold text-[#1F2933]">{patient.name}</div>
                                        <div className="text-[10px] text-[#6B7280] font-black uppercase">ID: {patient._id.slice(-6)}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-sm text-[#4F6F6F] font-bold">{patient.email}</div>
                                        <div className="text-[10px] text-[#6B7280] font-black">{patient.phone || 'No phone'}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex gap-2">
                                            <span className="bg-[#F6F7F5] text-[#4F6F6F] px-2 py-0.5 rounded-lg text-[10px] font-black border border-[#E2E8F0]">
                                                {patient.age || '??'} Yrs
                                            </span>
                                            <span className="bg-[#F6F7F5] text-[#4F6F6F] px-2 py-0.5 rounded-lg text-[10px] font-black border border-[#E2E8F0]">
                                                {patient.gender || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link 
                                                href={`/dashboard/pathology/upload-report?patientId=${patient._id}&name=${encodeURIComponent(patient.name)}`}
                                                className="bg-[#4F6F6F] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#1F2933] transition-all active:scale-95 shadow-sm flex items-center"
                                            >
                                                <svg className="mr-1.5" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                                                Upload
                                            </Link>
                                            <button className="bg-[#F6F7F5] text-[#4F6F6F] px-4 py-2 rounded-xl text-xs font-black border border-[#E2E8F0] hover:bg-[#4F6F6F] hover:text-white transition-all active:scale-95 shadow-sm">
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && patients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-[#6B7280] font-medium">
                                        No patients found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
