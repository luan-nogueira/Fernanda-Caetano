"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CustomLink,
  DestinationType,
  LinkStyleVariant,
  Procedure,
  SiteSection,
  SiteSettings,
  Unit,
} from "@/types/domain";
import { DynamicIcon, ICON_OPTIONS } from "@/components/DynamicIcon";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  Palette,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export default function AdminSiteEditorPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [activeTab, setActiveTab] = useState<"links" | "profile" | "sections">(
    "links"
  );
  const [toast, setToast] = useState<string | null>(null);

  // Estado do Modal de Botão (Criar / Editar)
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<CustomLink | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkSubtitle, setLinkSubtitle] = useState("");
  const [linkIcon, setLinkIcon] = useState<string>("CalendarCheck");
  const [linkDestType, setLinkDestType] = useState<DestinationType>("booking");
  const [linkDestValue, setLinkDestValue] = useState("/agendar");
  const [linkWaMessage, setLinkWaMessage] = useState("");
  const [linkStyle, setLinkStyle] = useState<LinkStyleVariant>("default");
  const [linkBadge, setLinkBadge] = useState("");
  const [linkActive, setLinkActive] = useState(true);

  // Drag & Drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function showSuccessToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function loadEditorData() {
    const res = await fetch("/api/admin/site");
    const data = await res.json();
    if (data.settings) setSettings(data.settings);
    if (data.sections) setSections(data.sections);
    if (data.links) setLinks(data.links);
    if (data.units) setUnits(data.units);
    if (data.procedures) setProcedures(data.procedures);
  }

  useEffect(() => {
    loadEditorData();
  }, []);

  function openNewLinkModal() {
    setEditingLink(null);
    setLinkTitle("");
    setLinkSubtitle("");
    setLinkIcon("Sparkles");
    setLinkDestType("booking");
    setLinkDestValue("/agendar");
    setLinkWaMessage("");
    setLinkStyle("default");
    setLinkBadge("");
    setLinkActive(true);
    setShowLinkModal(true);
  }

  function openEditLinkModal(link: CustomLink) {
    setEditingLink(link);
    setLinkTitle(link.title);
    setLinkSubtitle(link.subtitle || "");
    setLinkIcon(link.icon_name || "Sparkles");
    setLinkDestType(link.destination_type);
    setLinkDestValue(link.destination_value);
    setLinkWaMessage(link.whatsapp_message || "");
    setLinkStyle(link.style_variant || "default");
    setLinkBadge(link.badge_text || "");
    setLinkActive(Boolean(link.is_active));
    setShowLinkModal(true);
  }

  async function handleSaveLink(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      action: editingLink ? "update_link" : "create_link",
      id: editingLink?.id,
      title: linkTitle,
      subtitle: linkSubtitle,
      icon_name: linkIcon,
      destination_type: linkDestType,
      destination_value: linkDestValue,
      whatsapp_message: linkWaMessage,
      style_variant: linkStyle,
      badge_text: linkBadge,
      is_active: linkActive,
    };

    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setShowLinkModal(false);
    await loadEditorData();
    showSuccessToast(
      editingLink
        ? "Botão atualizado com sucesso!"
        : "Novo botão criado na página pública!"
    );
  }

  async function handleToggleLinkVisibility(link: CustomLink) {
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_link",
        ...link,
        is_active: !Boolean(link.is_active),
      }),
    });
    await loadEditorData();
  }

  async function handleDeleteLink(link: CustomLink) {
    if (
      !window.confirm(`Deseja realmente excluir o botão "${link.title}"?`)
    ) {
      return;
    }
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_link", id: link.id }),
    });
    await loadEditorData();
    showSuccessToast("Botão removido.");
  }

  async function persistLinkOrder(newList: CustomLink[]) {
    setLinks(newList);
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder_links",
        orderedIds: newList.map((l) => l.id),
      }),
    });
    showSuccessToast("Ordem dos botões atualizada!");
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const copy = [...links];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    persistLinkOrder(copy);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const copy = [...links];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(targetIndex, 0, moved);
    setDragIndex(null);
    persistLinkOrder(copy);
  }

  async function handleSaveDraft() {
    if (!settings) return;
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_draft", draft: settings }),
    });
    showSuccessToast(
      "Rascunho salvo! Clique em 'Abrir Prévia' para visualizar antes de publicar."
    );
  }

  async function handlePublishSettings() {
    if (!settings) return;
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish_settings", settings }),
    });
    showSuccessToast(
      "Alterações publicadas ao vivo na página da Dra. Fernanda Caetano!"
    );
  }

  async function handleSaveSections() {
    await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_sections", sections }),
    });
    showSuccessToast("Seções da página pública atualizadas!");
  }

  if (!settings) {
    return (
      <div className="py-12 text-center text-sm text-slate">
        Carregando Editor da Página Pública...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Personalização Sem Código
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Editor da Página Pública
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Gerencie botões, destinos, textos, foto de perfil e ordem das seções
            com pré-visualização mobile em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/?preview=1"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-offwhite-warm text-navy border border-offwhite-border text-xs font-semibold"
          >
            <Eye className="w-4 h-4 text-terracotta" />
            <span>Abrir Prévia em Nova Aba</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs font-semibold"
          >
            <Save className="w-4 h-4 text-gold" />
            <span>Salvar Rascunho</span>
          </button>

          <button
            type="button"
            onClick={handlePublishSettings}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Publicar Alterações</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Abas do Editor */}
      <div className="flex flex-wrap items-center gap-2 border-b border-offwhite-border pb-3">
        {(
          [
            { id: "links", label: "1. Botões Principais da Página" },
            { id: "profile", label: "2. Perfil, Bio, Cores & Textos" },
            { id: "sections", label: "3. Ordem e Visibilidade das Seções" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-navy text-offwhite shadow-sm"
                : "bg-white text-slate hover:text-navy border border-offwhite-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GRID PRINCIPAL: CONTROLES (7 COLUNAS) + PREVIEW CELULAR AO VIVO (5 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: EDITOR */}
        <div className="lg:col-span-7 space-y-5">
          {/* ABA 1: GERENCIADOR DE BOTÕES DINÂMICOS */}
          {activeTab === "links" && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-navy">
                    Botões da Página Inicial
                  </h2>
                  <p className="text-xs text-slate">
                    Arraste para reordenar, oculte temporariamente ou crie novos
                    botões apontando para procedimentos, unidades ou WhatsApp.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewLinkModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shrink-0 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Botão</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {links.map((link, index) => (
                  <div
                    key={link.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      Boolean(link.is_active)
                        ? "bg-offwhite/40 border-offwhite-border"
                        : "bg-offwhite/20 border-dashed border-slate/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="cursor-grab text-slate hover:text-navy"
                        title="Arraste para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-navy text-gold flex items-center justify-center shrink-0">
                        <DynamicIcon
                          name={link.icon_name}
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-navy truncate">
                            {link.title}
                          </p>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-navy/5 text-slate">
                            {link.destination_type}
                          </span>
                        </div>
                        {link.subtitle && (
                          <p className="text-xs text-slate truncate">
                            {link.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveLink(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg hover:bg-white text-slate disabled:opacity-30"
                        title="Subir"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLink(index, 1)}
                        disabled={index === links.length - 1}
                        className="p-1.5 rounded-lg hover:bg-white text-slate disabled:opacity-30"
                        title="Descer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleLinkVisibility(link)}
                        className="p-1.5 rounded-lg hover:bg-white text-slate hover:text-navy"
                        title={
                          Boolean(link.is_active)
                            ? "Ocultar botão"
                            : "Exibir botão"
                        }
                      >
                        {Boolean(link.is_active) ? (
                          <Eye className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditLinkModal(link)}
                        className="p-1.5 rounded-lg hover:bg-white text-navy"
                        title="Editar botão"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        title="Excluir botão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 2: PERFIL, BIOGRAFIA, CORES E MENSAGENS */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
              <h2 className="font-serif text-2xl font-semibold text-navy">
                Identidade Profissional & Conteúdo Institucional
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Nome em Destaque
                  </label>
                  <input
                    type="text"
                    value={settings.professional_name}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        professional_name: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Subtítulo Profissional
                  </label>
                  <input
                    type="text"
                    value={settings.professional_subtitle}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        professional_subtitle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Selo Superior (Hero Badge)
                  </label>
                  <input
                    type="text"
                    value={settings.hero_badge}
                    onChange={(e) =>
                      setSettings({ ...settings, hero_badge: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    URL da Foto de Perfil
                  </label>
                  <input
                    type="text"
                    value={settings.avatar_url}
                    onChange={(e) =>
                      setSettings({ ...settings, avatar_url: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Biografia Resumida (Cabeçalho)
                </label>
                <textarea
                  rows={2}
                  value={settings.professional_bio}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      professional_bio: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Texto Completo &quot;Sobre a Profissional&quot;
                </label>
                <textarea
                  rows={4}
                  value={settings.about_full_text}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      about_full_text: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Instagram (@handle)
                  </label>
                  <input
                    type="text"
                    value={settings.instagram_handle}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instagram_handle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Link do Instagram
                  </label>
                  <input
                    type="text"
                    value={settings.instagram_url}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instagram_url: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Mensagem da Tela de Sucesso do Agendamento
                </label>
                <textarea
                  rows={2}
                  value={settings.booking_success_message}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      booking_success_message: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              {/* Paleta Oficial */}
              <div className="pt-3 border-t border-offwhite-border">
                <label className="block text-xs font-semibold text-navy mb-2 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-terracotta" />
                  <span>Sistema de Cores da Identidade Visual</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-offwhite border border-offwhite-border flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          primary_color: e.target.value,
                        })
                      }
                      className="w-7 h-7 rounded cursor-pointer"
                    />
                    <span>Azul-Marinho</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-offwhite border border-offwhite-border flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          accent_color: e.target.value,
                        })
                      }
                      className="w-7 h-7 rounded cursor-pointer"
                    />
                    <span>Laranja CTA</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-offwhite border border-offwhite-border flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.gold_color}
                      onChange={(e) =>
                        setSettings({ ...settings, gold_color: e.target.value })
                      }
                      className="w-7 h-7 rounded cursor-pointer"
                    />
                    <span>Dourado</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-offwhite border border-offwhite-border flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.background_color}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          background_color: e.target.value,
                        })
                      }
                      className="w-7 h-7 rounded cursor-pointer"
                    />
                    <span>Off-White</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: SEÇÕES DA PÁGINA */}
          {activeTab === "sections" && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-navy">
                    Seções da Página Pública
                  </h2>
                  <p className="text-xs text-slate">
                    Ative, desative ou altere os títulos das seções exibidas na
                    vitrine principal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSections}
                  className="px-4 py-2 rounded-xl bg-terracotta text-white text-xs font-semibold"
                >
                  Salvar Seções
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-2xl bg-offwhite/60 border border-offwhite-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const copy = [...sections];
                          copy[idx] = { ...sec, title: e.target.value };
                          setSections(copy);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-offwhite-border bg-white text-sm font-semibold text-navy"
                      />
                      <input
                        type="text"
                        value={sec.subtitle || ""}
                        onChange={(e) => {
                          const copy = [...sections];
                          copy[idx] = { ...sec, subtitle: e.target.value };
                          setSections(copy);
                        }}
                        placeholder="Subtítulo da seção"
                        className="w-full px-3 py-1 rounded-lg border border-offwhite-border bg-white text-xs text-slate"
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-navy cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(sec.is_visible)}
                        onChange={(e) => {
                          const copy = [...sections];
                          copy[idx] = {
                            ...sec,
                            is_visible: e.target.checked ? 1 : 0,
                          };
                          setSections(copy);
                        }}
                        className="w-4 h-4 accent-terracotta"
                      />
                      <span>Visível</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: SIMULADOR DE CELULAR EM TEMPO REAL */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[360px] rounded-[42px] p-3 bg-navy-950 border-4 border-gold/40 shadow-luxury">
            <div className="rounded-[32px] overflow-hidden bg-offwhite max-h-[680px] overflow-y-auto">
              {/* Mockup Header */}
              <div className="bg-navy text-offwhite p-5 text-center border-b border-gold/30">
                <span className="inline-block text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-gold mb-3">
                  {settings.hero_badge}
                </span>
                <img
                  src={settings.avatar_url || "/images/fernanda-portrait.svg"}
                  alt={settings.professional_name}
                  className="w-20 h-20 rounded-full mx-auto border-2 border-gold object-cover mb-2.5"
                />
                <h3 className="font-serif text-2xl font-semibold">
                  {settings.professional_name}
                </h3>
                <p className="text-xs text-gold font-medium mt-0.5">
                  {settings.professional_subtitle}
                </p>
                <p className="text-[11px] text-offwhite/80 mt-2 leading-relaxed">
                  {settings.professional_bio}
                </p>
              </div>

              {/* Mockup Buttons */}
              <div className="p-4 space-y-2.5">
                {links
                  .filter((l) => Boolean(l.is_active))
                  .map((link) => {
                    const isPrimary = link.style_variant === "primary_cta";
                    const isNavy = link.style_variant === "navy";
                    return (
                      <div
                        key={link.id}
                        className={`p-3 rounded-2xl border flex items-center gap-3 text-left ${
                          isPrimary
                            ? "bg-terracotta text-white border-terracotta"
                            : isNavy
                            ? "bg-navy text-offwhite border-gold/30"
                            : "bg-white text-navy border-offwhite-border"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isPrimary
                              ? "bg-white/20 text-white"
                              : isNavy
                              ? "bg-white/10 text-gold"
                              : "bg-navy/5 text-navy"
                          }`}
                        >
                          <DynamicIcon
                            name={link.icon_name}
                            className="w-4 h-4"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">
                            {link.title}
                          </p>
                          {link.subtitle && (
                            <p className="text-[10px] opacity-80 truncate">
                              {link.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate mt-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span>Pré-visualização Mobile em Tempo Real</span>
          </span>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE BOTÃO */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-gold/40 shadow-luxury space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-offwhite-border pb-3">
              <h3 className="font-serif text-2xl font-semibold text-navy">
                {editingLink ? "Editar Botão" : "Criar Novo Botão"}
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-xl bg-offwhite text-slate hover:text-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Título do Botão *
                </label>
                <input
                  type="text"
                  required
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Ex.: Agende seu procedimento"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Subtítulo (opcional)
                </label>
                <input
                  type="text"
                  value={linkSubtitle}
                  onChange={(e) => setLinkSubtitle(e.target.value)}
                  placeholder="Ex.: Escolha unidade e horário disponível"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Tipo de Destino *
                  </label>
                  <select
                    value={linkDestType}
                    onChange={(e) => {
                      const nextType = e.target.value as DestinationType;
                      setLinkDestType(nextType);
                      if (nextType === "booking") setLinkDestValue("/agendar");
                      if (nextType === "procedure" && procedures[0])
                        setLinkDestValue(procedures[0].slug);
                      if (nextType === "unit" && units[0])
                        setLinkDestValue(units[0].slug);
                      if (nextType === "whatsapp")
                        setLinkDestValue("5522999990001");
                      if (nextType === "internal_page")
                        setLinkDestValue("/procedimentos");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    <option value="booking">Fluxo de Agendamento</option>
                    <option value="procedure">Procedimento Específico</option>
                    <option value="unit">Unidade de Atendimento</option>
                    <option value="whatsapp">WhatsApp com Mensagem</option>
                    <option value="internal_page">Página Interna</option>
                    <option value="external_link">Link Externo (URL)</option>
                    <option value="section">Seção da Página</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Estilo Visual
                  </label>
                  <select
                    value={linkStyle}
                    onChange={(e) =>
                      setLinkStyle(e.target.value as LinkStyleVariant)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    <option value="default">Branco Elegante (Padrão)</option>
                    <option value="primary_cta">
                      Laranja Destaque (CTA Principal)
                    </option>
                    <option value="navy">Azul-Marinho Institucional</option>
                    <option value="outline_gold">Borda Dourada</option>
                  </select>
                </div>
              </div>

              {/* Destino dinâmico conforme tipo selecionado */}
              {linkDestType === "procedure" ? (
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Selecione o Procedimento
                  </label>
                  <select
                    value={linkDestValue}
                    onChange={(e) => setLinkDestValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    {procedures.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : linkDestType === "unit" ? (
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Selecione a Unidade
                  </label>
                  <select
                    value={linkDestValue}
                    onChange={(e) => setLinkDestValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.slug}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    {linkDestType === "whatsapp"
                      ? "Número do WhatsApp (com DDI 55 e DDD)"
                      : "Destino / Caminho / URL"}
                  </label>
                  <input
                    type="text"
                    required
                    value={linkDestValue}
                    onChange={(e) => setLinkDestValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              )}

              {linkDestType === "whatsapp" && (
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Mensagem Personalizada do WhatsApp
                  </label>
                  <textarea
                    rows={2}
                    value={linkWaMessage}
                    onChange={(e) => setLinkWaMessage(e.target.value)}
                    placeholder="Olá! Gostaria de agendar um atendimento..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Ícone do Botão
                  </label>
                  <select
                    value={linkIcon}
                    onChange={(e) => setLinkIcon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Selo Lateral (opcional)
                  </label>
                  <input
                    type="text"
                    value={linkBadge}
                    onChange={(e) => setLinkBadge(e.target.value)}
                    placeholder="Ex.: ONLINE, UNIDADE, NOVO"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-xl bg-offwhite text-navy text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold"
                >
                  Salvar Botão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

