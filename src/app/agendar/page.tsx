import React from "react";
import { getPublicSiteBundle } from "@/lib/repositories";
import { pullAllTablesFromTurso } from "@/lib/turso-sync";
import { getSaoPauloNow } from "@/lib/availability";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PublicFooter } from "@/components/PublicFooter";
import { BookingWizard } from "@/components/BookingWizard";
import { WhatsAppDirectBookingConcierge } from "@/components/WhatsAppDirectBookingConcierge";
import { CalendarCheck, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ procedimento?: string; unidade?: string }>;
}) {
  const sp = await searchParams;
  await pullAllTablesFromTurso();
  const { settings, procedures, units } = getPublicSiteBundle();
  const { todayStr } = getSaoPauloNow();

  const isWhatsappDirect =
    settings.booking_mode === "whatsapp_direct" ||
    !Boolean(settings.online_booking_enabled);

  return (
    <div className="min-h-screen flex flex-col bg-offwhite">
      <PublicHeaderNav
        backHref="/"
        backLabel="Voltar ao Início"
        showBookCta={false}
      />

      <section className="bg-navy text-offwhite py-8 sm:py-10 border-b border-gold/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img
            src={settings.avatar_url || "/images/fernanda-portrait.svg"}
            alt={settings.professional_name}
            className="w-20 h-20 rounded-full mx-auto border-2 border-gold object-cover shadow-luxury mb-3"
          />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-gold/30 text-[11px] uppercase tracking-widest text-gold font-medium mb-2">
            {isWhatsappDirect ? (
              <>
                <MessageCircle className="w-3.5 h-3.5 text-gold" />
                Atendimento Oficial via WhatsApp
              </>
            ) : (
              <>
                <CalendarCheck className="w-3.5 h-3.5 text-gold" />
                Agenda Online Integrada
              </>
            )}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-offwhite">
            {isWhatsappDirect
              ? "Atendimento & Agendamento"
              : "Agende seu Procedimento"}
          </h1>
          <p className="text-offwhite/80 text-xs sm:text-sm max-w-lg mx-auto mt-1.5">
            {settings.professional_name} • {settings.professional_subtitle}
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        {isWhatsappDirect ? (
          <WhatsAppDirectBookingConcierge
            settings={settings}
            procedures={procedures}
            units={units}
            initialProcedureSlug={sp?.procedimento}
            initialUnitSlug={sp?.unidade}
          />
        ) : (
          <BookingWizard
            procedures={procedures}
            units={units}
            settings={settings}
            initialProcedureSlug={sp?.procedimento}
            initialUnitSlug={sp?.unidade}
            todayStr={todayStr}
          />
        )}
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

