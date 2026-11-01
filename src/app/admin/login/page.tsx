"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Activity,
} from "lucide-react";

const ENTRY_STEPS = [
  "Autenticando credenciais clínicas — Dra. Fernanda Caetano...",
  "Sincronizando prontuário de agenda (Farol, Ed. Platinum & Home Care)...",
  "Carregando protocolos de Enfermagem Dermatológica, Laserterapia & Cursos...",
  "Acesso liberado • Bem-vinda à sua Central Executiva!",
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enteringSystem, setEnteringSystem] = useState(false);
  const [entryStep, setEntryStep] = useState(0);
  const [progress, setProgress] = useState(12);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enteringSystem) return;

    const stepTimer1 = setTimeout(() => {
      setEntryStep(1);
      setProgress(48);
    }, 650);

    const stepTimer2 = setTimeout(() => {
      setEntryStep(2);
      setProgress(82);
    }, 1350);

    const stepTimer3 = setTimeout(() => {
      setEntryStep(3);
      setProgress(100);
    }, 2000);

    const navTimer = setTimeout(() => {
      router.push("/admin");
      router.refresh();
    }, 2650);

    return () => {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(navTimer);
    };
  }, [enteringSystem, router]);

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
        setError(data.error || "Credenciais inválidas. Verifique e tente novamente.");
        setLoading(false);
        return;
      }

      // Dispara a animação clínica personalizada de entrada no sistema
      setEnteringSystem(true);
    } catch {
      setError("Erro de conexão ao tentar entrar.");
      setLoading(false);
    }
  }

  // ============================================================================
  // TELA ANIMADA DE ENTRADA NO SISTEMA (ESTÉTICA & ENFERMAGEM DERMATOLÓGICA)
  // ============================================================================
  if (enteringSystem) {
    return (
      <div className="min-h-screen bg-navy text-white flex flex-col justify-center items-center px-6 relative overflow-hidden select-none">
        {/* Luzes de Fotobiomodulação / Laserterapia e Dourado no fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-terracotta/15 blur-[110px] animate-pulse"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-gold/15 blur-[80px]"
        />

        <div className="relative z-10 max-w-lg w-full text-center space-y-8">
          {/* Emblema Orbital de Regeneração Tecidual & Estética Avançada */}
          <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
            {/* Anel externo giratório dourado */}
            <div className="absolute inset-0 rounded-full border border-dashed border-gold/40 animate-[spin_10s_linear_infinite]" />
            {/* Segundo anel orbital laranja/laser */}
            <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-terracotta border-r-gold/60 animate-[spin_2.4s_ease-in-out_infinite]" />
            {/* Terceiro anel pulsante */}
            <div className="absolute inset-6 rounded-full bg-white/5 border border-gold/30 animate-pulse" />

            {/* Núcleo Monograma FC + Ícone Clínico */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-gold-dark via-gold to-gold-light flex flex-col items-center justify-center text-navy shadow-luxury">
              <span className="font-serif text-2xl font-semibold tracking-tight leading-none">
                FC
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] mt-0.5">
                Clínica
              </span>
            </div>

            {/* Pontos luminosos simulando feixes de Laserterapia / Dermato */}
            <span className="absolute -top-1 right-6 w-3 h-3 rounded-full bg-terracotta shadow-[0_0_12px_#D97732] animate-ping" />
            <span className="absolute bottom-2 left-4 w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_#C5A46D] animate-pulse" />
          </div>

          {/* Saudação Personalizada */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/5 border border-gold/30 text-[10px] uppercase tracking-[0.24em] text-gold-light">
              <Sparkles className="w-3 h-3 text-terracotta" />
              <span>Enfermagem Dermatológica & Estética Avançada</span>
            </span>

            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-white tracking-tight">
              Bem-vinda, Dra. Fernanda Caetano
            </h1>

            <p className="text-xs sm:text-sm text-white/75 font-normal">
              Preparando seu ambiente clínico digital e agenda inteligente
            </p>
          </div>

          {/* Linha de Pulso Clínico / Laser SVG */}
          <div className="w-64 mx-auto opacity-80">
            <svg
              viewBox="0 0 300 40"
              className="w-full h-8 stroke-gold fill-none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M 0 20 L 90 20 L 110 8 L 125 34 L 145 4 L 165 32 L 180 16 L 195 20 L 300 20"
                className="animate-pulse"
              />
            </svg>
          </div>

          {/* Barra de Progresso Minimalista Dourada/Terracotta */}
          <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gold-light font-medium flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-terracotta animate-bounce" />
                <span>{ENTRY_STEPS[entryStep]}</span>
              </span>
              <span className="text-white/80 font-mono text-[11px]">
                {progress}%
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold via-terracotta to-gold-light transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-white/70">
              <div
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg border ${
                  entryStep >= 0
                    ? "border-gold/40 bg-gold/10 text-gold-light"
                    : "border-white/5"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Agenda & Unidades</span>
              </div>
              <div
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg border ${
                  entryStep >= 1
                    ? "border-gold/40 bg-gold/10 text-gold-light"
                    : "border-white/5"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Laser & Feridas</span>
              </div>
              <div
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg border ${
                  entryStep >= 2
                    ? "border-gold/40 bg-gold/10 text-gold-light"
                    : "border-white/5"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Academy & Bot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TELA DE LOGIN EXECUTIVA (SPLIT-SCREEN MINIMALISTA DE ALTO PADRÃO)
  // ============================================================================
  return (
    <div className="min-h-screen bg-navy flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Iluminação ambiente sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-36 left-1/4 w-[520px] h-[380px] rounded-full bg-gold/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 right-1/4 w-[480px] h-[360px] rounded-full bg-terracotta/10 blur-[120px]"
      />

      <div className="w-full max-w-4xl relative z-10">
        {/* Topo de navegação */}
        <div className="mb-6 flex items-center justify-between text-offwhite/80 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 hover:text-gold transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>Voltar à Página Pública</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-gold/25 text-gold-light text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
            <span>Ambiente Clínico Criptografado</span>
          </span>
        </div>

        {/* Card Principal Split-Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-luxury border border-gold/30 bg-white">
          {/* Painel Institucional Esquerdo (Identidade da Dra. Fernanda) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-navy via-navy-800 to-navy-950 text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-gold/25">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -bottom-16 w-56 h-56 rounded-full border border-gold/15"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -bottom-8 w-40 h-40 rounded-full border border-terracotta/20"
            />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-dark to-gold flex items-center justify-center text-navy font-serif font-semibold text-xl shadow-md">
                  FC
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-gold block">
                    Plataforma Exclusiva
                  </span>
                  <h2 className="font-serif text-lg font-medium text-white">
                    Dra. Fernanda Caetano
                  </h2>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-serif text-xl sm:text-2xl font-medium text-white leading-snug">
                  Gestão Clínica, Estética Avançada & Ensino
                </p>
                <p className="text-xs text-white/75 leading-relaxed font-normal">
                  Controle integrado de agendamentos nas unidades Farol de São
                  Thomé, Edifício Platinum, Home Care, Bot de WhatsApp e Área de
                  Alunos.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-8 relative z-10">
              <div className="flex items-center gap-2.5 text-xs text-white/85 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <Stethoscope className="w-4 h-4 text-gold shrink-0" />
                <span>Reabilitação Tecidual & Laserterapia</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/85 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <Sparkles className="w-4 h-4 text-terracotta shrink-0" />
                <span>Estética Avançada & Procedimentos</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/85 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
                <HeartPulse className="w-4 h-4 text-gold shrink-0" />
                <span>Agenda Inteligente & Academy</span>
              </div>
            </div>
          </div>

          {/* Formulário Direito */}
          <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-center bg-white">
            <div className="mb-7">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-terracotta block mb-1">
                Autenticação Administrativa
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-navy tracking-tight">
                Acessar Central de Gestão
              </h1>
              <p className="text-xs sm:text-sm text-slate/85 mt-1 font-normal">
                Insira suas credenciais para iniciar sua sessão clínica.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">
                  E-mail Administrativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate/70 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail profissional"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-navy mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate/70 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate/70 hover:text-navy p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl bg-navy hover:bg-terracotta disabled:opacity-50 text-white text-sm font-medium tracking-wide shadow-card hover:shadow-luxury transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span>
                    {loading
                      ? "Verificando credenciais..."
                      : "Entrar na Central Clínica"}
                  </span>
                </button>
              </div>
            </form>

            <div className="mt-7 pt-4 border-t border-offwhite-border/70 flex items-center justify-between text-[11px] text-slate/80">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-dark" />
                <span>Acesso exclusivo à profissional responsável</span>
              </span>
              <span>Conformidade LGPD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
