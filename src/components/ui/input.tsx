import * as React from 'react';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition focus-visible:border-[rgb(66,139,249)] focus-visible:ring-ring/50 focus-visible:ring-[rgb(66,139,249)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default: '',
        // destructive:
        //   'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        // success:
        //   'bg-success text-white shadow-xs hover:bg-success/90 focus-visible:ring-success/20 dark:focus-visible:ring-success/40 dark:bg-success/60',
        // outline:
        //   'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        // secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        // ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        // link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: '',
        xs: 'h-5 rounded text-[11px] gap-1.5 px-2 has-[>svg]:px-2.5',
        // sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        // lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        // icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Input({
  className,
  type,
  variant,
  size,
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>) {
  return <input type={type} data-slot="input" className={cn(inputVariants({ variant, size, className }))} {...props} />;
}

export { Input };
