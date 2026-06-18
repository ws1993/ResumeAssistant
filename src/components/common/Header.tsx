import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, LayoutDashboard, Settings as SettingsIcon, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { SyncStatusIndicator } from './SyncStatusIndicator';

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
    <header className="sticky top-0 z-40 border-b-[3px] border-foreground bg-background no-print">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-8 px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center bg-[color:var(--destructive)]">
            <FileText className="size-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-black tracking-tight">{t('app.name')}</span>
            <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">
              {t('app.tagline')}
            </span>
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
                  'inline-flex h-8 items-center gap-1.5 border-2 px-3 text-[0.6875rem] font-bold uppercase tracking-wider transition-colors',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-transparent text-muted-foreground hover:border-foreground hover:text-foreground',
                )
              }
            >
              <item.icon className="size-3.5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SyncStatusIndicator />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
