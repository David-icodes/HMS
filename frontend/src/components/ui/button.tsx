import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand-700 text-white shadow-md shadow-brand-700/20 hover:bg-brand-800',
        gradient:
          'bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-lg shadow-brand-700/25 hover:from-brand-800 hover:to-brand-700',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-brand-100',
        outline: 'border border-brand-200 bg-white text-brand-700 hover:border-brand-700 hover:bg-brand-50',
        ghost: 'text-brand-700 hover:bg-brand-50',
        destructive: 'bg-destructive text-white hover:bg-red-600',
        success: 'bg-med-600 text-white hover:bg-med-700',
        white: 'bg-white text-brand-800 shadow-md hover:bg-brand-50',
        link: 'text-brand-700 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-3.5 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
