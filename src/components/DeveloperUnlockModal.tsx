"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, X, Check, Loader2 } from "lucide-react";

interface DeveloperUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (key: string) => void;
}

export function DeveloperUnlockModal({
  isOpen,
  onClose,
  onSuccess,
}: DeveloperUnlockModalProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/developer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("fc_dev_unlocked_key", key.trim());
        onSuccess(key.trim());
        onClose();
      } else {
        setError(data.error || "Chave mestra de desenvolvedor incorreta.");
      }
    } catch {
      setError("Erro ao validar credencial. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-luxury border border-gold/40 relative text-navy space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-offwhite text-slate transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-navy text-gold flex items-center justify-center shadow-md">
            <Lock className="w-5 h-5 text-gold" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-dark">
              Área Restrita ao Desenvolvedor
            </span>
            <h3 className="font-serif text-xl font-semibold text-navy">
              Desbloqueio de Recursos (Luan)
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate leading-relaxed">
          A alteração do modo de operação (liberação da Agenda Online Automatizada
          e Robô de WhatsApp) é restrita ao desenvolvedor responsável para controle de plano.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-terracotta" />
              <span>Chave Mestra do Desenvolvedor</span>
            </label>
            <input
              type="password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Digite a senha ou PIN mestra..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy font-mono focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-offwhite-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-offwhite hover:bg-offwhite-warm text-slate text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-gold" />
                  <span>Desbloquear</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
