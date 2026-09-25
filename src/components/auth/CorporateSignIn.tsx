"use client";

import React, { useState } from "react";
import { Shield, Lock, AlertCircle, Mail, Key } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

interface CorporateSignInProps {
  onSuccess: (user: { email: string; role: string; workspaceId: string }) => void;
}

export function CorporateSignIn({ onSuccess }: CorporateSignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith("@ecomspain.com")) {
      setErrorMsg("Acceso restringido. Solo se permiten correos corporativos @ecomspain.com");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

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
    } catch (err: any) {
      let message = "Error inesperado al iniciar sesión";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
        message = "Credenciales incorrectas o usuario no encontrado.";
      } else if (err?.code === "auth/invalid-email") {
        message = "El correo electrónico introducido no tiene un formato válido.";
      } else if (err?.code === "auth/too-many-requests") {
        message = "Demasiados intentos fallidos. Inténtelo más tarde.";
      } else if (err instanceof Error) {
        message = err.message;
      }
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
            Plataforma protegida. Autentíquese con su correo corporativo @ecomspain.com y contraseña.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Correo electrónico corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                placeholder="usuario@ecomspain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Autenticando..." : "Iniciar Sesión"}</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Corporate Auth & RBAC Enforced</span>
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
