import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, LayoutDashboard, Settings as SettingsIcon, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

interface NavItem {
  to: string;
  labelKey: 'nav.dashboard' | 'nav.editor' | 'nav.tailor' | 'nav.settings';
  icon: React.ComponentType<{ className?: string }>;
}

const items: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/editor', labelKey: 'nav.editor', icon: FileText },
  { to: '/tailor', labelKey: 'nav.tailor', icon: Sparkles },
  { to: '/settings', labelKey: 'nav.settings', icon: SettingsIcon },
];

export function Header(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65 no-print">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-6 px-6">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-foreground text-background">
            <FileText className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">{t('app.name')}</span>
            <span className="text-[10px] text-muted-foreground">{t('app.tagline')}</span>
          </div>
        </NavLink>

        <nav className="ml-4 flex items-center gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )
              }
            >
              <item.icon className="size-3.5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
