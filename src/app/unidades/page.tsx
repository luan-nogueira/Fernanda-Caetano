import React from "react";
import Link from "next/link";
import { getPublicSiteBundle } from "@/lib/repositories";
import { pullAllTablesFromTurso } from "@/lib/turso-sync";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import {
  ArrowRight,
  Building2,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UnidadesPage() {
  await pullAllTablesFromTurso();
  const { settings, units, procedures } = getPublicSiteBundle();

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav backHref="/" backLabel="Voltar ao Início" />

      <section className="bg-navy text-offwhite py-10 sm:py-14 border-b border-gold/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-gold/30 text-[11px] uppercase tracking-widest text-gold font-medium mb-3">
            <Building2 className="w-3.5 h-3.5 text-gold" />
            Atendimento Presencial e Domiciliar
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-offwhite">
            Unidades de Atendimento
          </h1>
          <p className="text-offwhite/80 text-xs sm:text-sm max-w-xl mx-auto mt-3 leading-relaxed">
            Estrutura preparada no Farol de São Thomé e no Edifício Platinum,
            além de modalidade Home Care planejada.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        {units.map((unit) => {
          const unitProcedures = procedures.filter((p) =>
            p.unit_ids?.includes(unit.id)
          );
          const waDigits = (unit.whatsapp_phone || "").replace(/\D/g, "");

          return (
            <div
              key={unit.id}
              id={unit.slug}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-offwhite-border shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                    {unit.modality === "domiciliar"
                      ? "Modalidade Domiciliar"
                      : "Consultório Presencial"}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy mt-0.5">
                    {unit.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate mt-1">
                    {unit.neighborhood_city}
                  </p>
                </div>

                <Link
                  href={`/agendar?unidade=${encodeURIComponent(unit.slug)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
                >
                  <span>Agendar nesta unidade</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {unit.description && (
                <p className="text-sm text-navy/85 leading-relaxed mb-4">
                  {unit.description}
                </p>
              )}

              <div className="p-4 rounded-2xl bg-offwhite border border-offwhite-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-navy">
                      Localização / Referência
                    </p>
                    <p className="text-xs text-slate mt-0.5">
                      {unit.address_line}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unit.maps_url && (
                    <a
                      href={unit.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border text-xs font-semibold transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-terracotta" />
                      <span>Abrir no Google Maps</span>
                    </a>
                  )}
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                        `Olá! Gostaria de falar com o atendimento da unidade ${unit.name}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs font-semibold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-gold" />
                      <span>WhatsApp da Unidade</span>
                    </a>
                  )}
                </div>
              </div>

              {unitProcedures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
                    <span>Procedimentos disponíveis nesta unidade</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unitProcedures.map((proc) => (
                      <Link
                        key={proc.id}
                        href={`/agendar?procedimento=${encodeURIComponent(
                          proc.slug
                        )}&unidade=${encodeURIComponent(unit.slug)}`}
                        className="text-xs px-3 py-1.5 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy border border-offwhite-border transition-colors font-medium"
                      >
                        {proc.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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

