"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Procedure, SiteSettings, Unit } from "@/types/domain";
import { buildProcedureWhatsAppUrl, resolveDirectWhatsAppPhone } from "@/lib/whatsapp-utils";
import {
  MessageCircle,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Info,
} from "lucide-react";

interface WhatsAppDirectBookingConciergeProps {
  settings: SiteSettings;
  procedures: Procedure[];
  units: Unit[];
  initialProcedureSlug?: string;
  initialUnitSlug?: string;
}

export function WhatsAppDirectBookingConcierge({
  settings,
  procedures,
  units,
  initialProcedureSlug,
  initialUnitSlug,
}: WhatsAppDirectBookingConciergeProps) {
  const directPhone = resolveDirectWhatsAppPhone(settings, units);

  const initialProc =
    procedures.find((p) => p.slug === initialProcedureSlug) || procedures[0];
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(
    initialProc || null
  );

  const initialUnit = units.find((u) => u.slug === initialUnitSlug);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(
    initialUnit || null
  );

  const phoneToUse = selectedUnit?.whatsapp_phone
    ? selectedUnit.whatsapp_phone.replace(/\D/g, "")
    : directPhone;

  let message = "";
  if (selectedProc) {
    if (selectedUnit) {
      message = `Olá, Dra. Fernanda! Vi o site e gostaria de agendar uma consulta para *${selectedProc.name}* na unidade *${selectedUnit.name}*.`;
    } else {
      message = `Olá, Dra. Fernanda! Vi o site e gostaria de agendar uma consulta para o procedimento: *${selectedProc.name}*.`;
    }
  } else {
    message = `Olá, Dra. Fernanda! Conheci seu trabalho pelo site e gostaria de agendar uma avaliação.`;
  }

  const waUrl = `https://wa.me/${phoneToUse}?text=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gold/40 shadow-luxury text-navy">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-[10px] sm:text-[11px] uppercase tracking-widest text-navy font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-gold-dark shrink-0" />
            Atendimento Personalizado
          </span>
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
          Agendamento Direto com a Dra. Fernanda
        </h2>
        <p className="text-xs sm:text-sm text-slate mt-1.5 leading-relaxed max-w-xl">
          Nossos agendamentos são tratados com escuta humanizada e atenção direta.
          Selecione o procedimento de interesse abaixo para iniciar a conversa no WhatsApp oficial.
        </p>

        {/* Seletor de Procedimento */}
        <div className="mt-6 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate">
            1. Selecione o Procedimento ou Cuidado
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {procedures.map((proc) => {
              const isSelected = selectedProc?.id === proc.id;
              return (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => setSelectedProc(proc)}
                  className={`text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-navy text-offwhite border-gold shadow-md"
                      : "bg-offwhite/80 hover:bg-white text-navy border-offwhite-border hover:border-gold/50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate">
                      {proc.name}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 truncate ${
                        isSelected ? "text-offwhite/80" : "text-slate"
                      }`}
                    >
                      {proc.category_name || "Procedimento"} • {proc.duration_minutes} min
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seletor opcional de Unidade */}
        {units.length > 0 && (
          <div className="mt-6 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate">
              2. Preferência de Local (Opcional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                  selectedUnit === null
                    ? "bg-navy text-offwhite border-gold font-semibold"
                    : "bg-offwhite text-slate hover:bg-white border-offwhite-border"
                }`}
              >
                A Combinar com a Dra.
              </button>
              {units.map((u) => {
                const isSelected = selectedUnit?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUnit(u)}
                    className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-navy text-offwhite border-gold font-semibold"
                        : "bg-offwhite text-slate hover:bg-white border-offwhite-border"
                    }`}
                  >
                    {u.short_name || u.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalhe do Procedimento Selecionado */}
        {selectedProc && (
          <div className="mt-6 p-4 rounded-2xl bg-offwhite border border-offwhite-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-terracotta uppercase tracking-wider">
                Resumo do Cuidado Selecionado
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate">
                <Clock className="w-3.5 h-3.5 text-gold-dark" />
                {selectedProc.duration_minutes} min
              </span>
            </div>
            <p className="text-xs sm:text-sm text-navy/90 leading-relaxed font-medium">
              {selectedProc.short_description}
            </p>
            {selectedProc.preparation_instructions && (
              <p className="text-xs text-slate pt-1 border-t border-offwhite-border/60">
                <span className="font-semibold text-navy">Preparo:</span> {selectedProc.preparation_instructions}
              </p>
            )}
          </div>
        )}

        {/* Botão de Agendamento Dourado Metálico no WhatsApp */}
        <div className="mt-6 pt-5 border-t border-offwhite-border space-y-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-full bg-gradient-to-r from-[#DFBA73] via-[#F4E1B5] to-[#C99C4B] hover:brightness-105 active:scale-[0.99] text-[#121927] font-semibold text-sm sm:text-base tracking-wide shadow-luxury transition-all text-center"
          >
            <MessageCircle className="w-5 h-5 fill-current text-[#121927] shrink-0" />
            <span>
              Continuar no WhatsApp da Dra. Fernanda
              {selectedProc ? ` • ${selectedProc.name}` : ""}
            </span>
          </a>

          <p className="text-center text-[11px] text-slate">
            Ao clicar, seu aplicativo do WhatsApp será aberto com o procedimento pré-selecionado.
          </p>
        </div>
      </div>

      {/* Card de Cursos */}
      <div className="rounded-2xl p-5 bg-navy text-offwhite border border-gold/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-gold shrink-0" />
          <div>
            <h3 className="font-serif text-base font-semibold text-offwhite">
              Interesse em Cursos e Capacitações?
            </h3>
            <p className="text-xs text-offwhite/80">
              Conheça as formações práticas e área de alunas da Dra. Fernanda.
            </p>
          </div>
        </div>
        <Link
          href="/cursos"
          className="shrink-0 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <span>Ver Cursos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
