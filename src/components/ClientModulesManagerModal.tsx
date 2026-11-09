"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Check,
  Zap,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  ADMIN_MODULES,
  PRESET_ESSENCIAL,
  PRESET_COMPLETO,
  AdminModuleItem,
} from "@/lib/modules-config";

interface ClientModulesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModules: Record<string, boolean>;
  onModulesSaved: (newModules: Record<string, boolean>) => void;
}

export function ClientModulesManagerModal({
  isOpen,
  onClose,
  currentModules,
  onModulesSaved,
}: ClientModulesManagerModalProps) {
  const [modules, setModules] = useState<Record<string, boolean>>({
    ...currentModules,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sincroniza sempre que abrir
  React.useEffect(() => {
    if (isOpen) {
      setModules({ ...currentModules });
      setFeedback(null);
    }
  }, [isOpen, currentModules]);

  if (!isOpen) return null;

  function handleToggle(id: string) {
    if (id === "dashboard") return; // Dashboard sempre ativo
    setModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function applyPreset(preset: Record<string, boolean>) {
    setModules({ ...preset });
    setFeedback({
      type: "success",
      message: "Preset aplicado na seleção! Clique em 'Salvar Alterações' para gravar.",
    });
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_client_modules",
          modules,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Erro ao salvar módulos do cliente.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Módulos atualizados com sucesso no banco de dados e nuvem!",
      });
      onModulesSaved(data.modules || modules);

      // Dispara evento global para outros componentes se atualizarem
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fc-modules-updated", {
            detail: data.modules || modules,
          })
        );
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setFeedback({
        type: "error",
        message: "Erro de comunicação ao salvar módulos.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Contagem
  const activeCount = Object.values(modules).filter(Boolean).length;
  const totalCount = ADMIN_MODULES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-offwhite-border overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="bg-navy text-white px-6 py-5 flex items-center justify-between border-b border-gold/25 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-terracotta/20 border border-terracotta/40 flex items-center justify-center text-terracotta">
              <Sliders className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-white">
                  Controle de Funções da Fernanda
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-gold/20 text-gold-light border border-gold/30">
                  Master Dev (Luan)
                </span>
              </div>
              <p className="text-xs text-white/70">
                Ative ou desative itens da barra lateral para a conta da Fernanda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Presets Rápidos */}
        <div className="bg-offwhite-card px-6 py-3.5 border-b border-offwhite-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate">
            <Sparkles className="w-4 h-4 text-terracotta" />
            <span className="font-semibold text-navy">Presets Rápidos:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset(PRESET_ESSENCIAL)}
              className="px-3 py-1.5 rounded-xl bg-white border border-offwhite-border hover:border-terracotta hover:bg-terracotta/5 text-xs font-semibold text-navy transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-terracotta" />
              <span>Plano Essencial (WhatsApp + Cursos)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset(PRESET_COMPLETO)}
              className="px-3 py-1.5 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gold" />
              <span>Plano Completo (Tudo Ativo)</span>
            </button>
          </div>
        </div>

        {/* Lista de Módulos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-offwhite-border text-xs text-slate">
            <span>
              Exibindo <strong>{ADMIN_MODULES.length}</strong> módulos da barra lateral
            </span>
            <span className="font-medium text-navy">
              {activeCount} de {totalCount} ativos para a cliente
            </span>
          </div>

          <div className="space-y-2.5">
            {ADMIN_MODULES.map((mod: AdminModuleItem) => {
              const isEnabled = mod.alwaysEnabled ? true : modules[mod.id] !== false;
              const isLocked = mod.alwaysEnabled;

              return (
                <div
                  key={mod.id}
                  onClick={() => !isLocked && handleToggle(mod.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isLocked
                      ? "bg-slate-50 border-slate-200 cursor-default opacity-90"
                      : isEnabled
                      ? "bg-white border-offwhite-border hover:border-gold/60 shadow-xs cursor-pointer"
                      : "bg-red-50/40 border-red-200/60 hover:border-red-300 cursor-pointer"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isEnabled
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {isEnabled ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-navy">
                          {mod.label}
                        </span>
                        {mod.badge && (
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-navy text-gold-light">
                            {mod.badge}
                          </span>
                        )}
                        {mod.alwaysEnabled && (
                          <span className="text-[10px] font-medium text-slate uppercase bg-slate-200 px-1.5 py-0.5 rounded">
                            Obrigatório
                          </span>
                        )}
                        {!isEnabled && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                            Oculto p/ Fernanda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate line-clamp-1 mt-0.5">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isLocked}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-emerald-500" : "bg-slate-300"
                      } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {feedback.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="bg-offwhite-card px-6 py-4 border-t border-offwhite-border flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate">
            Alterações são salvas diretamente no banco e na nuvem.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-offwhite-border hover:bg-slate-100 text-xs font-semibold text-slate transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

