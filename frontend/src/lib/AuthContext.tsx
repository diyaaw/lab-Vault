'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: 'patient' | 'doctor' | 'pathology' | 'admin';
    phone?: string;
    age?: number;
    gender?: 'Male' | 'Female' | 'Other';
    bloodGroup?: string;
    address?: string;
    mustChangePassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                const res = await fetch(`${apiUrl}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    const userData = await res.json();
                    // Normalize ID and Role
                    const id = userData.id || userData._id;
                    const role = userData.role === 'admin' ? 'pathology' : userData.role;
                    setUser({ ...userData, id, role });
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            } catch (err) {
                console.error('Session verification failed', err);
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, []);

    const login = (userData: any, token: string) => {
        // Map legacy 'admin' role to 'pathology' and normalize ID
        const id = userData.id || userData._id;
        const role = userData.role === 'admin' ? 'pathology' : userData.role;
        const normalizedUser = { ...userData, id, role };

        localStorage.setItem('user', JSON.stringify(normalizedUser));
        localStorage.setItem('token', token);
        setUser(normalizedUser);

        // Redirect based on security flag or role
        if (userData.mustChangePassword) {
            router.push('/dashboard/change-password');
        } else if (role === 'pathology') {
            router.push('/dashboard/pathology');
        } else if (role === 'doctor') {
            router.push('/dashboard/doctor');
        } else {
            router.push('/dashboard/patient');
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
