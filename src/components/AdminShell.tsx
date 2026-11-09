"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import { ClientModulesManagerModal } from "@/components/ClientModulesManagerModal";
import {
  PRESET_ESSENCIAL,
  parseClientModules,
  isRouteAllowedForClient,
} from "@/lib/modules-config";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Building2,
  Clock,
  Users,
  Palette,
  QrCode,
  Bell,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  GraduationCap,
  Camera,
  Sliders,
  EyeOff,
  Lock,
} from "lucide-react";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    id: "agenda",
    href: "/admin/agenda",
    label: "Agenda de Atendimentos",
    icon: Calendar,
    badge: "Principal",
  },
  {
    id: "cursos",
    href: "/admin/cursos",
    label: "Cursos & Área de Alunos",
    icon: GraduationCap,
    badge: "Novo",
  },
  {
    id: "site",
    href: "/admin/site",
    label: "Editor da Página Pública",
    icon: Palette,
  },
  {
    id: "whatsapp",
    href: "/admin/whatsapp",
    label: "WhatsApp Bot & QR Code",
    icon: QrCode,
    badge: "Bot",
  },
  {
    id: "procedimentos",
    href: "/admin/procedimentos",
    label: "Procedimentos & Categorias",
    icon: Sparkles,
  },
  {
    id: "unidades",
    href: "/admin/unidades",
    label: "Unidades de Atendimento",
    icon: Building2,
  },
  {
    id: "horarios",
    href: "/admin/horarios",
    label: "Horários & Bloqueios",
    icon: Clock,
  },
  {
    id: "clientes",
    href: "/admin/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    id: "notificacoes",
    href: "/admin/notificacoes",
    label: "Notificações",
    icon: Bell,
  },
  {
    id: "configuracoes",
    href: "/admin/configuracoes",
    label: "Configurações & Segurança",
    icon: Settings,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [clientModules, setClientModules] = useState<Record<string, boolean>>(
    PRESET_ESSENCIAL
  );
  const [modulesModalOpen, setModulesModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    "/images/fernanda-portrait.svg"
  );
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true);
      return;
    }
    fetch("/api/admin/auth")
      .then((res) => {
        if (!res.ok) {
          router.replace("/admin/login");
        } else {
          return res.json().then((authData) => {
            if (authData?.user) {
              setCurrentUser(authData.user);
            }
            setAuthChecked(true);
            return fetch("/api/admin/site");
          });
        }
      })
      .then((r) => (r ? r.json() : null))
      .then((data) => {
        if (data?.currentUser) {
          setCurrentUser(data.currentUser);
        }
        if (data?.settings?.avatar_url) {
          setAvatarUrl(data.settings.avatar_url);
        }
        if (data?.settings?.client_enabled_modules_json) {
          setClientModules(
            parseClientModules(data.settings.client_enabled_modules_json)
          );
        }
      })
      .catch(() => {
        router.replace("/admin/login");
      });
  }, [isLoginPage, router]);

  useEffect(() => {
    function handleAvatarEvent(e: Event) {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setAvatarUrl(custom.detail);
      }
    }
    function handleModulesEvent(e: Event) {
      const custom = e as CustomEvent<Record<string, boolean>>;
      if (custom.detail) {
        setClientModules(custom.detail);
      }
    }

    window.addEventListener("fernanda-avatar-updated", handleAvatarEvent);
    window.addEventListener("fc-modules-updated", handleModulesEvent);
    return () => {
      window.removeEventListener("fernanda-avatar-updated", handleAvatarEvent);
      window.removeEventListener("fc-modules-updated", handleModulesEvent);
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

  async function handleSaveCroppedAvatar(croppedDataUrl: string) {
    setAvatarUrl(croppedDataUrl);
    setCropperSrc(null);
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
    } catch (e) {
      console.error("Erro ao salvar foto de perfil:", e);
    }
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.replace("/admin/login");
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-navy text-white flex flex-col items-center justify-center p-6 select-none">
        <div className="relative w-24 h-24 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border border-dashed border-gold/40 animate-[spin_8s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-terracotta border-r-gold/60 animate-[spin_2s_ease-in-out_infinite]" />
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gold-dark to-gold flex items-center justify-center text-navy font-serif font-semibold text-base shadow-luxury overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Dra. Fernanda Caetano"
                className="w-full h-full object-cover"
              />
            ) : (
              "FC"
            )}
          </div>
        </div>
        <p className="font-serif text-base font-medium text-white tracking-wide">
          Dra. Fernanda Caetano
        </p>
        <span className="text-[11px] uppercase tracking-[0.22em] text-gold-light mt-1">
          Iniciando Central Clínica...
        </span>
      </div>
    );
  }

  const isSuperAdmin =
    currentUser?.role === "superadmin" ||
    currentUser?.email?.toLowerCase() === "luanmnogueira@gmail.com";

  // Se for superadmin (Luan), mostra TODOS os 11 itens. Se for cliente (Fernanda), filtra os módulos ativos.
  const visibleNavItems = isSuperAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter(
        (item) => item.id === "dashboard" || clientModules[item.id] !== false
      );

  // Guarda de rota para navegação direta pela URL
  const isAllowedRoute =
    isSuperAdmin || isRouteAllowedForClient(pathname, clientModules);

  const todayFormatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-offwhite flex flex-col lg:flex-row">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSelectAvatarFile}
        className="hidden"
      />

      {cropperSrc && (
        <AvatarCropperModal
          isOpen={Boolean(cropperSrc)}
          imageSrc={cropperSrc}
          onClose={() => setCropperSrc(null)}
          onConfirmCrop={handleSaveCroppedAvatar}
        />
      )}

      {isSuperAdmin && (
        <ClientModulesManagerModal
          isOpen={modulesModalOpen}
          onClose={() => setModulesModalOpen(false)}
          currentModules={clientModules}
          onModulesSaved={(newMods) => setClientModules(newMods)}
        />
      )}

      {/* Topbar Mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-navy text-offwhite px-4 h-16 flex items-center justify-between border-b border-gold/25">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-white/10 text-gold"
            aria-label="Abrir menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Alterar e recortar foto de perfil"
            className="relative w-9 h-9 rounded-full border border-gold overflow-hidden shrink-0 group"
          >
            <img
              src={avatarUrl || "/images/fernanda-portrait.svg"}
              alt="Dra. Fernanda Caetano"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-terracotta text-white flex items-center justify-center">
              <Camera className="w-2 h-2" />
            </span>
          </button>

          <div>
            <span className="font-serif text-lg font-semibold block leading-none">
              Fernanda Caetano
            </span>
            <span className="text-[10px] text-gold uppercase tracking-widest">
              Painel Administrativo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setModulesModalOpen(true)}
              className="p-2 rounded-xl bg-amber-400/20 text-amber-200 border border-amber-300/30 text-xs font-bold"
              title="Gerenciar módulos ativos para Fernanda"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-medium text-offwhite"
          >
            <span>Ver Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-gold" />
          </Link>
        </div>
      </header>

      {/* Sidebar Desktop + Drawer Mobile */}
      <aside
        className={`${
          mobileOpen ? "fixed inset-0 top-16 z-30 block" : "hidden"
        } lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex lg:flex-col bg-navy text-offwhite border-r border-gold/25 shrink-0 overflow-y-auto`}
      >
        <div className="hidden lg:flex items-center gap-3.5 px-6 py-6 border-b border-white/15">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Clique para trocar e recortar sua foto de perfil (Estilo WhatsApp)"
            className="relative w-12 h-12 rounded-full border-2 border-gold shadow-sm shrink-0 group overflow-visible"
          >
            <img
              src={avatarUrl || "/images/fernanda-portrait.svg"}
              alt="Dra. Fernanda Caetano"
              className="w-full h-full rounded-full object-cover"
            />
            <span className="absolute inset-0 rounded-full bg-navy/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-4 h-4 text-gold" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-terracotta border-2 border-navy text-white flex items-center justify-center shadow">
              <Camera className="w-2.5 h-2.5" />
            </span>
          </button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-bold text-white leading-tight tracking-tight">
              Fernanda Caetano
            </h1>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] text-gold-light hover:text-terracotta-light font-medium flex items-center gap-1 mt-0.5 transition-colors"
            >
              <Camera className="w-3 h-3" />
              <span>Trocar foto de perfil</span>
            </button>
          </div>
        </div>

        {/* Bloco Master Dev Exclusivo Luan */}
        {isSuperAdmin && (
          <div className="mx-4 mt-3 mb-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-offwhite shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-amber-200 text-xs tracking-wide">
                  Master (Luan)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModulesModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-[11px] font-bold text-amber-200 border border-amber-300/30 transition-all flex items-center gap-1.5 shadow-xs"
                title="Ativar ou desativar funções na lateral da Fernanda"
              >
                <Sliders className="w-3 h-3 text-gold" />
                <span>Gerenciar</span>
              </button>
            </div>
            <p className="text-[10px] text-white/65 mt-1 leading-tight">
              Você vê a tela completa. Clique em &ldquo;Gerenciar&rdquo; para ligar/desligar abas da Fernanda.
            </p>
          </div>
        )}

        {/* Lista de Navegação */}
        <nav className="flex-1 p-4 space-y-1.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isHiddenForClient =
              isSuperAdmin &&
              item.id !== "dashboard" &&
              clientModules[item.id] === false;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-terracotta text-white shadow-md"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-gold"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isHiddenForClient && (
                    <span
                      title="Oculto para a Fernanda no plano dela"
                      className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider text-red-300 bg-red-950/70 border border-red-500/40 px-1.5 py-0.5 rounded-md"
                    >
                      <EyeOff className="w-2.5 h-2.5" />
                      <span>Oculto</span>
                    </span>
                  )}
                  {item.badge && (
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-white/15 text-gold-light"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/15 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-gold/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              <span>Abrir Página Pública</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-gold" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/85 hover:text-white hover:bg-red-500/25 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar Executiva Desktop */}
        <div className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white/80 backdrop-blur-md border-b border-offwhite-border/80 sticky top-0 z-20">
          <div className="flex items-center gap-3 text-xs text-slate">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistema Clínico Ativo & Sincronizado</span>
            </span>
            <span className="text-offwhite-border">•</span>
            <span className="capitalize font-normal text-slate/90">
              {todayFormatted}
            </span>
            {isSuperAdmin && (
              <>
                <span className="text-offwhite-border">•</span>
                <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  Sessão Master: {currentUser?.email}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setModulesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span>Gerenciar Módulos da Fernanda</span>
              </button>
            )}

            <Link
              href="/admin/cursos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy text-xs font-medium transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5 text-terracotta" />
              <span>Cursos & Alunos</span>
            </Link>
            <Link
              href="/cursos"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy text-xs font-medium transition-colors"
            >
              <span>Área do Aluno</span>
              <ExternalLink className="w-3 h-3 text-gold-dark" />
            </Link>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {!isAllowedRoute ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-offwhite-border shadow-luxury text-center max-w-xl mx-auto my-12 animate-scale-up">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Recurso Não Incluso
              </span>
              <h2 className="font-serif text-2xl font-bold text-navy mt-3 mb-2">
                Módulo Indisponível no Plano Atual
              </h2>
              <p className="text-sm text-slate leading-relaxed mb-6">
                Esta funcionalidade está desativada no seu pacote atual.
                Para solicitar a ativação deste recurso (Agenda Online, Robô WhatsApp e automações),
                entre em contato com o suporte ou desenvolvedor responsável.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-navy hover:bg-navy-light text-white text-xs font-semibold transition-all shadow-md"
              >
                <LayoutDashboard className="w-4 h-4 text-gold" />
                <span>Retornar ao Dashboard</span>
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
