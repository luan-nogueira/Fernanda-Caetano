"use client";

import React, { useEffect, useRef, useState } from "react";
import { SiteSettings } from "@/types/domain";
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import { DeveloperUnlockModal } from "@/components/DeveloperUnlockModal";
import { ClientModulesManagerModal } from "@/components/ClientModulesManagerModal";
import {
  PRESET_ESSENCIAL,
  parseClientModules,
} from "@/lib/modules-config";
import {
  Camera,
  Check,
  Lock,
  Save,
  Settings,
  ShieldCheck,
  MessageCircle,
  CalendarCheck,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Sliders,
} from "lucide-react";

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
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [clientModules, setClientModules] = useState<Record<string, boolean>>(
    PRESET_ESSENCIAL
  );
  const [devKey, setDevKey] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function handleSelectAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCropperSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleConfirmCroppedAvatar(croppedDataUrl: string) {
    setCropperSrc(null);
    setSettings((prev) =>
      prev ? { ...prev, avatar_url: croppedDataUrl } : prev
    );
    try {
      await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_avatar",
          avatar_url: croppedDataUrl,
          avatarUrl: croppedDataUrl,
        }),
      });
      window.dispatchEvent(
        new CustomEvent("fernanda-avatar-updated", { detail: croppedDataUrl })
      );
      notify("Foto de perfil atualizada em todo o site e painel!");
    } catch (e) {
      console.error("Erro ao atualizar foto:", e);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/site").then((r) => r.json()),
      fetch("/api/admin/overview").then((r) => r.json()),
    ]).then(([siteData, ovData]) => {
      if (siteData.settings) {
        setSettings(siteData.settings);
        if (siteData.settings.client_enabled_modules_json) {
          setClientModules(
            parseClientModules(siteData.settings.client_enabled_modules_json)
          );
        }
      }
      if (ovData.adminProfile) setProfile(ovData.adminProfile);
      if (siteData.currentUser) setCurrentUser(siteData.currentUser);
      else if (ovData.currentUser) setCurrentUser(ovData.currentUser);

      const savedKey = typeof window !== "undefined"
        ? sessionStorage.getItem("fc_dev_unlocked_key")
        : null;
      if (savedKey) setDevKey(savedKey);
    });

    function handleModulesEvent(e: Event) {
      const custom = e as CustomEvent<Record<string, boolean>>;
      if (custom.detail) {
        setClientModules(custom.detail);
      }
    }
    window.addEventListener("fc-modules-updated", handleModulesEvent);
    return () => {
      window.removeEventListener("fc-modules-updated", handleModulesEvent);
    };
  }, []);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const isSuperAdmin =
    currentUser?.role === "superadmin" ||
    currentUser?.email?.toLowerCase() === "luanmnogueira@gmail.com" ||
    Boolean(devKey);

  async function handleSaveBookingRules(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const res = await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish_settings",
        settings,
        developer_key: devKey || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error || "Erro ao salvar configurações.");
      return;
    }
    notify("Configurações e modo de operação salvos com sucesso!");
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

  const isWhatsappDirect = settings.booking_mode === "whatsapp_direct";
  const currentDirectPhone =
    settings.whatsapp_direct_phone || profile.whatsapp_phone || "5522999990000";

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
          Alterne entre o Modo Essencial (WhatsApp Direto) e o Modo Agenda Completa,
          configure a política de privacidade e credenciais de acesso.
        </p>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* SELETOR PRINCIPAL DE MODO DE OPERAÇÃO DO SITE */}
      <div className="bg-navy text-offwhite rounded-3xl p-6 sm:p-7 border border-gold/40 shadow-luxury space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-offwhite">
              Modo de Operação do Site (Plano do Assinante)
            </h2>
          </div>
          {isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                👑 Desenvolvedor Master ({currentUser?.email || "Luan"})
              </span>
              <button
                type="button"
                onClick={() => setShowModulesModal(true)}
                className="px-3 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-[10px] font-bold text-amber-200 border border-amber-300/30 transition-all flex items-center gap-1"
              >
                <Sliders className="w-3 h-3 text-gold" />
                <span>Gerenciar Módulos</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-gold border border-gold/30">
              🔒 Gerenciado pelo Desenvolvedor (Luan)
            </span>
          )}
        </div>

        {!isSuperAdmin && (
          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-gold/20 text-xs text-offwhite/85 leading-relaxed">
            <span className="font-semibold text-gold">Plano Essencial Ativo:</span> Todos os agendamentos e procedimentos são direcionados diretamente para o WhatsApp oficial com a mensagem pronta. A ativação da Agenda Online Completa e Robô é restrita ao desenvolvedor responsável (Luan Nogueira).
          </div>
        )}

        <p className="text-xs sm:text-sm text-offwhite/85 leading-relaxed">
          {isSuperAdmin
            ? "Como Desenvolvedor Master, você pode alternar entre os modos abaixo a qualquer momento:"
            : "Status dos planos disponíveis na infraestrutura do site:"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Modo Essencial (WhatsApp Direto) */}
          <div
            onClick={() => {
              if (!isSuperAdmin) {
                notify("Configuração gerenciada pelo desenvolvedor responsável.");
                return;
              }
              setSettings({ ...settings, booking_mode: "whatsapp_direct" });
            }}
            className={`p-5 rounded-2xl border transition-all ${
              isSuperAdmin ? "cursor-pointer" : "cursor-default"
            } ${
              isWhatsappDirect
                ? "bg-gradient-to-br from-gold/25 via-gold/10 to-transparent border-gold text-white shadow-md ring-2 ring-gold"
                : "bg-white/5 border-white/10 hover:border-gold/40 text-offwhite/70"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold uppercase tracking-wider">
                <MessageCircle className="w-4 h-4" />
                Modo Essencial (WhatsApp Direto)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Econômico • Sem Robô
              </span>
            </div>
            <p className="text-xs leading-relaxed text-offwhite/90">
              <strong>Ideal para baratear custos:</strong> Desativa a necessidade do
              robô/bot de WhatsApp e do motor complexo de calendário. Todos os
              procedimentos abrem o WhatsApp da Dra. Fernanda com a mensagem pronta.
            </p>
            <ul className="text-[11px] text-offwhite/75 mt-3 space-y-1">
              <li>✓ Apresentação &quot;O Método Dra. Fernanda Caetano&quot; ativa</li>
              <li>✓ Catálogo e explicações de procedimentos ativos</li>
              <li>✓ <strong>Área de Cursos & Alunos 100% ativa</strong></li>
              <li>✓ Zero custo de servidor contínuo de bot</li>
            </ul>
          </div>

          {/* Card 2: Modo Completo (Agenda Online + Robô Baileys) */}
          <div
            onClick={() => {
              if (!isSuperAdmin) {
                notify("O Modo Avançado está inativo no plano contratado. Fale com o desenvolvedor responsável.");
                return;
              }
              setSettings({
                ...settings,
                booking_mode:
                  settings.booking_mode === "whatsapp_direct"
                    ? "automatic"
                    : settings.booking_mode,
              });
            }}
            className={`p-5 rounded-2xl border transition-all ${
              isSuperAdmin ? "cursor-pointer" : "cursor-default"
            } ${
              !isWhatsappDirect
                ? "bg-gradient-to-br from-gold/25 via-gold/10 to-transparent border-gold text-white shadow-md ring-2 ring-gold"
                : "bg-white/5 border-white/10 hover:border-gold/40 text-offwhite/70"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold uppercase tracking-wider">
                <CalendarCheck className="w-4 h-4" />
                Modo Avançado (Agenda Online + Bot)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                {!isSuperAdmin ? "🔒 Bloqueado" : "Completo"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-offwhite/90">
              <strong>Automação Completa:</strong> Ativa o calendário de vagas com
              escolha de horários, salas, bloqueios e disparo automático de
              confirmações e lembretes via robô de WhatsApp.
            </p>
            <ul className="text-[11px] text-offwhite/75 mt-3 space-y-1">
              <li>✓ Calendário de vagas online interativo</li>
              <li>✓ Bloqueio de horários passados e simultâneos</li>
              <li>✓ Confirmações e lembretes automatizados</li>
            </ul>
            {!isSuperAdmin && (
              <p className="text-[11px] text-white/60 mt-3 pt-2 border-t border-white/10 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-gold" />
                <span>Recurso não contratado no plano atual</span>
              </p>
            )}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-gold" />
                <h3 className="text-sm font-bold text-white">
                  Controle Individual de Funções da Barra Lateral
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  Exclusivo Luan
                </span>
              </div>
              <p className="text-xs text-white/75 mt-1">
                Você pode ligar ou desligar individualmente cada uma das abas (Cursos, Procedimentos, WhatsApp, Agenda) para a Fernanda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowModulesModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-navy font-bold text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
            >
              <Sliders className="w-4 h-4 text-navy" />
              <span>Abrir Gerenciador de Módulos</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Parâmetros do Modo Escolhido */}
        <form
          onSubmit={handleSaveBookingRules}
          className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-offwhite-border pb-3">
            <Settings className="w-5 h-5 text-terracotta" />
            <h2 className="font-serif text-2xl font-semibold text-navy">
              {isWhatsappDirect
                ? "Parâmetros do WhatsApp Direto"
                : "Motor de Agendamento Online"}
            </h2>
          </div>

          {isWhatsappDirect ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Número de WhatsApp para Receber Agendamentos
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.whatsapp_direct_phone || profile.whatsapp_phone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsapp_direct_phone: e.target.value,
                      })
                    }
                    placeholder="Ex: 5522999990000"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy font-mono"
                  />
                  <a
                    href={`https://wa.me/${(
                      settings.whatsapp_direct_phone || profile.whatsapp_phone
                    ).replace(/\D/g, "")}?text=${encodeURIComponent(
                      "Olá Dra. Fernanda! Teste de link do WhatsApp direto do site."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-offwhite hover:bg-gold-50 text-navy text-xs font-semibold border border-offwhite-border flex items-center gap-1.5"
                    title="Testar no WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-terracotta" />
                    <span>Testar</span>
                  </a>
                </div>
                <p className="text-[11px] text-slate mt-1">
                  Informe o DDI + DDD + Número (apenas números ou formatado).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Mensagem Modelo Pré-Preenchida no WhatsApp
                </label>
                <textarea
                  rows={3}
                  value={
                    settings.whatsapp_direct_message_template ||
                    "Olá, Dra. Fernanda! Vi o seu site e gostaria de agendar / saber mais sobre: *{procedimento}*."
                  }
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp_direct_message_template: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-xs text-navy"
                />
                <p className="text-[11px] text-slate mt-1">
                  Use <code>&#123;procedimento&#125;</code> para que o site insira automaticamente o nome do procedimento escolhido.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                  Modo de Confirmação da Agenda
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
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-dark" />
              <span>Texto da Política de Privacidade & LGPD</span>
            </label>
            <textarea
              rows={3}
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
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

          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-offwhite">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full border-2 border-gold overflow-hidden shrink-0 group"
              title="Trocar foto de perfil"
            >
              <img
                src={settings.avatar_url || "/images/fernanda-portrait.svg"}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-gold" />
              </span>
            </button>
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-semibold text-navy">Foto de Perfil</p>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Escolher Nova Foto</span>
              </button>
              <p className="text-[11px] text-slate">
                Você pode recortar e ajustar o zoom no formato circular perfeito.
              </p>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSelectAvatarFile}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Nome Completo
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
              Título Profissional
            </label>
            <input
              type="text"
              value={profile.professional_title}
              onChange={(e) =>
                setProfile({ ...profile, professional_title: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Registro COREN
              </label>
              <input
                type="text"
                value={profile.registration_number || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    registration_number: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                WhatsApp Principal
              </label>
              <input
                type="text"
                value={profile.whatsapp_phone}
                onChange={(e) =>
                  setProfile({ ...profile, whatsapp_phone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              E-mail de Login
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-slate bg-offwhite/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Nova Senha (deixe em branco para manter a atual)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs font-semibold shadow-sm transition-all"
          >
            <Save className="w-4 h-4 text-gold" />
            <span>Atualizar Perfil & Credenciais</span>
          </button>
        </form>
      </div>

      <AvatarCropperModal
        isOpen={Boolean(cropperSrc)}
        imageSrc={cropperSrc}
        onClose={() => setCropperSrc(null)}
        onConfirmCrop={handleConfirmCroppedAvatar}
      />

      <DeveloperUnlockModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        onSuccess={(key) => {
          setDevKey(key);
          notify("Modo Desenvolvedor liberado com sucesso para esta sessão!");
        }}
      />

      <ClientModulesManagerModal
        isOpen={showModulesModal}
        onClose={() => setShowModulesModal(false)}
        currentModules={clientModules}
        onModulesSaved={(newMods) => setClientModules(newMods)}
      />
    </div>
  );
}

