import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const formatCNPJ = (cnpj: string): string => {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

export const getMonthsDifference = (date1: Date, date2: Date): number => {
  const months = (date2.getFullYear() - date1.getFullYear()) * 12;
  return months + date2.getMonth() - date1.getMonth();
};

export const isExpiringSoon = (expirationDate: string, monthsThreshold: number = 6): boolean => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  const monthsDiff = getMonthsDifference(today, expDate);
  return monthsDiff <= monthsThreshold && monthsDiff >= 0;
};

export const isExpired = (expirationDate: string): boolean => {
  const today = new Date();
  const expDate = new Date(expirationDate);
  return expDate < today;
};

export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
