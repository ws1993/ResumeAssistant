import * as React from 'react';

import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning';

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground',
  success: 'bg-[color:var(--success)]/10 text-[color:var(--success)]',
  destructive: 'bg-[color:var(--destructive)]/10 text-[color:var(--destructive)]',
  warning: 'bg-[color:var(--warning)]/10 text-[color:var(--warning)]',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
