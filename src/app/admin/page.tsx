"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Appointment } from "@/types/domain";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  Clock,
  Palette,
  QrCode,
  Sparkles,
  Users,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function formatBRDate(dateStr: string) {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState({
    todayCount: 0,
    monthCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    activeProceduresCount: 0,
    totalClientsCount: 0,
  });
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [waBot, setWaBot] = useState<{
    status: string;
    connected_phone?: string;
    connected_name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json();
      if (data.kpis) setKpis(data.kpis);
      if (data.upcomingAppointments) setUpcoming(data.upcomingAppointments);
      if (data.whatsappBot) setWaBot(data.whatsappBot);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleQuickStatus(id: string, status: string) {
    await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadOverview();
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Visão Geral da Clínica
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Central de Gestão — Dra. Fernanda Caetano
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Acompanhe seus atendimentos, solicitações pendentes, página pública e
            status do Bot de WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/agenda"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Abrir Calendário Inteligente</span>
          </Link>
          <Link
            href="/admin/site"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs sm:text-sm font-semibold transition-all"
          >
            <Palette className="w-4 h-4 text-gold" />
            <span>Editar Linktree</span>
          </Link>
        </div>
      </div>

      {/* Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-slate text-xs mb-2">
            <span>Hoje</span>
            <CalendarCheck className="w-4 h-4 text-terracotta" />
          </div>
          <p className="font-serif text-3xl font-bold text-navy">
            {kpis.todayCount}
          </p>
          <span className="text-[11px] text-slate">Atendimentos hoje</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-slate text-xs mb-2">
            <span>No Mês</span>
            <Calendar className="w-4 h-4 text-navy" />
          </div>
          <p className="font-serif text-3xl font-bold text-navy">
            {kpis.monthCount}
          </p>
          <span className="text-[11px] text-slate">Agendados no mês</span>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-card">
          <div className="flex items-center justify-between text-amber-900 text-xs mb-2 font-medium">
            <span>Pendentes</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-3xl font-bold text-amber-900">
            {kpis.pendingCount}
          </p>
          <span className="text-[11px] text-amber-800">
            Aguardando aprovação
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-slate text-xs mb-2">
            <span>Procedimentos</span>
            <Sparkles className="w-4 h-4 text-gold-dark" />
          </div>
          <p className="font-serif text-3xl font-bold text-navy">
            {kpis.activeProceduresCount}
          </p>
          <span className="text-[11px] text-slate">Ativos no catálogo</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-slate text-xs mb-2">
            <span>Clientes</span>
            <Users className="w-4 h-4 text-navy" />
          </div>
          <p className="font-serif text-3xl font-bold text-navy">
            {kpis.totalClientsCount}
          </p>
          <span className="text-[11px] text-slate">Cadastrados</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-slate text-xs mb-2">
            <span>Cancelados</span>
            <XCircle className="w-4 h-4 text-slate" />
          </div>
          <p className="font-serif text-3xl font-bold text-navy">
            {kpis.cancelledCount}
          </p>
          <span className="text-[11px] text-slate">Histórico geral</span>
        </div>
      </div>

      {/* Banner de Status do Bot do WhatsApp + Atalhos */}
      <div className="bg-navy text-offwhite rounded-3xl p-6 border border-gold/30 shadow-luxury flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-gold flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-semibold">
                WhatsApp Bot de Lembretes & Notificações
              </h2>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  waBot?.status === "connected"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                }`}
              >
                {waBot?.status === "connected"
                  ? "Conectado"
                  : "Aguardando QR Code"}
              </span>
            </div>
            <p className="text-xs text-offwhite/80 mt-1">
              {waBot?.status === "connected"
                ? `Aparelho conectado (${waBot.connected_phone}). Os clientes e a Dra. Fernanda estão recebendo confirmações e lembretes automaticamente.`
                : "Conecte o WhatsApp da Dra. Fernanda via QR Code para disparar lembretes automáticos aos pacientes e alertas no celular dela."}
            </p>
          </div>
        </div>

        <Link
          href="/admin/whatsapp"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all"
        >
          <span>Gerenciar QR Code & Mensagens</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Próximos Atendimentos e Solicitações Pendentes */}
      <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-navy">
              Próximos Atendimentos na Agenda
            </h2>
            <p className="text-xs text-slate">
              Confirme solicitações pendentes ou abra a agenda visual para ver o
              mês completo.
            </p>
          </div>
          <Link
            href="/admin/agenda"
            className="text-xs font-semibold text-terracotta hover:underline inline-flex items-center gap-1"
          >
            <span>Ver Agenda Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-slate py-6 text-center">
            Carregando compromissos...
          </p>
        ) : upcoming.length === 0 ? (
          <div className="p-8 rounded-2xl bg-offwhite text-center space-y-2">
            <p className="text-sm font-semibold text-navy">
              Nenhum agendamento futuro registrado.
            </p>
            <Link
              href="/admin/agenda"
              className="inline-block text-xs font-semibold text-terracotta underline"
            >
              Criar agendamento manual na Agenda
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-offwhite-border text-[11px] uppercase tracking-wider text-slate">
                  <th className="py-3 px-3">Data & Hora</th>
                  <th className="py-3 px-3">Paciente</th>
                  <th className="py-3 px-3">Procedimento · Unidade</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-offwhite-border">
                {upcoming.map((appt) => (
                  <tr key={appt.id} className="hover:bg-offwhite/50">
                    <td className="py-3.5 px-3 font-medium text-navy whitespace-nowrap">
                      {formatBRDate(appt.appointment_date)} •{" "}
                      <span className="font-bold text-terracotta">
                        {appt.start_time}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-navy">
                        {appt.client_name_snapshot}
                      </p>
                      <p className="text-[11px] text-slate">
                        {appt.client_phone_snapshot}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium text-navy">
                        {appt.procedure_name_snapshot}
                      </p>
                      <span className="text-[11px] text-slate">
                        Unidade: {appt.unit_name_snapshot} ({appt.duration_minutes}{" "}
                        min)
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {appt.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                      {appt.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(appt.id, "confirmed")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Confirmar
                        </button>
                      )}
                      <Link
                        href={`/admin/agenda?date=${appt.appointment_date}`}
                        className="px-3 py-1.5 rounded-lg bg-offwhite hover:bg-navy hover:text-white text-navy text-xs font-semibold inline-block"
                      >
                        Abrir no Dia
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

