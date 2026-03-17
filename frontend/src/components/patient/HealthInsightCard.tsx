'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface HealthInsightCardProps {
    label: string; // e.g., 'hemoglobin', 'cholesterol', 'glucose'
    value: number;
    unit: string;
    ranges?: {
        min: number;
        max: number;
    };
}

export default function HealthInsightCard({ label, value, unit, ranges }: HealthInsightCardProps) {
    const { t } = useLanguage();

    let status: 'normal' | 'high' | 'low' = 'normal';
    let statusText = t('healthyRange');
    let colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    let barColor = 'bg-emerald-500';

    if (ranges) {
        if (value > ranges.max) {
            status = 'high';
            statusText = t('consultDoctor');
            colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
            barColor = 'bg-rose-500';
        } else if (value < ranges.min) {
            status = 'low';
            statusText = t('belowNormal');
            colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
            barColor = 'bg-rose-500';
        }
    } else {
        statusText = "Clinic verified value.";
    }

    // Calculate percentage for a small progress bar
    const progress = ranges ? Math.min(Math.max(((value - (ranges.min * 0.5)) / (ranges.max * 1.5 - (ranges.min * 0.5))) * 100, 5), 95) : 50;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">{t(label)}</h4>
                    <p className="text-2xl font-black text-[#1F2933] mt-1">
                        {value} <span className="text-xs text-[#6B7280] font-bold">{unit}</span>
                    </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border ${colorClass}`}>
                    {t(status)}
                </span>
            </div>

            <div className="h-2 bg-[#F6F7F5] rounded-full overflow-hidden mb-4 border border-[#E2E8F0]/50">
                <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
            </div>

            <p className={`text-xs font-bold leading-relaxed ${status === 'normal' ? 'text-[#4F6F6F]' : 'text-rose-700'}`}>
                {statusText}
            </p>
        </div>
    );
}
