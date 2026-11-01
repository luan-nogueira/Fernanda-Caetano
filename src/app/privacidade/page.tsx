import React from "react";
import { getPublicSiteBundle } from "@/lib/repositories";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import { ShieldCheck, Lock, FileCheck2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PrivacidadePage() {
  const { settings } = getPublicSiteBundle();

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav backHref="/" backLabel="Voltar ao Início" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-offwhite-border shadow-card space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-navy text-gold flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                Proteção de Dados e Conformidade
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                Política de Privacidade & LGPD
              </h1>
            </div>
          </div>

          <p className="text-sm text-navy/85 leading-relaxed whitespace-pre-line">
            {settings.privacy_policy_text}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-offwhite border border-offwhite-border">
              <div className="flex items-center gap-2 text-navy font-semibold text-sm mb-1.5">
                <Lock className="w-4 h-4 text-terracotta" />
                <span>Minimização de Dados</span>
              </div>
              <p className="text-xs text-slate leading-relaxed">
                Solicitamos apenas nome completo, WhatsApp com DDD e e-mail
                opcional para fins de gestão de horários. Não coletamos fotos
                clínicas, exames ou prontuários na plataforma de agendamento.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-offwhite border border-offwhite-border">
              <div className="flex items-center gap-2 text-navy font-semibold text-sm mb-1.5">
                <FileCheck2 className="w-4 h-4 text-terracotta" />
                <span>Direitos do Titular</span>
              </div>
              <p className="text-xs text-slate leading-relaxed">
                O titular pode solicitar a confirmação, correção, atualização ou
                exclusão de seus dados de contato a qualquer momento pelos
                canais oficiais de atendimento das unidades.
              </p>
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

