import React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Shield } from "lucide-react";

export function PublicHeaderNav({
  backHref = "/",
  backLabel = "Início",
  showBookCta = true,
}: {
  backHref?: string;
  backLabel?: string;
  showBookCta?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur-md border-b border-gold/20 text-offwhite">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 min-h-[64px] py-2 flex items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-offwhite/90 hover:text-gold transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-gold shrink-0" />
          <span>{backLabel}</span>
        </Link>

        <Link href="/" className="text-center group min-w-0 px-1">
          <span className="font-serif text-base sm:text-xl font-semibold tracking-wide text-offwhite group-hover:text-gold transition-colors block truncate">
            Fernanda Caetano
          </span>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {showBookCta ? (
            <Link
              href="/agendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm transition-all"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Agendar</span>
            </Link>
          ) : (
            <Link
              href="/privacidade"
              className="inline-flex items-center gap-1 text-xs text-offwhite/70 hover:text-gold transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-gold" />
              <span className="hidden sm:inline">Privacidade</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

