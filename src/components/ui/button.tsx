import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 font-semibold uppercase tracking-wider transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background border-foreground hover:bg-[color:var(--destructive)] hover:border-[color:var(--destructive)]',
        destructive:
          'bg-[color:var(--destructive)] text-white border-[color:var(--destructive)] hover:opacity-90',
        outline:
          'bg-background text-foreground border-foreground hover:bg-foreground hover:text-background',
        secondary: 'bg-secondary text-secondary-foreground border-secondary-foreground hover:bg-foreground hover:text-background',
        ghost: 'border-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'border-transparent text-foreground underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 text-[0.8125rem]',
        sm: 'h-7 px-3 text-[0.6875rem]',
        lg: 'h-10 px-6 text-[0.8125rem]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
