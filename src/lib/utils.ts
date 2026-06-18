import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: never[]) => void>(fn: T, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function formatDate(input: string | number | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(input: string | number | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN');
}

export function truncate(text: string, max = 80): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
