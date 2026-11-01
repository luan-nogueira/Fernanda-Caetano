"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  KeyRound,
  ArrowLeft,
  Lock,
  Mail,
  MessageCircle,
} from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cursos/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "E-mail ou senha inválidos.");
      } else {
        router.push("/cursos");
      }
    } catch {
      setError("Erro de conexão ao validar seu acesso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-7 sm:p-8 border-2 border-gold/40 shadow-luxury space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate hover:text-navy"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos Cursos</span>
          </Link>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase text-terracotta">
            <GraduationCap className="w-4 h-4" />
            <span>Área do Aluno</span>
          </span>
        </div>

        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">
            Acessar Vídeo-Aulas
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate mt-1">
            Digite o e-mail e a senha exclusivos enviados pela Dra. Fernanda
            Caetano após a confirmação da sua inscrição.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-navy mb-1.5">
              Seu E-mail Cadastrado
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-navy mb-1.5">
              Sua Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-sm font-bold shadow-sm transition-all"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? "Validando acesso..." : "Entrar na Área do Aluno"}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-offwhite-border text-center space-y-2">
          <p className="text-xs font-semibold text-slate">
            Ainda não possui uma senha de acesso?
          </p>
          <a
            href="https://wa.me/5522999990001?text=Ol%C3%A1%20Dra.%20Fernanda!%20Gostaria%20de%20adquirir%20meu%20acesso%20aos%20cursos."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Solicitar inscrição e senha pelo WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
