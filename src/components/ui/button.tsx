import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Base classes
    const base =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

    // Size variants
    const sizeClasses = {
      xs: "text-[11px] px-2.5 py-1 gap-1.5",
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-xs font-semibold px-4 py-2 gap-2",
      lg: "text-sm font-bold px-5 py-2.5 gap-2.5"
    }[size];

    // Style variants: Dark Navy + Indigo + Sky/Cyan accents
    const variantClasses = {
      primary:
        "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/40 border border-indigo-500/40 hover:border-indigo-400 active:bg-indigo-700",
      secondary:
        "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 active:bg-slate-800",
      outline:
        "bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/70 hover:border-slate-500",
      ghost:
        "bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent",
      danger:
        "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50",
      subtle:
        "bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 hover:border-indigo-700"
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${base} ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
