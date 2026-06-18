import * as React from 'react';

import { cn } from '@/lib/utils';

export const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation={orientation}
    className={cn(
      'shrink-0 bg-foreground',
      orientation === 'horizontal' ? 'h-0.5 w-full' : 'w-0.5 h-full',
      className,
    )}
    {...props}
  />
));
Separator.displayName = 'Separator';
