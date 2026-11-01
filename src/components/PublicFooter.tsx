import React from "react";
import Link from "next/link";
import { Instagram, Lock, ShieldCheck } from "lucide-react";

export function PublicFooter({
  professionalName = "Fernanda Caetano",
  subtitle = "Enfermeira Dermatológica e Esteta",
  instagramUrl = "https://www.instagram.com/enfernandacaetano/",
  instagramHandle = "@enfernandacaetano",
}: {
  professionalName?: string;
  subtitle?: string;
  instagramUrl?: string;
  instagramHandle?: string;
}) {
  return (
    <footer className="mt-auto border-t border-offwhite-border bg-white/80 text-navy">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate">
        <div className="text-center sm:text-left">
          <p className="font-serif text-base font-semibold text-navy">
            {professionalName}
          </p>
          <p className="text-xs text-slate">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/procedimentos"
            className="hover:text-navy transition-colors font-medium"
          >
            Procedimentos
          </Link>
          <Link
            href="/unidades"
            className="hover:text-navy transition-colors font-medium"
          >
            Unidades
          </Link>
          <Link
            href="/sobre"
            className="hover:text-navy transition-colors font-medium"
          >
            Sobre
          </Link>
          <Link
            href="/privacidade"
            className="inline-flex items-center gap-1 hover:text-navy transition-colors font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-gold-dark" />
            <span>Privacidade & LGPD</span>
          </Link>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-navy font-medium hover:text-terracotta transition-colors"
          >
            <Instagram className="w-3.5 h-3.5 text-terracotta" />
            <span>{instagramHandle}</span>
          </a>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-slate/70 hover:text-navy transition-colors"
            title="Acesso Administrativo"
          >
            <Lock className="w-3 h-3" />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

