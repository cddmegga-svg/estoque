import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchCurrentTenant } from '@/services/api';

// Helper to convert hex to HSL for Tailwind
// Tailwind variable format: "H S% L%" (no commas, no hsl() function wrapper)
const hexToHsl = (hex: string) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    r /= 255;
    g /= 255;
    b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h! /= 6;
    }

    // Return space separated values without deg/percent signs if possible, 
    // but Tailwind usually handles "123 50% 50%" fine.
    // Standard Tailwind CSS variable format often omits commas.
    return `${Math.round(h! * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const ThemeManager = () => {
    const { user } = useAuth();

    useEffect(() => {
        const resetTheme = () => {
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--ring');
            // Remove other potential modifications
        };

        if (user) {
            fetchCurrentTenant().then(tenant => {
                if (tenant && tenant.primary_color) {
                    const hsl = hexToHsl(tenant.primary_color);
                    if (hsl) {
                        document.documentElement.style.setProperty('--primary', hsl);
                        document.documentElement.style.setProperty('--ring', hsl);
                    } else {
                        resetTheme();
                    }
                } else {
                    resetTheme(); // No custom color = default theme
                }
            }).catch(err => {
                console.error("Theme Load Error:", err);
                resetTheme();
            });
        } else {
            resetTheme();
        }
    }, [user]);

    return null;
};
