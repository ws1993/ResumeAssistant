import { useEffect } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { applyTheme, useThemeStore, type ThemeMode } from '@/stores/themeStore';

const order: ThemeMode[] = ['system', 'light', 'dark'];

export function ThemeToggle(): React.JSX.Element {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const next = (): void => {
    const idx = order.indexOf(mode);
    setMode(order[(idx + 1) % order.length]);
  };

  const icon = mode === 'system' ? Monitor : mode === 'dark' ? Moon : Sun;
  const Icon = icon;

  return (
    <Button variant="ghost" size="icon" aria-label="切换主题" onClick={next}>
      <Icon className="size-4" />
    </Button>
  );
}
