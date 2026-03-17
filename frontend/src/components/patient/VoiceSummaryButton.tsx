'use client';

import React from 'react';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { reportService } from '@/services/reportService';

interface VoiceSummaryButtonProps {
    text: string;
    lang?: string;
    reportId?: string;
    disabled?: boolean;
}

export default function VoiceSummaryButton({ text, lang, reportId, disabled }: VoiceSummaryButtonProps) {
    const { language, t } = useLanguage();
    const [fetching, setFetching] = useState(false);

    const speak = async () => {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        let speechText = text;
        const targetLang = lang || language;

        // If target language is not English and we have a reportId, 
        // fetch the translation specifically for audio
        if (targetLang !== 'en' && reportId) {
            setFetching(true);
            try {
                console.log(`[DEBUG] Fetching translation for audio: ${targetLang}`);
                const data = await reportService.getAISummary(reportId, targetLang);
                speechText = typeof data === 'string' ? data : data.summary;
            } catch (err) {
                console.error('[DEBUG] Failed to fetch translation for audio, falling back to original text', err);
            } finally {
                setFetching(false);
            }
        }

        const utterance = new SpeechSynthesisUtterance(speechText);

        // Map language code for speech synthesis
        const langMap: Record<string, string> = {
            en: 'en-US',
            hi: 'hi-IN',
            es: 'es-ES',
            pa: 'pa-IN',
            mr: 'mr-IN',
            ta: 'ta-IN'
        };

        utterance.lang = langMap[targetLang] || 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        window.speechSynthesis.speak(utterance);
    };

    return (
        <button 
            onClick={speak}
            disabled={disabled || fetching}
            className={`flex items-center space-x-2 px-6 py-2 rounded-2xl font-bold text-sm transition-all border outline-none ${
                disabled || fetching
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                : 'bg-[#F6F7F5] text-[#4F6F6F] border-[#E2E8F0] hover:bg-white hover:shadow-md hover:border-[#8FB9A8]'
            }`}
        >
            {fetching ? (
                <div className="w-5 h-5 border-2 border-[#4F6F6F]/30 border-t-[#4F6F6F] rounded-full animate-spin"></div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            )}
            <span>{fetching ? t('analyzing') || 'Analyzing...' : t('listen')}</span>
        </button>
    );
}
