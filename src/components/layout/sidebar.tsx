"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Megaphone,
  PackageSearch,
  Image as ImageIcon,
  CircleDollarSign,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  UserCheck,
  ShieldCheck,
  Layers,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/use-auth";

export type NavSection = "resumen" | "radar" | "workspace" | "enhancer" | "images" | "finops" | "settings";

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ activeSection, onSelectSection, mobileOpen, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const mainNavItems: Array<{ id: NavSection; label: string; icon: React.ElementType; badge?: string }> = [
    { id: "resumen", label: "Resumen (Bento)", icon: LayoutDashboard },
    { id: "radar", label: "Radar B2B", icon: Sparkles, badge: "NUEVO" },
    { id: "workspace", label: "Campañas", icon: Megaphone },
    { id: "enhancer", label: "Catálogo", icon: PackageSearch },
    { id: "images", label: "Imágenes", icon: ImageIcon },
    { id: "finops", label: "FinOps Global", icon: CircleDollarSign },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed && "lg:w-20",
          mobileOpen && "translate-x-0"
        )}
      >
        {/* Header Branding */}
        <div className={cn("flex items-center gap-3 px-5 pb-5 pt-6", collapsed && "lg:justify-center lg:px-0")}>
          <div className="grid size-9 place-items-center rounded-lg bg-primary font-extrabold text-primary-foreground shadow-md">
            E
          </div>
          <div className={cn("leading-tight transition-opacity", collapsed && "lg:hidden")}>
            <p className="text-sm font-bold tracking-tight text-sidebar-foreground">EcomSpain</p>
            <p className="font-mono text-[10px] text-sidebar-foreground/60">Marketing OS B2B</p>
          </div>
        </div>

        {/* Navigation Group */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 text-sm">
          <p className={cn("px-3 pb-2 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/40", collapsed && "lg:hidden")}>
            Navegación Principal
          </p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary ring-1 ring-sidebar-primary/30"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
                <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{item.label}</span>
                {item.badge && !collapsed && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer User Profile & Collapse */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {/* User profile card */}
          {user && (
            <div className={cn("flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5", collapsed && "lg:justify-center lg:p-2")}>
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {(user.displayName || user.email).charAt(0).toUpperCase()}
              </div>
              <div className={cn("min-w-0 flex-1 leading-tight", collapsed && "lg:hidden")}>
                <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.displayName || user.email.split("@")[0]}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block rounded bg-sidebar-primary/20 px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-sidebar-primary">
                    {user.role}
                  </span>
                  <span className="truncate font-mono text-[10px] text-sidebar-foreground/50">{user.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons: Logout & Collapse */}
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={logout}
              title="Cerrar sesión"
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-sidebar-foreground/60 transition hover:bg-danger/10 hover:text-danger",
                collapsed ? "w-full justify-center" : "flex-1"
              )}
            >
              <LogOut className="size-4 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>Cerrar sesión</span>
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden size-8 place-items-center rounded-lg text-sidebar-foreground/50 transition hover:bg-sidebar-accent hover:text-sidebar-foreground lg:grid"
              title={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
