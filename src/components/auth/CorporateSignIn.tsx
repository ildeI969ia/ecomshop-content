"use client";

import React, { useState } from "react";
import { Shield, Lock, AlertCircle } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";

interface CorporateSignInProps {
  onSuccess: (user: { email: string; role: string; workspaceId: string }) => void;
}

export function CorporateSignIn({ onSuccess }: CorporateSignInProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      if (!user.email || !user.email.toLowerCase().endsWith("@ecomspain.com")) {
        setErrorMsg("Acceso restringido. Solo se permiten cuentas corporativas @ecomspain.com");
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
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
          <h2 className="text-xl font-bold text-white">Acceso Corporativo</h2>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma protegida. Autentíquese exclusivamente con su cuenta Google Workspace autorizada.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? "Autenticando..." : "Iniciar sesión con Google Workspace (@ecomspain.com)"}</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Workspace OAuth2 & RBAC Enforced</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>Firebase Secure Session Cookie (__session)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
