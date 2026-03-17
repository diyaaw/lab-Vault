export interface ClinicalRange {
    min: number;
    max: number;
    unit: string;
}

export const CLINICAL_METRICS: Record<string, ClinicalRange> = {
    hemoglobin: { min: 13.5, max: 17.5, unit: "g/dL" },
    wbc: { min: 4000, max: 11000, unit: "/mcL" },
    rbc: { min: 4.5, max: 5.9, unit: "mil/mcL" },
    platelets: { min: 150000, max: 450000, unit: "/mcL" },
    hematocrit: { min: 40, max: 50, unit: "%" },
    glucose: { min: 70, max: 100, unit: "mg/dL" },
    cholesterol: { min: 125, max: 200, unit: "mg/dL" },
    sodium: { min: 136, max: 145, unit: "mEq/L" },
    potassium: { min: 3.5, max: 5.2, unit: "mEq/L" },
    chloride: { min: 96, max: 108, unit: "mEq/L" },
    calcium: { min: 8.5, max: 10.5, unit: "mg/dL" },
    creatinine: { min: 0.7, max: 1.4, unit: "mg/dL" },
    urea: { min: 4, max: 40, unit: "mg/dL" },
    'uric acid': { min: 2.7, max: 7.0, unit: "mg/dL" }
};

export const getMetricConfig = (key: string) => {
    const k = key.toLowerCase();
    for (const [metric, config] of Object.entries(CLINICAL_METRICS)) {
        if (k.includes(metric)) return config;
    }
    return null;
};
