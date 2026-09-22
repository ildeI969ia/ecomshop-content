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
    <div className="bg-slate-900 flex flex-col justify-center items-center px-4 py-8 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-sm">
            E
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">ECOMSPAIN</h1>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-1">Marketing OS // NOC Control</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold font-editorial text-white">Corporate Sign In</h2>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma protegida. Ingrese su correo corporativo y clave de acceso autorizada.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ecomspain.com"
              required
              autoComplete="username"
              className="w-full h-10 px-3 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-sans"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Contraseña de Acceso
              </label>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-indigo-400" /> Master Passcode
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
                className="w-full h-10 pl-3 pr-10 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? "Verificando Credenciales..." : "Acceder al Sistema"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>RBAC Server-Side Enforced (7 Roles)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>HMAC-SHA256 Encrypted Session Cookie</span>
          </div>
        </div>
      </div>
    </div>
  );
}
