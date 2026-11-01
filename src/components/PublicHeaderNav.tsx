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
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-offwhite/90 hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gold" />
          <span>{backLabel}</span>
        </Link>

        <Link href="/" className="text-center group">
          <span className="font-serif text-lg sm:text-xl font-semibold tracking-wide text-offwhite group-hover:text-gold transition-colors">
            Fernanda Caetano
          </span>
        </Link>

        <div className="flex items-center gap-2">
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

