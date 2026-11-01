import React from "react";
import Link from "next/link";
import { getPublicSiteBundle } from "@/lib/repositories";
import { formatBRDate } from "@/lib/availability";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendamentoSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    status?: string;
    proc?: string;
    unit?: string;
    wa?: string;
    date?: string;
    time?: string;
    end?: string;
    name?: string;
  }>;
}) {
  const sp = await searchParams;
  const { settings } = getPublicSiteBundle();

  const code = sp?.code || "FC-000000";
  const status = sp?.status || "confirmed";
  const isPending = status === "pending";
  const procName = sp?.proc || "Procedimento";
  const unitName = sp?.unit || "Consultório";
  const waDigits = (sp?.wa || "5522999990001").replace(/\D/g, "");
  const dateFormatted = formatBRDate(sp?.date || "");
  const startTime = sp?.time || "";
  const endTime = sp?.end || "";
  const clientName = sp?.name || "Paciente";

  const whatsappShareText = `Olá! Acabei de realizar um agendamento pelo site da Dra. Fernanda Caetano:\n\n• *Código:* ${code}\n• *Nome:* ${clientName}\n• *Procedimento:* ${procName}\n• *Unidade:* ${unitName}\n• *Data:* ${dateFormatted} às ${startTime}\n• *Status:* ${
    isPending ? "Solicitação aguardando confirmação" : "Confirmado"
  }`;

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav
        backHref="/"
        backLabel="Voltar ao Início"
        showBookCta={false}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 flex items-center">
        <div className="w-full bg-white rounded-3xl p-6 sm:p-10 border border-offwhite-border shadow-luxury text-center space-y-6">
          <div
            className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
              isPending
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
            }`}
          >
            {isPending ? (
              <Clock className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPending
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isPending
                ? "Solicitação Recebida • Aguardando Confirmação"
                : "Agendamento Confirmado"}
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy mt-3">
              {isPending
                ? "Sua solicitação foi registrada!"
                : "Horário reservado com sucesso!"}
            </h1>

            <p className="text-xs sm:text-sm text-slate mt-2 max-w-md mx-auto leading-relaxed">
              {isPending
                ? "Como este atendimento requer validação prévia de rota/agenda pela Dra. Fernanda Caetano, entraremos em contato pelo seu WhatsApp para confirmar."
                : settings.booking_success_message}
            </p>
          </div>

          {/* Card do Protocolo */}
          <div className="bg-offwhite rounded-2xl p-5 border border-gold/40 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-offwhite-border pb-3">
              <span className="text-xs font-medium text-slate">
                Código do Agendamento
              </span>
              <span className="font-mono text-sm font-bold px-3 py-1 rounded-lg bg-navy text-gold">
                {code}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] text-slate block">Paciente</span>
                <strong className="text-navy">{clientName}</strong>
              </div>
              <div>
                <span className="text-[11px] text-slate block">
                  Procedimento
                </span>
                <strong className="text-navy">{procName}</strong>
              </div>
              <div className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] text-slate block">Unidade</span>
                  <strong className="text-navy">{unitName}</strong>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <CalendarCheck className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] text-slate block">
                    Data e Horário
                  </span>
                  <strong className="text-navy">
                    {dateFormatted} • {startTime}
                    {endTime ? ` às ${endTime}` : ""}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                whatsappShareText
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar comprovante no WhatsApp da Unidade</span>
            </a>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-navy hover:bg-navy-800 text-offwhite text-xs sm:text-sm font-semibold transition-all"
            >
              <Home className="w-4 h-4 text-gold" />
              <span>Voltar à Página Inicial</span>
            </Link>
          </div>

          <p className="text-[11px] text-slate flex items-center justify-center gap-1 pt-2">
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span>
              Nosso sistema também envia lembretes automáticos via WhatsApp
              antes do seu atendimento.
            </span>
          </p>
        </div>
      </main>

      <PublicFooter
        professionalName={settings.professional_name}
        subtitle={settings.professional_subtitle}
        instagramUrl={settings.instagram_url}
        instagramHandle={settings.instagram_handle}
      />
    </div>
  );
}

