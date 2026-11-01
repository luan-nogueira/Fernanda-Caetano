"use client";

import React, { useEffect, useState } from "react";
import { SiteSettings } from "@/types/domain";
import { Check, Lock, Save, Settings, ShieldCheck } from "lucide-react";

export default function AdminConfiguracoesPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string;
    professional_title: string;
    registration_number: string;
    whatsapp_phone: string;
    receive_whatsapp_alerts: number;
    email: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/site").then((r) => r.json()),
      fetch("/api/admin/overview").then((r) => r.json()),
    ]).then(([siteData, ovData]) => {
      if (siteData.settings) setSettings(siteData.settings);
      if (ovData.adminProfile) setProfile(ovData.adminProfile);
    });
  }, []);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSaveBookingRules(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish_settings", settings }),
    });
    notify("Regras gerais de agendamento e privacidade salvas!");
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await fetch("/api/admin/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_profile",
        ...profile,
        new_password: newPassword || undefined,
      }),
    });
    setNewPassword("");
    notify("Perfil administrativo e credenciais atualizados!");
  }

  if (!settings || !profile) {
    return (
      <div className="py-12 text-center text-sm text-slate">
        Carregando Configurações...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
          Parâmetros Globais & Segurança
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
          Configurações do Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate mt-0.5">
          Controle o modo de confirmação de agendamentos, antecedência mínima,
          política LGPD e senha de acesso.
        </p>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Regras do Motor de Agendamento */}
        <form
          onSubmit={handleSaveBookingRules}
          className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-offwhite-border pb-3">
            <Settings className="w-5 h-5 text-terracotta" />
            <h2 className="font-serif text-2xl font-semibold text-navy">
              Motor de Agendamento Online
            </h2>
          </div>

          <label className="flex items-center gap-2.5 text-sm font-semibold text-navy cursor-pointer p-3.5 rounded-2xl bg-offwhite">
            <input
              type="checkbox"
              checked={Boolean(settings.online_booking_enabled)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  online_booking_enabled: e.target.checked ? 1 : 0,
                })
              }
              className="w-4 h-4 accent-terracotta"
            />
            <span>Receber agendamentos online pela página pública</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Modo Padrão de Confirmação
            </label>
            <select
              value={settings.booking_mode}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  booking_mode: e.target.value as "automatic" | "approval",
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
            >
              <option value="automatic">
                Confirmação Automática (Exceto Home Care)
              </option>
              <option value="approval">
                Solicitação Pendente de Aprovação pela Profissional
              </option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Antecedência mín. (h)
              </label>
              <input
                type="number"
                min={0}
                value={settings.min_advance_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_advance_hours: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Limite máx. (dias)
              </label>
              <input
                type="number"
                min={7}
                value={settings.max_advance_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_advance_days: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Escala slots (min)
              </label>
              <select
                value={settings.slot_interval_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    slot_interval_minutes: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-dark" />
              <span>Texto da Política de Privacidade & LGPD</span>
            </label>
            <textarea
              rows={4}
              value={settings.privacy_policy_text}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  privacy_policy_text: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-xs text-navy"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Regras de Agendamento</span>
          </button>
        </form>

        {/* Credenciais e Perfil da Profissional */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-offwhite-border pb-3">
            <Lock className="w-5 h-5 text-terracotta" />
            <h2 className="font-serif text-2xl font-semibold text-navy">
              Perfil & Segurança do Administrador
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              E-mail de Login
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border bg-offwhite text-sm text-slate"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Nome Completo da Profissional
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Registro Profissional (COREN)
            </label>
            <input
              type="text"
              value={profile.registration_number || ""}
              onChange={(e) =>
                setProfile({ ...profile, registration_number: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Alterar Senha Administrativa (Deixe em branco para manter a atual)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mínimo 6 caracteres)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs font-semibold"
          >
            <Save className="w-4 h-4 text-gold" />
            <span>Atualizar Perfil e Senha</span>
          </button>
        </form>
      </div>
    </div>
  );
}

