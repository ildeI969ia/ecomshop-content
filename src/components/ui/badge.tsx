import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"      // Origin, hardware specs, default metadata (slate)
    | "indigo"       // Active, highlight, primary focus
    | "cyan"         // Tech specs, connectivity, Multi-Gig
    | "success"      // Approved, connected, verified (emerald)
    | "warning"      // Draft, pending, attention (amber)
    | "danger"       // Error, invalid, critical (rose)
    | "purple";      // NotebookLM, AI vision, special
  size?: "xs" | "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
  ...props
}) => {
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.2 font-mono",
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1"
  }[size];

  const variantClasses = {
    neutral:
      "bg-slate-800/80 text-slate-300 border border-slate-700/80",
    indigo:
      "bg-indigo-950/60 text-indigo-300 border border-indigo-700/50",
    cyan:
      "bg-sky-950/60 text-sky-300 border border-sky-700/50",
    success:
      "bg-emerald-950/60 text-emerald-300 border border-emerald-700/50",
    warning:
      "bg-amber-950/60 text-amber-300 border border-amber-700/50",
    danger:
      "bg-rose-950/60 text-rose-300 border border-rose-700/50",
    purple:
      "bg-purple-950/60 text-purple-300 border border-purple-700/50"
  }[variant];

  const dotClasses = {
    neutral: "bg-slate-400",
    indigo: "bg-indigo-400 animate-pulse",
    cyan: "bg-sky-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    purple: "bg-purple-400"
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`} />}
      <span className="truncate">{children}</span>
    </span>
  );
};
