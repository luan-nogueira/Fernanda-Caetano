"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Crop,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  Palette,
  Plus,
  RotateCcw,
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
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  // Drag & Drop & Animation state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [movedHighlight, setMovedHighlight] = useState<{
    id: string;
    toPosition: number;
  } | null>(null);

  const DEST_TYPE_LABELS: Record<string, string> = {
    booking: "AGENDAMENTO",
    internal_page: "PÁGINA INTERNA",
    unit: "UNIDADE",
    whatsapp: "WHATSAPP",
    external_link: "LINK EXTERNO",
    procedure: "PROCEDIMENTO",
    section: "SEÇÃO DA PÁGINA",
  };

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

  useEffect(() => {
    function handleAvatarUpdated(e: Event) {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setSettings((prev) =>
          prev ? { ...prev, avatar_url: custom.detail } : prev
        );
      }
    }
    window.addEventListener("fernanda-avatar-updated", handleAvatarUpdated);
    return () => {
      window.removeEventListener(
        "fernanda-avatar-updated",
        handleAvatarUpdated
      );
    };
  }, []);

  function handleSelectAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropperSrc(reader.result);
      }
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
      showSuccessToast(
        "Foto de perfil recortada e atualizada em todo o site e painel!"
      );
    } catch (e) {
      console.error("Erro ao atualizar foto:", e);
    }
  }

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

  function triggerMoveFeedback(id: string, toPosition: number) {
    setMovedHighlight({ id, toPosition });
    setTimeout(() => {
      setMovedHighlight((prev) => (prev?.id === id ? null : prev));
    }, 2200);
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const copy = [...links];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    triggerMoveFeedback(removed.id, target + 1);
    persistLinkOrder(copy);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null) return;
    if (dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const copy = [...links];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    triggerMoveFeedback(moved.id, targetIndex + 1);
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
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activeTab === tab.id
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

                <div className="flex flex-wrap items-center gap-2">
                  {!links.some((l) => l.destination_value === "/cursos") && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch("/api/admin/site", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "create_link",
                            title: "Cursos, Capacitações & Área de Alunos",
                            subtitle:
                              "Acesse as vídeo-aulas exclusivas ou conheça as formações da Dra. Fernanda",
                            icon_name: "GraduationCap",
                            destination_type: "internal_page",
                            destination_value: "/cursos",
                            whatsapp_message: "",
                            style_variant: "navy",
                            badge_text: "ACADEMY",
                            is_active: true,
                          }),
                        });
                        await loadEditorData();
                        showSuccessToast(
                          "Botão 'Cursos, Capacitações & Área de Alunos' adicionado à página inicial!"
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-gold border border-gold/40 text-xs font-semibold shrink-0 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 text-gold" />
                      <span>+ Adicionar Botão de Cursos</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openNewLinkModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Botão</span>
                  </button>
                </div>
              </div>

              {dragIndex !== null && links[dragIndex] && (
                <div className="p-3.5 rounded-2xl bg-navy text-white border-2 border-gold shadow-luxury flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta text-white font-extrabold text-xs">
                      ↕
                    </span>
                    <span>
                      Movendo botão:{" "}
                      <strong className="text-gold-light">
                        &ldquo;{links[dragIndex].title}&rdquo;
                      </strong>
                    </span>
                  </div>
                  <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-white/15 text-gold-light">
                    {dragOverIndex !== null && dragOverIndex !== dragIndex
                      ? `Soltar na ${dragOverIndex + 1}ª posição`
                      : `Posição atual: ${dragIndex + 1}º`}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {links.map((link, index) => {
                  const isBeingDragged = dragIndex === index;
                  const isDropTarget =
                    dragIndex !== null &&
                    dragOverIndex === index &&
                    dragIndex !== index;
                  const wasJustMoved = movedHighlight?.id === link.id;

                  return (
                    <div
                      key={link.id}
                      draggable
                      onDragStart={() => {
                        setDragIndex(index);
                        setDragOverIndex(index);
                      }}
                      onDragEnter={() => {
                        if (dragIndex !== null && dragOverIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null && dragOverIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDrop={() => handleDrop(index)}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${isBeingDragged
                          ? "bg-terracotta/10 border-terracotta ring-4 ring-terracotta/25 scale-[0.98] shadow-luxury"
                          : isDropTarget
                            ? "bg-navy/10 border-navy ring-4 ring-gold/40 -translate-y-1 shadow-luxury"
                            : wasJustMoved
                              ? "bg-emerald-50 border-emerald-500 ring-4 ring-emerald-500/20 shadow-md"
                              : Boolean(link.is_active)
                                ? "bg-offwhite/60 border-offwhite-border hover:border-navy/40 shadow-sm"
                                : "bg-offwhite/25 border-dashed border-slate/40 opacity-65"
                        }`}
                    >
                      {isDropTarget && (
                        <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-navy text-gold-light text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                          <span>⬇ Soltar aqui ({index + 1}º lugar)</span>
                        </div>
                      )}

                      {isBeingDragged && (
                        <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-terracotta text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1 animate-bounce">
                          <span>↔ Sendo movido...</span>
                        </div>
                      )}

                      {wasJustMoved && (
                        <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>
                            Movido para {movedHighlight?.toPosition}º lugar!
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-white border border-offwhite-border text-navy hover:bg-navy hover:text-gold transition-colors flex items-center gap-1"
                          title="Clique e arraste para mover este botão"
                        >
                          <GripVertical className="w-4 h-4" />
                          <span className="text-[11px] font-extrabold w-4 text-center">
                            {index + 1}º
                          </span>
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-navy text-gold flex items-center justify-center shrink-0 shadow-sm">
                          <DynamicIcon
                            name={link.icon_name}
                            className="w-4 h-4"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-navy leading-snug">
                              {link.title}
                            </p>
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-navy/10 text-navy">
                              {DEST_TYPE_LABELS[link.destination_type] ||
                                link.destination_type}
                            </span>
                          </div>
                          {link.subtitle && (
                            <p className="text-xs font-medium text-slate leading-relaxed mt-0.5">
                              {link.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-offwhite-border/60">
                        <button
                          type="button"
                          onClick={() => moveLink(index, -1)}
                          disabled={index === 0}
                          className="p-2 rounded-lg bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border disabled:opacity-30 transition-colors"
                          title="Subir posição"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLink(index, 1)}
                          disabled={index === links.length - 1}
                          className="p-2 rounded-lg bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border disabled:opacity-30 transition-colors"
                          title="Descer posição"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLinkVisibility(link)}
                          className="p-2 rounded-lg bg-white hover:bg-offwhite text-navy border border-offwhite-border transition-colors"
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
                          className="p-2 rounded-lg bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border transition-colors"
                          title="Editar botão"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLink(link)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 transition-colors"
                          title="Excluir botão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA 2: PERFIL, BIOGRAFIA, CORES E MENSAGENS */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
              <h2 className="font-serif text-2xl font-semibold text-navy">
                Identidade Profissional & Conteúdo Institucional
              </h2>

              {/* FOTO DE PERFIL ESTILO WHATSAPP */}
              <div className="p-4 sm:p-5 rounded-2xl bg-offwhite/70 border border-offwhite-border flex flex-col sm:flex-row items-center gap-5">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-28 h-28 rounded-full border-[3px] border-gold shadow-card shrink-0 group overflow-hidden"
                  title="Trocar foto de perfil"
                >
                  <img
                    src={settings.avatar_url || "/images/fernanda-portrait.svg"}
                    alt={settings.professional_name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium gap-1">
                    <Camera className="w-5 h-5 text-gold" />
                    Trocar foto
                  </span>
                </button>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
                  <div>
                    <p className="font-serif text-lg font-semibold text-navy">
                      Foto de Perfil
                    </p>
                    <p className="text-xs text-slate leading-relaxed">
                      Escolha uma foto do computador ou celular e ajuste o
                      enquadramento (arrastar + zoom), como no WhatsApp. A foto
                      aparece no site, agendamento, cursos e no painel.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Escolher Nova Foto</span>
                    </button>
                    {settings.avatar_url && (
                      <button
                        type="button"
                        onClick={() => setCropperSrc(settings.avatar_url)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border text-xs font-semibold transition-colors"
                      >
                        <Crop className="w-4 h-4" />
                        <span>Ajustar Recorte Atual</span>
                      </button>
                    )}
                    {settings.avatar_url &&
                      settings.avatar_url !== "/images/fernanda-portrait.svg" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmCroppedAvatar(
                              "/images/fernanda-portrait.svg"
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-slate hover:text-red-600 text-xs font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar padrão</span>
                        </button>
                      )}
                  </div>
                </div>
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectAvatarFile}
                className="hidden"
              />

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

              <div className="grid grid-cols-1 gap-4">
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
                        className={`p-3 rounded-2xl border flex items-center gap-3 text-left ${isPrimary
                            ? "bg-terracotta text-white border-terracotta"
                            : isNavy
                              ? "bg-navy text-offwhite border-gold/30"
                              : "bg-white text-navy border-offwhite-border"
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPrimary
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
                          <p className="text-xs font-bold leading-snug">
                            {link.title}
                          </p>
                          {link.subtitle && (
                            <p className="text-[10px] opacity-85 leading-relaxed mt-0.5">
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

      {/* MODAL DE RECORTE DA FOTO DE PERFIL */}
      {cropperSrc && (
        <AvatarCropperModal
          isOpen={Boolean(cropperSrc)}
          imageSrc={cropperSrc}
          onClose={() => setCropperSrc(null)}
          onConfirmCrop={handleConfirmCroppedAvatar}
        />
      )}

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
                      if (nextType === "internal_page") {
                        setLinkDestValue("/cursos");
                        if (!linkTitle) {
                          setLinkTitle("Cursos, Capacitações & Área de Alunos");
                          setLinkSubtitle(
                            "Acesse as vídeo-aulas exclusivas ou conheça as formações da Dra. Fernanda"
                          );
                          setLinkBadge("ACADEMY");
                          setLinkStyle("navy");
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    <option value="internal_page">
                      Página Interna (Cursos, Procedimentos, Sobre...)
                    </option>
                    <option value="booking">Fluxo de Agendamento</option>
                    <option value="procedure">Procedimento Específico</option>
                    <option value="unit">Unidade de Atendimento</option>
                    <option value="whatsapp">WhatsApp com Mensagem</option>
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
              ) : linkDestType === "internal_page" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Escolha a Página do Site
                  </label>
                  <select
                    value={linkDestValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLinkDestValue(val);
                      if (val === "/cursos" && !editingLink) {
                        setLinkTitle("Cursos, Capacitações & Área de Alunos");
                        setLinkSubtitle(
                          "Acesse as vídeo-aulas exclusivas ou conheça as formações da Dra. Fernanda"
                        );
                        setLinkBadge("ACADEMY");
                        setLinkStyle("navy");
                      } else if (val === "/cursos/login" && !editingLink) {
                        setLinkTitle("Área do Aluno — Login");
                        setLinkSubtitle(
                          "Entre com seu e-mail e senha para assistir às vídeo-aulas"
                        );
                        setLinkBadge("ALUNOS");
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy bg-offwhite/50"
                  >
                    <option value="/cursos">
                      🎓 Portal de Cursos & Área de Alunos (/cursos)
                    </option>
                    <option value="/cursos/login">
                      🔐 Login Direto da Área do Aluno (/cursos/login)
                    </option>
                    <option value="/procedimentos">
                      ✨ Catálogo de Procedimentos (/procedimentos)
                    </option>
                    <option value="/unidades">
                      📍 Unidades de Atendimento (/unidades)
                    </option>
                    <option value="/sobre">
                      👩‍⚕️ Sobre a Profissional (/sobre)
                    </option>
                    <option value="/agendar">
                      📅 Agendamento Online (/agendar)
                    </option>
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

