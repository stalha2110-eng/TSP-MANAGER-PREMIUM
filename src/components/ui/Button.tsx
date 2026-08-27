import * as React from "react";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/10 hover:shadow-lg transition-all',
      secondary: 'bg-[var(--secondary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--secondary)]/10 hover:shadow-lg transition-all',
      outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--background)]',
      ghost: 'bg-transparent hover:bg-[var(--background)]',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/10 hover:shadow-lg transition-all',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-semibold',
      md: 'px-4 py-2 text-sm font-semibold',
      lg: 'px-6 py-3 text-base font-bold',
      icon: 'p-2',
    };

    return (
      <motion.button
        ref={ref as any}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 15 }}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variants[variant],
          sizes[size],
          'rounded-[var(--radius)]',
          className
        )}
        {...(props as any)}
      />
    );
  }
);
Button.displayName = "Button";

