"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, QrCode } from "lucide-react";

interface NotificationRow {
  id: string;
  event_type: string;
  title: string;
  message: string;
  appointment_id: string | null;
  is_read: number;
  created_at: string;
}

export default function AdminNotificacoesPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  async function loadNotifications() {
    const res = await fetch("/api/admin/overview");
    const data = await res.json();
    if (data.notifications) setNotifications(data.notifications);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAllRead() {
    await fetch("/api/admin/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_notifications_read" }),
    });
    loadNotifications();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Alertas do Sistema
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Central de Notificações
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Acompanhe alertas internos de novos agendamentos, solicitações
            pendentes e integrações do WhatsApp Bot.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/whatsapp"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy text-offwhite text-xs font-semibold"
          >
            <QrCode className="w-4 h-4 text-gold" />
            <span>Configurar WhatsApp Bot</span>
          </Link>

          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-offwhite-border text-navy text-xs font-semibold"
          >
            <CheckCheck className="w-4 h-4 text-terracotta" />
            <span>Marcar todas como lidas</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-3">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate py-8 text-center">
            Nenhuma notificação registrada até o momento.
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                n.is_read
                  ? "bg-offwhite/40 border-offwhite-border"
                  : "bg-terracotta-50/60 border-terracotta/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy text-gold flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy">{n.title}</h3>
                  <p className="text-xs text-slate mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate/80 mt-1 block">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              <Link
                href="/admin/agenda"
                className="text-xs font-semibold text-terracotta hover:underline shrink-0"
              >
                Ver na Agenda
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

