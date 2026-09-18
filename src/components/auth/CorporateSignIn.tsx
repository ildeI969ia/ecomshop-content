"use client";

import React, { useState } from "react";
import { Shield, Lock, ArrowRight, AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";

interface CorporateSignInProps {
  onSuccess: (user: { email: string; role: string; workspaceId: string }) => void;
}

export function CorporateSignIn({ onSuccess }: CorporateSignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith("@ecomspain.com")) {
      setErrorMsg("Acceso restringido a cuentas corporativas @ecomspain.com");
      return;
    }

    if (!password.trim()) {
      setErrorMsg("Debe ingresar la contraseña de acceso corporativo");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo en el inicio de sesión");
      }

      onSuccess(data.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al iniciar sesión";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-sm bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider">
            E
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">ECOMSPAIN</h1>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-1">Marketing OS // NOC Control</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-slate-900">Corporate Sign In</h2>
          <p className="text-xs text-slate-600 mt-1">
            Plataforma protegida. Ingrese su correo corporativo y clave de acceso autorizada.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ecomspain.com"
              required
              autoComplete="username"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-sm focus:outline-none focus:border-sky-600 font-sans"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Contraseña de Acceso
              </label>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Master Passcode
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full h-10 pl-3 pr-10 text-sm bg-white border border-slate-300 rounded-sm focus:outline-none focus:border-sky-600 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Verificando Credenciales..." : "Acceder al Sistema"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>RBAC Server-Side Enforced (7 Roles)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <Lock className="w-3.5 h-3.5 text-sky-600" />
            <span>HMAC-SHA256 Encrypted Session Cookie</span>
          </div>
        </div>
      </div>
    </div>
  );
}
