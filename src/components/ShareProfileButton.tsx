"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareProfileButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} — Agendamento Online e Procedimentos`,
          url,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Compartilhar página"
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-offwhite border border-gold/30 text-xs font-medium transition-all duration-200 backdrop-blur-sm"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-gold" />
          <span>Link copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-gold" />
          <span>Compartilhar</span>
        </>
      )}
    </button>
  );
}

