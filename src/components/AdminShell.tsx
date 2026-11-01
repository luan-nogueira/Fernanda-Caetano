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
      <div className="min-h-screen bg-offwhite flex items-center justify-center text-navy text-sm font-medium">
        Carregando Central de Gestão...
      </div>
    );
  }

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
        <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gold-dark to-gold flex items-center justify-center text-navy font-serif font-bold text-lg">
            FC
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold text-offwhite leading-tight">
              Fernanda Caetano
            </h1>
            <p className="text-[11px] text-gold font-medium">
              Gestão de Consultório & Site
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-terracotta text-white shadow-sm"
                    : "text-offwhite/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-gold"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-white/10 text-gold"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-offwhite border border-gold/25 transition-colors"
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
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-offwhite/70 hover:text-white hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

