import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = ""
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400">
          {icon}
        </div>
      )}
      <div className="max-w-md space-y-1.5">
        <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 pt-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
