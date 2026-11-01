"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Falha na autenticação.");
        setLoading(false);
        return;
      }

      router.push("/admin/agenda");
      router.refresh();
    } catch {
      setError("Erro de conexão ao tentar entrar.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gold/10 blur-3xl"
      />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 flex items-center justify-between text-offwhite/80 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>Voltar à Página Pública</span>
          </Link>
          <span className="inline-flex items-center gap-1 text-gold">
            <ShieldCheck className="w-4 h-4" />
            <span>Acesso Seguro</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-luxury border border-gold/40">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-navy text-gold mx-auto flex items-center justify-center mb-3 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
              Central de Gestão Exclusiva
            </span>
            <h1 className="font-serif text-3xl font-semibold text-navy mt-1">
              Fernanda Caetano
            </h1>
            <p className="text-xs text-slate mt-1">
              Painel Administrativo • Agenda, Site & WhatsApp Bot
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                E-mail Administrativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail administrativo"
                className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/50 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/50 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-terracotta hover:bg-terracotta-dark disabled:opacity-50 text-white text-sm font-semibold shadow-luxury transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Entrar no Painel Administrativo</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-offwhite-border text-[11px] text-slate text-center">
            <p className="flex items-center justify-center gap-1.5 font-medium text-navy">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-dark" />
              <span>Acesso restrito e exclusivo à profissional responsável</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

