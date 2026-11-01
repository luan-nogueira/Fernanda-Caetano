import React from "react";
import Link from "next/link";
import { getPublicSiteBundle } from "@/lib/repositories";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import {
  ArrowRight,
  Clock,
  MapPin,
  Home,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatPriceBRL(cents: number | null, show: boolean | number) {
  if (!show || cents === null || cents === undefined) return null;
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ProcedimentosPage() {
  const { settings, categories, procedures } = getPublicSiteBundle();

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav backHref="/" backLabel="Voltar ao Início" />

      <section className="bg-navy text-offwhite py-10 sm:py-14 border-b border-gold/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-gold/30 text-[11px] uppercase tracking-widest text-gold font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Catálogo Oficial de Cuidados
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-offwhite">
            Procedimentos & Especialidades
          </h1>
          <p className="text-offwhite/80 text-xs sm:text-sm max-w-xl mx-auto mt-3 leading-relaxed">
            Protocolos conduzidos por {settings.professional_name} com foco em
            segurança do paciente, reabilitação tecidual e estética avançada.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-12">
        {categories.map((cat) => {
          const catProcs = procedures.filter((p) => p.category_id === cat.id);
          if (catProcs.length === 0) return null;

          return (
            <section key={cat.id} className="space-y-4">
              <div className="border-b border-offwhite-border pb-3">
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-xs sm:text-sm text-slate mt-0.5">
                    {cat.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catProcs.map((proc) => {
                  const priceLabel = formatPriceBRL(
                    proc.price_cents,
                    proc.show_price
                  );
                  return (
                    <div
                      key={proc.id}
                      className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card hover:shadow-luxury transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-navy/5 text-navy">
                            {proc.modality === "domiciliar" ? (
                              <>
                                <Home className="w-3.5 h-3.5 text-terracotta" />
                                <span>Domiciliar (Home Care)</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-terracotta" />
                                <span>Presencial em Consultório</span>
                              </>
                            )}
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate">
                            <Clock className="w-3.5 h-3.5 text-gold-dark" />
                            <span>{proc.duration_minutes} min</span>
                          </span>
                        </div>

                        <Link
                          href={`/procedimentos/${proc.slug}`}
                          className="font-serif text-xl font-semibold text-navy hover:text-terracotta transition-colors block"
                        >
                          {proc.name}
                        </Link>

                        <p className="text-xs sm:text-sm text-slate mt-2 leading-relaxed">
                          {proc.short_description}
                        </p>

                        {/* Unidades onde é realizado */}
                        {proc.units && proc.units.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {proc.units.map((u) => (
                              <span
                                key={u.id}
                                className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-offwhite text-navy border border-offwhite-border"
                              >
                                {u.short_name}
                              </span>
                            ))}
                          </div>
                        )}

                        {priceLabel && (
                          <p className="mt-3 text-sm font-semibold text-navy">
                            Investimento: {priceLabel}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-offwhite-border flex items-center justify-between gap-3">
                        <Link
                          href={`/procedimentos/${proc.slug}`}
                          className="text-xs font-semibold text-navy hover:text-terracotta transition-colors"
                        >
                          Ver detalhes e orientações
                        </Link>

                        {Boolean(proc.online_booking_enabled) ? (
                          <Link
                            href={`/agendar?procedimento=${encodeURIComponent(
                              proc.slug
                            )}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm transition-all"
                          >
                            <span>Agendar este procedimento</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-slate">
                            Sob consulta via WhatsApp
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="bg-navy text-offwhite rounded-2xl p-6 border border-gold/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif text-lg font-semibold">
                Atendimento ético e individualizado
              </h3>
              <p className="text-xs text-offwhite/80 mt-0.5">
                Todos os procedimentos passam por avaliação profissional de
                enfermagem dermatológica e estética, respeitando as indicações e
                necessidades de cada paciente.
              </p>
            </div>
          </div>
          <Link
            href="/agendar"
            className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all"
          >
            <span>Iniciar agendamento</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
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

