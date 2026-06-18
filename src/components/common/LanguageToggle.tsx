import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { setLocale, type Locale } from '@/lib/i18n';

export function LanguageToggle(): React.JSX.Element {
  const { i18n } = useTranslation();
  const current = (i18n.language || 'zh-CN') as Locale;
  const next: Locale = current.startsWith('zh') ? 'en' : 'zh-CN';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(next)}
      aria-label="切换语言"
      className="gap-1.5"
    >
      <Languages className="size-4" />
      <span className="text-xs font-medium">{current.startsWith('zh') ? '中文' : 'EN'}</span>
    </Button>
  );
}
