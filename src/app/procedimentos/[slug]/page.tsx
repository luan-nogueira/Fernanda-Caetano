import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProcedureBySlug,
  getPublicSiteBundle,
} from "@/lib/repositories";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProcedimentoDetalhePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proc = getProcedureBySlug(slug);

  if (!proc) {
    notFound();
  }

  const { settings } = getPublicSiteBundle();

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav
        backHref="/procedimentos"
        backLabel="Todos os Procedimentos"
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-offwhite-border shadow-luxury">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-navy text-gold">
              {proc.category_name || "Especialidade"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-offwhite text-navy">
              <Clock className="w-3.5 h-3.5 text-terracotta" />
              Duração estimada: {proc.duration_minutes} minutos
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-offwhite text-navy">
              <MapPin className="w-3.5 h-3.5 text-terracotta" />
              Modalidade:{" "}
              {proc.modality === "domiciliar"
                ? "Domiciliar (Home Care)"
                : "Presencial em Consultório"}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy mb-3">
            {proc.name}
          </h1>

          <p className="text-sm sm:text-base text-navy/90 font-medium leading-relaxed mb-6">
            {proc.short_description}
          </p>

          <div className="prose prose-sm max-w-none text-slate leading-relaxed space-y-4 border-t border-offwhite-border pt-6">
            <h2 className="font-serif text-xl font-semibold text-navy">
              Sobre o Atendimento
            </h2>
            <p className="text-sm text-navy/80 leading-relaxed whitespace-pre-line">
              {proc.full_description}
            </p>
          </div>

          {proc.preparation_instructions && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-offwhite border border-gold/40">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    Orientações Gerais e Preparo
                  </h3>
                  <p className="text-xs sm:text-sm text-navy/80 mt-1 leading-relaxed">
                    {proc.preparation_instructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {proc.units && proc.units.length > 0 && (
            <div className="mt-6 pt-6 border-t border-offwhite-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate mb-3">
                Unidades Disponíveis para este Procedimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {proc.units.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-offwhite/70 border border-offwhite-border flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-navy">{u.name}</p>
                      <p className="text-xs text-slate">{u.neighborhood_city}</p>
                    </div>
                    <Link
                      href={`/agendar?procedimento=${encodeURIComponent(
                        proc.slug
                      )}&unidade=${encodeURIComponent(u.slug)}`}
                      className="text-xs font-semibold text-terracotta hover:underline inline-flex items-center gap-1"
                    >
                      <span>Escolher</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-offwhite-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate">
              <ShieldCheck className="w-4 h-4 text-gold-dark shrink-0" />
              <span>
                {Boolean(proc.requires_approval) ||
                proc.modality === "domiciliar"
                  ? "Solicitação sujeita à confirmação rápida da profissional."
                  : "Disponibilidade integrada em tempo real com a agenda."}
              </span>
            </div>

            <Link
              href={`/agendar?procedimento=${encodeURIComponent(proc.slug)}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white text-sm font-semibold shadow-luxury transition-all"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Agendar este procedimento</span>
            </Link>
          </div>
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

