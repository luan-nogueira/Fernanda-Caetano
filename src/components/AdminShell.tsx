"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    href: "/admin/agenda",
    label: "Agenda de Atendimentos",
    icon: Calendar,
    badge: "Principal",
  },
  {
    href: "/admin/cursos",
    label: "Cursos & Área de Alunos",
    icon: GraduationCap,
    badge: "Novo",
  },
  {
    href: "/admin/site",
    label: "Editor da Página Pública",
    icon: Palette,
  },
  {
    href: "/admin/whatsapp",
    label: "WhatsApp Bot & QR Code",
    icon: QrCode,
    badge: "Bot",
  },
  {
    href: "/admin/procedimentos",
    label: "Procedimentos & Categorias",
    icon: Sparkles,
  },
  {
    href: "/admin/unidades",
    label: "Unidades de Atendimento",
    icon: Building2,
  },
  {
    href: "/admin/horarios",
    label: "Horários & Bloqueios",
    icon: Clock,
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    href: "/admin/notificacoes",
    label: "Notificações",
    icon: Bell,
  },
  {
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
          setAuthChecked(true);
        }
      })
      .catch(() => {
        router.replace("/admin/login");
      });
  }, [isLoginPage, router, pathname]);

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
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gold-dark to-gold flex items-center justify-center text-navy font-serif font-semibold text-base shadow-luxury">
            FC
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

  const todayFormatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-offwhite flex flex-col lg:flex-row">
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
          <div>
            <span className="font-serif text-lg font-semibold block leading-none">
              Fernanda Caetano
            </span>
            <span className="text-[10px] text-gold uppercase tracking-widest">
              Painel Administrativo
            </span>
          </div>
        </div>

        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-medium text-offwhite"
        >
          <span>Ver Site</span>
          <ExternalLink className="w-3.5 h-3.5 text-gold" />
        </Link>
      </header>

      {/* Sidebar Desktop + Drawer Mobile */}
      <aside
        className={`${
          mobileOpen ? "fixed inset-0 top-16 z-30 block" : "hidden"
        } lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex lg:flex-col bg-navy text-offwhite border-r border-gold/25 shrink-0 overflow-y-auto`}
      >
        <div className="hidden lg:flex items-center gap-3.5 px-6 py-6 border-b border-white/15">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-gold-dark to-gold flex items-center justify-center text-navy font-serif font-extrabold text-lg shadow-sm">
            FC
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-white leading-tight tracking-tight">
              Fernanda Caetano
            </h1>
            <p className="text-xs text-gold-light font-semibold">
              Gestão de Consultório & Site
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-gold"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
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
          </div>

          <div className="flex items-center gap-2.5">
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
          {children}
        </main>
      </div>
    </div>
  );
}

