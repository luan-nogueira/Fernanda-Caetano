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
  Trash2,
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
  const [clearingDemo, setClearingDemo] = useState(false);

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

  async function handleClearDemoData() {
    if (
      !window.confirm(
        "Deseja remover todos os agendamentos e clientes fictícios de demonstração? Os procedimentos e configurações do site serão mantidos."
      )
    ) {
      return;
    }
    setClearingDemo(true);
    try {
      await fetch("/api/admin/appointments?clearDemo=1", {
        method: "DELETE",
      });
      await loadOverview();
    } finally {
      setClearingDemo(false);
    }
  }

  const hasDemoAppointments = upcoming.some((a) =>
    a.id.startsWith("appt-demo-")
  );

  return (
    <div className="space-y-7">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-offwhite-border shadow-card">
        <div>
          <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-terracotta mb-1">
            Visão Geral da Clínica
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy tracking-tight">
            Central de Gestão — Dra. Fernanda Caetano
          </h1>
          <p className="text-sm font-medium text-slate mt-1">
            Acompanhe seus atendimentos, solicitações pendentes, página pública e
            status do Bot de WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/agenda"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Abrir Calendário Inteligente</span>
          </Link>
          <Link
            href="/admin/site"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-navy hover:bg-navy-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Palette className="w-4 h-4 text-gold" />
            <span>Editar Página Pública</span>
          </Link>
        </div>
      </div>

      {/* Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-navy text-xs font-bold uppercase tracking-wider mb-3">
            <span>Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-terracotta/15 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-terracotta" />
            </div>
          </div>
          <p className="font-sans text-3xl font-extrabold text-navy tracking-tight">
            {kpis.todayCount}
          </p>
          <span className="text-xs font-semibold text-slate mt-1 block">
            Atendimentos hoje
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-navy text-xs font-bold uppercase tracking-wider mb-3">
            <span>No Mês</span>
            <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-navy" />
            </div>
          </div>
          <p className="font-sans text-3xl font-extrabold text-navy tracking-tight">
            {kpis.monthCount}
          </p>
          <span className="text-xs font-semibold text-slate mt-1 block">
            Agendados no mês
          </span>
        </div>

        <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-300 shadow-card">
          <div className="flex items-center justify-between text-amber-950 text-xs font-bold uppercase tracking-wider mb-3">
            <span>Pendentes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <p className="font-sans text-3xl font-extrabold text-amber-950 tracking-tight">
            {kpis.pendingCount}
          </p>
          <span className="text-xs font-bold text-amber-900 mt-1 block">
            Aguardando aprovação
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-navy text-xs font-bold uppercase tracking-wider mb-3">
            <span>Procedimentos</span>
            <div className="w-8 h-8 rounded-lg bg-gold/25 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold-dark" />
            </div>
          </div>
          <p className="font-sans text-3xl font-extrabold text-navy tracking-tight">
            {kpis.activeProceduresCount}
          </p>
          <span className="text-xs font-semibold text-slate mt-1 block">
            Ativos no catálogo
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-navy text-xs font-bold uppercase tracking-wider mb-3">
            <span>Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-navy" />
            </div>
          </div>
          <p className="font-sans text-3xl font-extrabold text-navy tracking-tight">
            {kpis.totalClientsCount}
          </p>
          <span className="text-xs font-semibold text-slate mt-1 block">
            Cadastrados
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card">
          <div className="flex items-center justify-between text-navy text-xs font-bold uppercase tracking-wider mb-3">
            <span>Cancelados</span>
            <div className="w-8 h-8 rounded-lg bg-slate/10 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-slate" />
            </div>
          </div>
          <p className="font-sans text-3xl font-extrabold text-navy tracking-tight">
            {kpis.cancelledCount}
          </p>
          <span className="text-xs font-semibold text-slate mt-1 block">
            Histórico geral
          </span>
        </div>
      </div>

      {/* Banner de Status do Bot do WhatsApp + Atalhos */}
      <div className="bg-navy text-white rounded-3xl p-6 border border-gold/40 shadow-luxury flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 text-gold flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-serif text-xl font-bold text-white">
                WhatsApp Bot de Lembretes & Notificações
              </h2>
              <span
                className={`text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full ${
                  waBot?.status === "connected"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/50"
                    : "bg-amber-500/25 text-amber-200 border border-amber-400/50"
                }`}
              >
                {waBot?.status === "connected"
                  ? "Conectado"
                  : "Aguardando QR Code"}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white/90 mt-1">
              {waBot?.status === "connected"
                ? `Aparelho conectado (${waBot.connected_phone}). Os clientes e a Dra. Fernanda estão recebendo confirmações e lembretes automaticamente.`
                : "Conecte o WhatsApp da Dra. Fernanda via QR Code para disparar lembretes automáticos aos pacientes e alertas no celular dela."}
            </p>
          </div>
        </div>

        <Link
          href="/admin/whatsapp"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
        >
          <span>Gerenciar QR Code & Mensagens</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Próximos Atendimentos e Solicitações Pendentes */}
      <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-serif text-2xl font-bold text-navy">
                Próximos Atendimentos na Agenda
              </h2>
              {hasDemoAppointments && (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Contém Dados Fictícios de Demonstração
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate mt-0.5">
              Confirme solicitações pendentes ou abra a agenda visual para ver o
              mês completo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hasDemoAppointments && (
              <button
                type="button"
                onClick={handleClearDemoData}
                disabled={clearingDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {clearingDemo
                    ? "Limpando..."
                    : "Limpar Dados Fictícios de Teste"}
                </span>
              </button>
            )}
            <Link
              href="/admin/agenda"
              className="text-xs sm:text-sm font-bold text-terracotta hover:underline inline-flex items-center gap-1"
            >
              <span>Ver Agenda Completa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-sm font-semibold text-navy py-8 text-center">
            Carregando compromissos...
          </p>
        ) : upcoming.length === 0 ? (
          <div className="p-8 rounded-2xl bg-offwhite border border-offwhite-border text-center space-y-2">
            <p className="text-base font-bold text-navy">
              Nenhum agendamento futuro registrado.
            </p>
            <p className="text-xs font-medium text-slate">
              A agenda está limpa e pronta para receber agendamentos reais.
            </p>
            <Link
              href="/admin/agenda"
              className="inline-block text-xs sm:text-sm font-bold text-terracotta underline pt-1"
            >
              Criar agendamento manual na Agenda
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-offwhite-border text-xs font-bold uppercase tracking-wider text-navy bg-offwhite/60">
                  <th className="py-3.5 px-4 rounded-tl-xl">Data & Hora</th>
                  <th className="py-3.5 px-4">Paciente</th>
                  <th className="py-3.5 px-4">Procedimento · Unidade</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right rounded-tr-xl">
                    Ações Rápidas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-offwhite-border">
                {upcoming.map((appt) => (
                  <tr
                    key={appt.id}
                    className="hover:bg-offwhite/60 transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-navy whitespace-nowrap">
                      {formatBRDate(appt.appointment_date)} •{" "}
                      <span className="font-extrabold text-terracotta">
                        {appt.start_time}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-navy text-sm">
                        {appt.client_name_snapshot}
                      </p>
                      <p className="text-xs font-semibold text-slate mt-0.5">
                        {appt.client_phone_snapshot}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-navy text-sm">
                        {appt.procedure_name_snapshot}
                      </p>
                      <span className="text-xs font-semibold text-slate mt-0.5 block">
                        Unidade: {appt.unit_name_snapshot} (
                        {appt.duration_minutes} min)
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {appt.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Confirmado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                      {appt.status === "pending" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickStatus(appt.id, "confirmed")
                          }
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                        >
                          Confirmar
                        </button>
                      )}
                      <Link
                        href={`/admin/agenda?date=${appt.appointment_date}`}
                        className="px-3.5 py-2 rounded-lg bg-navy/10 hover:bg-navy hover:text-white text-navy text-xs font-bold inline-block transition-colors"
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

