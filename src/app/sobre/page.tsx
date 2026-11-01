import React from "react";
import Link from "next/link";
import { getPublicSiteBundle } from "@/lib/repositories";
import { pullAllTablesFromTurso } from "@/lib/turso-sync";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import {
  Award,
  CalendarCheck,
  CheckCircle2,
  Instagram,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SobrePage() {
  await pullAllTablesFromTurso();
  const { settings } = getPublicSiteBundle();

  let highlights: Array<{ title: string; description: string }> = [];
  try {
    highlights = JSON.parse(settings.about_highlights_json || "[]");
  } catch {
    highlights = [];
  }

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav backHref="/" backLabel="Voltar ao Início" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl overflow-hidden border border-offwhite-border shadow-luxury">
          <div className="bg-navy text-offwhite p-6 sm:p-10 border-b border-gold/30 flex flex-col sm:flex-row items-center gap-6">
            <img
              src={settings.avatar_url || "/images/fernanda-portrait.svg"}
              alt={settings.professional_name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-gold object-cover shrink-0 bg-navy"
            />
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-gold font-semibold">
                <Award className="w-3.5 h-3.5" />
                Conheça a Profissional
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold mt-1">
                {settings.professional_name}
              </h1>
              <p className="text-gold text-sm sm:text-base font-medium mt-1">
                {settings.professional_subtitle}
              </p>
              <p className="text-xs text-offwhite/80 mt-2">
                {settings.professional_bio}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-navy mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-terracotta" />
                <span>Trajetória e Filosofia de Cuidado</span>
              </h2>
              <p className="text-sm sm:text-base text-navy/85 leading-relaxed whitespace-pre-line">
                {settings.about_full_text}
              </p>
            </div>

            {highlights.length > 0 && (
              <div className="grid grid-cols-1 gap-4 pt-4">
                {highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-offwhite border border-offwhite-border flex items-start gap-3.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-navy">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-offwhite-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-navy hover:text-terracotta transition-colors"
              >
                <Instagram className="w-4 h-4 text-terracotta" />
                <span>Acompanhe no Instagram ({settings.instagram_handle})</span>
              </a>

              <Link
                href="/agendar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white text-sm font-semibold shadow-sm transition-all"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Agendar atendimento</span>
              </Link>
            </div>
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

