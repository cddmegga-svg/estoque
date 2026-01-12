import React from 'react';
import { Input } from '@/components/ui/input';

interface MoneyInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
    id?: string;
}

export const MoneyInput = ({ value, onChange, className, placeholder, id }: MoneyInputProps) => {
    // Format numeric value to display string (e.g. 12.34 -> "R$ 12,34")
    const formatDisplay = (val: number) => {
        if (val === 0) return '';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(val);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Get only digits
        const digits = e.target.value.replace(/\D/g, '');

        // If empty, set to 0
        if (!digits) {
            onChange(0);
            return;
        }

        // Convert to float (divide by 100)
        const floatValue = Number(digits) / 100;
        onChange(floatValue);
    };

    return (
        <Input
            id={id}
            type="text"
            inputMode="numeric"
            value={value ? formatDisplay(value) : ''}
            onChange={handleChange}
            className={className}
            placeholder={placeholder || "R$ 0,00"}
        />
    );
};
