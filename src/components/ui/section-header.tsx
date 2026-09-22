import React from "react";

export interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  badge,
  actions,
  className = ""
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs ${className}`}
    >
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-editorial">
            {title}
          </h2>
          {badge && <span className="ml-1">{badge}</span>}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
