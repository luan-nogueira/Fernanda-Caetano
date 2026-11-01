import React from "react";
import Link from "next/link";
import {
  getPublicSiteBundle,
  resolveCustomLinkHref,
} from "@/lib/repositories";
import { pullAllTablesFromTurso } from "@/lib/turso-sync";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ShareProfileButton } from "@/components/ShareProfileButton";
import { PublicFooter } from "@/components/PublicFooter";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const sp = await searchParams;
  const isPreview = sp?.preview === "1";
  await pullAllTablesFromTurso();
  const bundle = getPublicSiteBundle({ previewDraft: isPreview });
  const { settings, sections, links, units, procedures } = bundle;

  const visibleSections = sections.filter((s) => Boolean(s.is_visible));

  let highlights: Array<{ title: string; description: string }> = [];
  try {
    highlights = JSON.parse(settings.about_highlights_json || "[]");
  } catch {
    highlights = [];
  }

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      {isPreview && (
        <div className="bg-terracotta text-white text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span>
            Modo de Pré-visualização (Rascunho do Administrador) — Verifique o
            visual antes de publicar no Painel.
          </span>
        </div>
      )}

      {/* HERO / CABEÇALHO PREMIUM */}
      <section className="relative overflow-hidden bg-navy text-offwhite pt-6 pb-12 sm:pt-10 sm:pb-16 border-b border-gold/30">
        {/* Decorative subtle radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[320px] rounded-full bg-gold/10 blur-3xl"
        />

        <div className="relative max-w-xl mx-auto px-5">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-gold/30 text-[11px] uppercase tracking-widest text-gold font-medium">
              <Sparkles className="w-3 h-3 text-gold" />
              {settings.hero_badge}
            </span>
            <ShareProfileButton title={settings.professional_name} />
          </div>

          {/* Profile Avatar + Identity */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-gold-dark via-gold to-gold-light shadow-luxury">
                <img
                  src={settings.avatar_url || "/images/fernanda-portrait.svg"}
                  alt={settings.professional_name}
                  className="w-full h-full rounded-full object-cover bg-navy"
                />
              </div>
              <span
                title="Agendamento Online Disponível"
                className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-terracotta border-2 border-navy flex items-center justify-center shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-offwhite mb-1.5">
              {settings.professional_name}
            </h1>

            <p className="text-gold text-sm sm:text-base font-medium tracking-wide mb-3">
              {settings.professional_subtitle}
            </p>

            <p className="text-offwhite/80 text-xs sm:text-sm leading-relaxed max-w-md">
              {settings.professional_bio}
            </p>
          </div>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL ORDENADO DINAMICAMENTE PELAS SEÇÕES */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-5 -mt-6 pb-16 space-y-12 relative z-10">
        {visibleSections.map((section) => {
          // SEÇÃO 1: BOTÕES PRINCIPAIS DA PÁGINA PÚBLICA
          if (section.id === "links") {
            return (
              <section key={section.id} id="links" className="space-y-3">
                {links.map((link) => {
                  const { href, external } = resolveCustomLinkHref(
                    link,
                    units,
                    procedures
                  );

                  const isPrimaryCta = link.style_variant === "primary_cta";
                  const isNavy = link.style_variant === "navy";
                  const isGoldOutline = link.style_variant === "outline_gold";

                  const cardClasses = isPrimaryCta
                    ? "bg-terracotta hover:bg-terracotta-dark text-white border-terracotta shadow-luxury hover:shadow-luxury-hover"
                    : isNavy
                    ? "bg-navy hover:bg-navy-800 text-offwhite border-gold/30 shadow-card hover:shadow-luxury"
                    : isGoldOutline
                    ? "bg-white hover:bg-gold-50/60 text-navy border-gold/60 shadow-card hover:shadow-luxury"
                    : "bg-white hover:bg-offwhite-warm/60 text-navy border-offwhite-border shadow-card hover:shadow-luxury";

                  const iconBoxClasses = isPrimaryCta
                    ? "bg-white/20 text-white"
                    : isNavy
                    ? "bg-white/10 text-gold"
                    : "bg-navy/5 text-navy group-hover:bg-terracotta/10 group-hover:text-terracotta";

                  const subtitleClasses = isPrimaryCta
                    ? "text-white/90"
                    : isNavy
                    ? "text-offwhite/75"
                    : "text-slate";

                  const content = (
                    <div
                      className={`group relative flex items-center justify-between gap-3.5 p-4 sm:px-5 sm:py-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${cardClasses}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconBoxClasses}`}
                        >
                          <DynamicIcon
                            name={link.icon_name}
                            className="w-5 h-5"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm sm:text-base leading-snug">
                              {link.title}
                            </span>
                            {link.badge_text && (
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isPrimaryCta
                                    ? "bg-white/25 text-white"
                                    : "bg-gold/20 text-navy border border-gold/40"
                                }`}
                              >
                                {link.badge_text}
                              </span>
                            )}
                          </div>
                          {link.subtitle && (
                            <p
                              className={`text-xs mt-0.5 line-clamp-1 ${subtitleClasses}`}
                            >
                              {link.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <ChevronRight
                          className={`w-5 h-5 transition-transform duration-200 group-hover:translate-x-1 ${
                            isPrimaryCta
                              ? "text-white"
                              : isNavy
                              ? "text-gold"
                              : "text-slate group-hover:text-navy"
                          }`}
                        />
                      </div>
                    </div>
                  );

                  if (external) {
                    return (
                      <a
                        key={link.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link key={link.id} href={href} className="block">
                      {content}
                    </Link>
                  );
                })}
              </section>
            );
          }

          // SEÇÃO 2: PROCEDIMENTOS EM DESTAQUE
          if (section.id === "featured_procedures") {
            const featured = procedures.slice(0, 6);
            return (
              <section key={section.id} id="procedimentos" className="pt-2">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                      Especialidades
                    </span>
                    <h2 className="font-serif text-2xl font-semibold text-navy">
                      {section.title}
                    </h2>
                    {section.subtitle && (
                      <p className="text-xs text-slate mt-0.5">
                        {section.subtitle}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/procedimentos"
                    className="text-xs font-semibold text-navy hover:text-terracotta inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Ver todos ({procedures.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {featured.map((proc) => (
                    <div
                      key={proc.id}
                      className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card hover:shadow-luxury transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-navy/5 text-navy">
                            {proc.category_name || "Procedimento"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate">
                            <Clock className="w-3 h-3 text-gold-dark" />
                            {proc.duration_minutes} min
                          </span>
                        </div>
                        <Link
                          href={`/procedimentos/${proc.slug}`}
                          className="font-serif text-lg font-semibold text-navy hover:text-terracotta transition-colors line-clamp-1"
                        >
                          {proc.name}
                        </Link>
                        <p className="text-xs text-slate mt-1 line-clamp-2 leading-relaxed">
                          {proc.short_description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-offwhite-border flex items-center justify-between gap-2">
                        <Link
                          href={`/procedimentos/${proc.slug}`}
                          className="text-xs font-medium text-slate hover:text-navy transition-colors"
                        >
                          Saiba mais
                        </Link>
                        <Link
                          href={`/agendar?procedimento=${encodeURIComponent(
                            proc.slug
                          )}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-navy hover:bg-terracotta text-white text-xs font-semibold transition-colors"
                        >
                          <span>Agendar</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // SEÇÃO 3: UNIDADES DE ATENDIMENTO
          if (section.id === "units") {
            return (
              <section key={section.id} id="unidades" className="pt-2">
                <div className="mb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                    Locais de Atendimento
                  </span>
                  <h2 className="font-serif text-2xl font-semibold text-navy">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="text-xs text-slate mt-0.5">
                      {section.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {units.map((unit) => {
                    const waDigits = (unit.whatsapp_phone || "").replace(
                      /\D/g,
                      ""
                    );
                    return (
                      <div
                        key={unit.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-offwhite-border shadow-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif text-lg font-semibold text-navy">
                                {unit.name}
                              </h3>
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/15 text-navy border border-gold/30">
                                {unit.modality === "domiciliar"
                                  ? "Domiciliar"
                                  : "Presencial"}
                              </span>
                            </div>
                            <p className="text-xs text-slate mt-1">
                              {unit.neighborhood_city}
                            </p>
                            <p className="text-xs text-navy/80 mt-0.5">
                              {unit.address_line}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-offwhite-border flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {unit.maps_url && (
                              <a
                                href={unit.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy text-xs font-medium transition-colors"
                              >
                                <MapPin className="w-3.5 h-3.5 text-terracotta" />
                                <span>Mapa</span>
                              </a>
                            )}
                            {waDigits && (
                              <a
                                href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                                  `Olá! Gostaria de informações sobre atendimento na unidade ${unit.name}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy text-xs font-medium transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-terracotta" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>

                          <Link
                            href={`/agendar?unidade=${encodeURIComponent(
                              unit.slug
                            )}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-colors"
                          >
                            <span>Agendar nesta unidade</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          // SEÇÃO 4: SOBRE A PROFISSIONAL
          if (section.id === "about") {
            return (
              <section key={section.id} id="sobre" className="pt-2">
                <div className="bg-navy text-offwhite rounded-3xl p-6 sm:p-7 border border-gold/30 shadow-luxury">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-gold">
                    Apresentação Profissional
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1 mb-3">
                    {section.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-offwhite/85 leading-relaxed mb-5">
                    {settings.about_full_text}
                  </p>

                  {highlights.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {highlights.map((h, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-white/5 border border-gold/20"
                        >
                          <h3 className="text-sm font-semibold text-gold">
                            {h.title}
                          </h3>
                          <p className="text-xs text-offwhite/80 mt-0.5 leading-relaxed">
                            {h.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <Link
                      href="/sobre"
                      className="text-xs font-medium text-gold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Conhecer trajetória completa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/agendar"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-colors"
                    >
                      <span>Agendar avaliação</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </section>
            );
          }

          return null;
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

