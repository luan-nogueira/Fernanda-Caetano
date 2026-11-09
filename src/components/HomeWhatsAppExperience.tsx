"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Procedure, SiteSettings, Unit } from "@/types/domain";
import { buildProcedureWhatsAppUrl, resolveDirectWhatsAppPhone } from "@/lib/whatsapp-utils";
import {
  MessageCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  X,
  GraduationCap,
  HeartHandshake,
  Stethoscope,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

interface HomeWhatsAppExperienceProps {
  settings: SiteSettings;
  procedures: Procedure[];
  units: Unit[];
}

export function HomeWhatsAppExperience({
  settings,
  procedures,
  units,
}: HomeWhatsAppExperienceProps) {
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [showMethodModal, setShowMethodModal] = useState(false);

  const directPhone = resolveDirectWhatsAppPhone(settings, units);

  const methodSteps = [
    {
      number: "1",
      title: "LEITURA DA PELE E ANÁLISE TECIDUAL",
      desc: "Tudo começa por uma escuta atenta e avaliação individualizada. Não aplicamos protocolos genéricos: analisamos a profundidade tecidual, grau da lesão ou queixa estética para traçar um plano seguro e exclusivo.",
      icon: Stethoscope,
    },
    {
      number: "2",
      title: "TRATAMENTO AVANÇADO DE FERIDAS & LASERTERAPIA",
      desc: "Emprego de coberturas biológicas de alta tecnologia e fotobiomodulação a laser para controle microbiano, cicatrização acelerada e alívio do desconforto em feridas agudas e crônicas.",
      icon: Layers,
    },
    {
      number: "3",
      title: "ESTÉTICA AVANÇADA COM MÁXIMA NATURALIDADE",
      desc: "Protocolos de toxina botulínica, bioestímulo, PEIM e procedimentos minimamente invasivos realizados com precisão de enfermagem, preservando seus traços e harmonia sem exageros.",
      icon: Sparkles,
    },
    {
      number: "4",
      title: "ACOLHIMENTO EM CONSULTÓRIO OU HOME CARE",
      desc: "Consultórios confortáveis no Farol de São Thomé e Edifício Platinum, além de atendimento domiciliar planejado para pacientes com restrição de mobilidade ou convalescentes.",
      icon: HeartHandshake,
    },
    {
      number: "5",
      title: "ACOMPANHAMENTO CONTÍNUO & SUPORTE PRÓXIMO",
      desc: "O cuidado não encerra ao término da sessão. Você conta com suporte humanizado, orientações pós-atendimento e canal direto pelo WhatsApp para tirar todas as dúvidas.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-10">
      {/* 1. APRESENTAÇÃO / O MÉTODO DRA. FERNANDA CAETANO (Estilo Doris Copelli) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B1E38] via-[#07152B] to-[#040C1A] text-offwhite p-6 sm:p-9 border border-gold/30 shadow-luxury">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gold/10 blur-3xl"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light">
              Cuidado Integral • Feridas & Estética Avançada
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-offwhite tracking-tight mb-3">
            O Método Dra. Fernanda Caetano
          </h2>

          <p className="text-xs sm:text-sm text-offwhite/85 leading-relaxed max-w-2xl mb-8">
            Não é um procedimento isolado, é um plano de cuidado individualizado.
            Unimos o rigor técnico e a segurança da enfermagem dermatológica com
            as melhores tecnologias de reabilitação tecidual e estética para devolver
            saúde, viço e harmonia — sem exageros e com respeito à sua história.
          </p>

          {/* Etapas do Método */}
          <div className="space-y-4 mb-8">
            {methodSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-gold/20 hover:border-gold/40 hover:bg-white/[0.07] transition-all"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#9B7D3B] via-[#DFBA73] to-[#F1DEB2] text-navy font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-md">
                    {step.number}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-gold-light mb-1">
                      {step.title}
                    </h3>
                    <p className="text-xs text-offwhite/80 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de Ação Dourado Metálico para o WhatsApp Oficial */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-gold/20">
            <a
              href={buildProcedureWhatsAppUrl(
                directPhone,
                null,
                "Olá, Dra. Fernanda! Gostaria de agendar uma consulta/avaliação baseada no seu Método de atendimento."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#DFBA73] via-[#F4E1B5] to-[#C99C4B] hover:brightness-105 active:scale-[0.98] text-[#121927] font-semibold text-xs sm:text-sm tracking-wide shadow-luxury transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-current text-[#121927]" />
              <span>Agendar Avaliação no WhatsApp com Dra. Fernanda</span>
            </a>

            <Link
              href="/sobre"
              className="text-xs text-gold-light hover:text-white transition-colors underline-offset-4 hover:underline py-2 sm:px-3"
            >
              Conhecer formação & registro profissional →
            </Link>
          </div>
        </div>
      </section>

      {/* 2. PROCEDIMENTOS COM BOTÕES METÁLICOS DOURADOS (Estilo Dra. Amanda Lacerda) */}
      <section className="space-y-4">
        <div className="text-center sm:text-left mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-terracotta">
            Escolha seu Atendimento
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
            Procedimentos & Agendamento Direto
          </h2>
          <p className="text-xs text-slate mt-1 max-w-lg">
            Toque no procedimento desejado para abrir uma conversa direta no
            WhatsApp da Dra. Fernanda com a mensagem pronta.
          </p>
        </div>

        {/* Lista de botões dourados metálicos com ícone do WhatsApp */}
        <div className="space-y-2.5">
          {procedures.map((proc) => {
            const waUrl = buildProcedureWhatsAppUrl(
              directPhone,
              proc.name,
              settings.whatsapp_direct_message_template
            );

            return (
              <div
                key={proc.id}
                className="group relative flex items-center justify-between gap-2 p-1.5 rounded-full bg-navy/5 hover:bg-navy/10 border border-gold/30 transition-all"
              >
                {/* Botão principal dourado estilo Dra. Amanda */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-[#DFBA73] via-[#F2DEB0] to-[#C99C4B] hover:brightness-105 active:scale-[0.99] text-[#141A28] font-semibold text-xs sm:text-sm shadow-md transition-all text-center"
                >
                  <MessageCircle className="w-4 h-4 fill-current text-[#141A28] shrink-0" />
                  <span className="truncate">{proc.name}</span>
                </a>

                {/* Botão de Informação / Saiba Mais */}
                <button
                  type="button"
                  onClick={() => setSelectedProc(proc)}
                  title={`Ver explicação detalhada de ${proc.name}`}
                  className="px-3.5 py-3 rounded-full bg-white hover:bg-gold-50 text-navy hover:text-terracotta text-xs font-medium border border-offwhite-border transition-colors flex items-center gap-1 shrink-0"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Explicar</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. DESTAQUE ESPECIAL: ÁREA DE CURSOS & CAPACITAÇÕES */}
      <section className="relative overflow-hidden rounded-3xl bg-navy text-offwhite p-6 sm:p-7 border border-gold/40 shadow-luxury">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-gold-dark to-gold text-navy flex items-center justify-center shrink-0 mx-auto sm:mx-0 shadow-md">
              <GraduationCap className="w-6 h-6 text-navy" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">
                Capacitação Profissional
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-semibold text-offwhite mt-0.5">
                Cursos & Área de Alunos
              </h3>
              <p className="text-xs text-offwhite/80 max-w-md mt-1 leading-relaxed">
                Formações práticas em tratamento de feridas e técnicas dermatológicas
                com videoaulas, apostilas em PDF e suporte direto da Dra. Fernanda.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <Link
              href="/cursos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-terracotta hover:bg-terracotta-dark text-white font-semibold text-xs tracking-wide shadow-md transition-all"
            >
              <span>Acessar Cursos & Alunos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <a
              href={buildProcedureWhatsAppUrl(
                directPhone,
                "Cursos e Mentorias",
                "Olá, Dra. Fernanda! Gostaria de informações sobre datas e valores dos seus cursos e capacitações."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 hover:bg-white/15 text-gold-light border border-gold/30 text-xs font-semibold transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Dúvidas de Cursos</span>
            </a>
          </div>
        </div>
      </section>

      {/* 4. MODAL / SHEET DE EXPLICAÇÃO DO PROCEDIMENTO */}
      {selectedProc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 shadow-luxury border border-gold/30 relative text-navy space-y-4">
            <button
              onClick={() => setSelectedProc(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-offwhite text-slate transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-terracotta">
                {selectedProc.category_name || "Procedimento"}
              </span>
              <h3 className="font-serif text-2xl font-semibold text-navy mt-1">
                {selectedProc.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate mt-1">
                <Clock className="w-3.5 h-3.5 text-gold-dark" />
                <span>Duração estimada: {selectedProc.duration_minutes} min</span>
                <span>•</span>
                <span>
                  {selectedProc.modality === "domiciliar"
                    ? "Home Care (Domiciliar)"
                    : "Presencial em Consultório"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-offwhite border border-offwhite-border text-xs sm:text-sm text-navy/90 font-medium leading-relaxed">
              {selectedProc.short_description}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate">
                Como funciona o procedimento
              </h4>
              <p className="text-xs sm:text-sm text-slate leading-relaxed whitespace-pre-line">
                {selectedProc.full_description}
              </p>
            </div>

            {selectedProc.preparation_instructions && (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs">
                <p className="font-semibold mb-0.5">Orientações de preparo:</p>
                <p>{selectedProc.preparation_instructions}</p>
              </div>
            )}

            <div className="pt-3 border-t border-offwhite-border flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={buildProcedureWhatsAppUrl(
                  directPhone,
                  selectedProc.name,
                  settings.whatsapp_direct_message_template
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#DFBA73] via-[#F2DEB0] to-[#C99C4B] hover:brightness-105 active:scale-[0.99] text-[#141A28] font-semibold text-xs sm:text-sm shadow-md transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-current text-[#141A28]" />
                <span>Agendar {selectedProc.name} no WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedProc(null)}
                className="w-full sm:w-auto px-4 py-3 rounded-full bg-offwhite hover:bg-offwhite-warm text-slate text-xs font-medium"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
