import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  title?: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastState {
  items: ToastItem[];
  push: (item: Omit<ToastItem, 'id'>) => number;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (item) => {
    const id = ++counter;
    const full: ToastItem = { id, ...item };
    set((s) => ({ items: [...s.items, full] }));
    if (item.durationMs > 0) {
      setTimeout(() => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      }, item.durationMs);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export function toast(
  opts: { title?: string; description?: string; variant?: ToastVariant; durationMs?: number },
): number {
  return useToastStore.getState().push({
    title: opts.title,
    description: opts.description,
    variant: opts.variant ?? 'default',
    durationMs: opts.durationMs ?? 3500,
  });
}
