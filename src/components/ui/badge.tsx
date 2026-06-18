import * as React from 'react';

import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning';

const variantClass: Record<BadgeVariant, string> = {
  default: 'border-foreground bg-foreground text-background',
  secondary: 'border-foreground bg-secondary text-secondary-foreground',
  outline: 'border-foreground text-foreground',
  success: 'border-[color:var(--success)] text-[color:var(--success)]',
  destructive: 'border-[color:var(--destructive)] text-[color:var(--destructive)]',
  warning: 'border-[color:var(--warning)] text-[color:var(--warning)]',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center border-2 px-2 py-0.5 font-bold uppercase tracking-wider transition-colors text-[0.6875rem]',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
