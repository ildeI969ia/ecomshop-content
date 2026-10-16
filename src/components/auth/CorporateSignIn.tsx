"use client";

import React, { useState, useEffect } from "react";
import { Shield, Lock, AlertCircle, Mail, Key } from "lucide-react";

interface CorporateSignInProps {
  onSuccess: (user: { uid: string; email: string; role: string; workspaceId: string }) => void;
}

export function CorporateSignIn({ onSuccess }: CorporateSignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Asegurar que al acceder o cerrar sesión los campos estén vacíos y sin recordar al usuario previo
  useEffect(() => {
    setEmail("");
    setPassword("");
    const timer = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@ecomspain.com")) {
      setErrorMsg("Acceso restringido. Solo se permiten correos corporativos @ecomspain.com.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Fallo en el inicio de sesión");
      onSuccess(data.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-7 pb-6 border-b border-slate-800">
          <div className="h-12 px-3 py-1.5 rounded-xl bg-white flex items-center justify-center shadow-md">
            <img
              src="/ecomspain-logo.png"
              alt="EcomSpain Conectividad"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">EcomSpain Marketing OS</h1>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-1">Corporate access</p>
          </div>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Acceso corporativo</h2>
          <p className="text-sm text-slate-400 mt-1">Usa tu cuenta @ecomspain.com. La sesión se valida en el servidor mediante Firebase.</p>
        </div>
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {/* Inputs honeypot ocultos para neutralizar el autofill agresivo de Chromium */}
          <input
            type="text"
            name="prevent_autofill_username"
            style={{ display: "none" }}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />
          <input
            type="password"
            name="prevent_autofill_password"
            style={{ display: "none" }}
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="new-password"
          />

          <label className="block text-xs font-semibold text-slate-300">
            Correo electrónico
            <div className="relative mt-1">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                name="ecom_corporate_user"
                id="ecom_corporate_user"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ecomspain.com"
                className="w-full h-11 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Contraseña
            <div className="relative mt-1">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                name="ecom_corporate_secret"
                id="ecom_corporate_secret"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </label>
          <button type="submit" disabled={loading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50 cursor-pointer">
            {loading ? "Autenticando..." : "Iniciar sesión"}
          </button>
        </form>
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Firebase Auth + RBAC</div>
            <a href="/" className="text-sky-400 hover:text-sky-300 transition-colors font-sans font-medium text-xs">
              ← Ver Blog Público
            </a>
          </div>
          <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-sky-400" /> Cookie de sesión httpOnly</div>
        </div>
      </div>
    </main>
  );
}
