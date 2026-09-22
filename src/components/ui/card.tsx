import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "interactive" | "highlight";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const base = "rounded-xl border transition-all duration-200";

    const paddingClasses = {
      none: "",
      sm: "p-3",
      md: "p-4 sm:p-5",
      lg: "p-6"
    }[padding];

    const variantClasses = {
      default:
        "bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm",
      subtle:
        "bg-slate-950/70 border-slate-800/80 text-slate-200",
      interactive:
        "bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/95 cursor-pointer shadow-sm hover:shadow-md",
      highlight:
        "bg-slate-900/90 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-md shadow-indigo-950/30"
    }[variant];

    return (
      <div
        ref={ref}
        className={`${base} ${paddingClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <h3 className={`text-sm font-bold text-white tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`text-xs text-slate-400 mt-0.5 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);
