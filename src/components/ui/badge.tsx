import * as React from 'react';

import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning';

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground',
  success: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',
  destructive: 'bg-[color:var(--destructive)]/15 text-[color:var(--destructive)]',
  warning: 'bg-[color:var(--warning)]/20 text-[color:var(--warning)]',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
