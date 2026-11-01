"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Appointment,
  AppointmentStatus,
  Procedure,
  ScheduleBlock,
  Unit,
} from "@/types/domain";
import {
  Ban,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Filter,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  UserX,
  X,
  XCircle,
} from "lucide-react";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAYS_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function formatLongDayLabel(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const monthName = (MONTH_NAMES[m - 1] || "").toLowerCase();
  return `Dia ${d} de ${monthName}`;
}

function formatBRDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function AdminAgendaPage() {
  // Inicializamos em Novembro de 2026 com o dia 12 de novembro selecionado (onde estão Mariana Silva, Ana Costa e Juliana Martins!)
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(11); // Novembro
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-12");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Filtros
  const [filterUnit, setFilterUnit] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProcedure, setFilterProcedure] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal de Agendamento Manual / Edição
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Campos do formulário de novo agendamento / edição
  const [formClientName, setFormClientName] = useState("");
  const [formClientPhone, setFormClientPhone] = useState("");
  const [formProcedureId, setFormProcedureId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formDate, setFormDate] = useState("2026-11-12");
  const [formTime, setFormTime] = useState("09:00");
  const [formStatus, setFormStatus] = useState<AppointmentStatus>("confirmed");
  const [formNotes, setFormNotes] = useState("");
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Campos de bloqueio
  const [blockDate, setBlockDate] = useState("2026-11-12");
  const [blockFullDay, setBlockFullDay] = useState(true);
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("Bloqueio administrativo");

  async function loadAllData() {
    const [apptRes, procRes, schedRes] = await Promise.all([
      fetch(`/api/admin/appointments`),
      fetch(`/api/admin/procedures`),
      fetch(`/api/admin/schedule`),
    ]);

    const apptData = await apptRes.json();
    const procData = await procRes.json();
    const schedData = await schedRes.json();

    if (apptData.appointments) setAppointments(apptData.appointments);
    if (apptData.blocks) setBlocks(apptData.blocks);
    if (procData.procedures) {
      setProcedures(procData.procedures);
      if (!formProcedureId && procData.procedures.length > 0) {
        setFormProcedureId(procData.procedures[0].id);
      }
    }
    if (schedData.units) {
      setUnits(schedData.units);
      if (!formUnitId && schedData.units.length > 0) {
        setFormUnitId(schedData.units[0].id);
      }
    }
  }

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplicar filtros
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (filterUnit !== "all" && a.unit_id !== filterUnit) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterProcedure !== "all" && a.procedure_id !== filterProcedure)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.client_name_snapshot.toLowerCase().includes(q);
        const matchPhone = a.client_phone_snapshot.includes(q);
        const matchCode = a.booking_code.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode) return false;
      }
      return true;
    });
  }, [appointments, filterUnit, filterStatus, filterProcedure, searchQuery]);

  // Agrupamento por data
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of filteredAppointments) {
      if (!map[a.appointment_date]) map[a.appointment_date] = [];
      map[a.appointment_date].push(a);
    }
    return map;
  }, [filteredAppointments]);

  const blocksByDate = useMemo(() => {
    const map: Record<string, ScheduleBlock[]> = {};
    for (const b of blocks) {
      if (!map[b.block_date]) map[b.block_date] = [];
      map[b.block_date].push(b);
    }
    return map;
  }, [blocks]);

  // Células do mês
  const monthCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string }> = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [calYear, calMonth]);

  // Dias da semana ao redor da data selecionada (para a visualização Semanal)
  const weekDates = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map((n) => parseInt(n, 10));
    const current = new Date(y, m - 1, d);
    const dayOfWeek = current.getDay();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    const list: Array<{ dateStr: string; dayNum: number; weekday: string }> = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(startOfWeek);
      dt.setDate(startOfWeek.getDate() + i);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      list.push({
        dateStr: `${yy}-${mm}-${dd}`,
        dayNum: dt.getDate(),
        weekday: WEEKDAYS_FULL[i],
      });
    }
    return list;
  }, [selectedDate]);

  const selectedDayAppointments = useMemo(() => {
    return appointmentsByDate[selectedDate] || [];
  }, [appointmentsByDate, selectedDate]);

  const selectedDayBlocks = useMemo(() => {
    return blocksByDate[selectedDate] || [];
  }, [blocksByDate, selectedDate]);

  function handlePrevMonth() {
    if (calMonth === 1) {
      setCalYear((y) => y - 1);
      setCalMonth(12);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (calMonth === 12) {
      setCalYear((y) => y + 1);
      setCalMonth(1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadAllData();
  }

  function openCreateModalForSelectedDate() {
    setEditingAppointment(null);
    setFormClientName("");
    setFormClientPhone("");
    setFormDate(selectedDate);
    setFormTime("10:00");
    setFormStatus("confirmed");
    setFormNotes("");
    setFormFeedback(null);
    setShowNewModal(true);
  }

  function openEditModal(appt: Appointment) {
    setEditingAppointment(appt);
    setFormClientName(appt.client_name_snapshot);
    setFormClientPhone(appt.client_phone_snapshot);
    setFormProcedureId(appt.procedure_id);
    setFormUnitId(appt.unit_id);
    setFormDate(appt.appointment_date);
    setFormTime(appt.start_time);
    setFormStatus(appt.status);
    setFormNotes(appt.admin_notes || appt.client_notes || "");
    setFormFeedback(null);
    setShowNewModal(true);
  }

  async function handleSaveAppointment(e: React.FormEvent) {
    e.preventDefault();
    setFormFeedback(null);

    if (editingAppointment) {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAppointment.id,
          procedureId: formProcedureId,
          unitId: formUnitId,
          appointmentDate: formDate,
          startTime: formTime,
          status: formStatus,
          adminNotes: formNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormFeedback(data.error || "Erro ao atualizar agendamento.");
        return;
      }
    } else {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: formClientName,
          clientPhone: formClientPhone,
          procedureId: formProcedureId,
          unitId: formUnitId,
          appointmentDate: formDate,
          startTime: formTime,
          status: formStatus,
          clientNotes: formNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormFeedback(data.error || "Erro ao criar agendamento.");
        return;
      }
    }

    setShowNewModal(false);
    setSelectedDate(formDate);
    loadAllData();
  }

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_block",
        block_date: blockDate,
        is_full_day: blockFullDay,
        start_time: blockStart,
        end_time: blockEnd,
        reason: blockReason,
      }),
    });
    setShowBlockModal(false);
    loadAllData();
  }

  async function handleDeleteBlock(id: string) {
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_block", id }),
    });
    loadAllData();
  }

  function renderStatusBadge(status: AppointmentStatus) {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Confirmado
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            Concluído
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] font-semibold">
            <UserX className="w-3 h-3" />
            Ausência
          </span>
        );
      case "cancelled":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-semibold">
            <XCircle className="w-3 h-3" />
            Cancelado
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho + Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Controle Inteligente da Rotina
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Agenda de Atendimentos
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Clique em qualquer dia no calendário para gerenciar horários,
            confirmar solicitações ou bloquear períodos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setBlockDate(selectedDate);
              setShowBlockModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-offwhite-warm text-navy border border-offwhite-border text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Ban className="w-4 h-4 text-terracotta" />
            <span>Bloquear Horário / Dia</span>
          </button>

          <button
            type="button"
            onClick={openCreateModalForSelectedDate}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento Manual</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por paciente, telefone ou código..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-offwhite-border bg-offwhite/40 text-xs sm:text-sm text-navy focus:outline-none focus:border-navy"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gold-dark shrink-0" />
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-offwhite-border bg-offwhite/40 text-xs sm:text-sm text-navy"
          >
            <option value="all">Todas as Unidades</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.short_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-offwhite-border bg-offwhite/40 text-xs sm:text-sm text-navy"
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmados</option>
            <option value="pending">Pendentes</option>
            <option value="completed">Concluídos</option>
            <option value="cancelled">Cancelados</option>
            <option value="no_show">Ausências</option>
          </select>
        </div>

        <div>
          <select
            value={filterProcedure}
            onChange={(e) => setFilterProcedure(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-offwhite-border bg-offwhite/40 text-xs sm:text-sm text-navy"
          >
            <option value="all">Todos os Procedimentos</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COMPONENTE CENTRAL: CALENDÁRIO VISUAL + PAINEL LATERAL DO DIA (Exatamente como a prévia recomendada pelo usuário) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CALENDÁRIO (7 Colunas no Desktop) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-luxury space-y-5">
          {/* Topo do Card: Seletor Dia | Semana | Mês + Mês/Ano */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-offwhite-border">
            <div className="inline-flex rounded-xl bg-offwhite p-1 border border-offwhite-border">
              {(
                [
                  { id: "day", label: "Dia" },
                  { id: "week", label: "Semana" },
                  { id: "month", label: "Mês" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === tab.id
                      ? "bg-navy text-offwhite shadow-sm"
                      : "text-slate hover:text-navy"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-serif text-xl sm:text-2xl font-semibold text-navy min-w-[170px] text-center">
                {MONTH_NAMES[calMonth - 1]} de {calYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VISUALIZAÇÃO 1: MÊS */}
          {viewMode === "month" && (
            <div>
              <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                {WEEKDAYS_SHORT.map((d, idx) => (
                  <div
                    key={idx}
                    className="text-xs font-bold text-slate uppercase py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {monthCells.map((cell) => {
                  if (!cell.day) {
                    return <div key={cell.dateStr} className="h-14 sm:h-16" />;
                  }

                  const dayAppts = appointmentsByDate[cell.dateStr] || [];
                  const activeAppts = dayAppts.filter(
                    (a) => a.status !== "cancelled"
                  );
                  const hasPending = activeAppts.some(
                    (a) => a.status === "pending"
                  );
                  const dayBlocked =
                    (blocksByDate[cell.dateStr] || []).length > 0;
                  const isSelected = selectedDate === cell.dateStr;

                  return (
                    <button
                      key={cell.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`h-14 sm:h-16 rounded-2xl p-1.5 flex flex-col items-center justify-between border transition-all relative ${
                        isSelected
                          ? "bg-navy text-offwhite border-navy shadow-md scale-[1.02]"
                          : activeAppts.length > 0
                          ? "bg-terracotta-50/70 hover:bg-terracotta-100/70 text-navy border-terracotta/30"
                          : dayBlocked
                          ? "bg-red-50/60 text-slate border-red-200"
                          : "bg-offwhite/40 hover:bg-offwhite text-navy border-offwhite-border"
                      }`}
                    >
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected ? "text-gold" : "text-navy"
                        }`}
                      >
                        {cell.day}
                      </span>

                      <div className="flex items-center gap-1">
                        {activeAppts.length > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? "bg-terracotta text-white"
                                : hasPending
                                ? "bg-amber-200 text-amber-900"
                                : "bg-navy text-offwhite"
                            }`}
                          >
                            {activeAppts.length}
                          </span>
                        )}
                        {dayBlocked && (
                          <span
                            title="Possui bloqueio"
                            className="w-2 h-2 rounded-full bg-red-500"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO 2: SEMANA */}
          {viewMode === "week" && (
            <div className="space-y-2.5">
              {weekDates.map((w) => {
                const dayAppts = appointmentsByDate[w.dateStr] || [];
                const isSelected = selectedDate === w.dateStr;
                return (
                  <div
                    key={w.dateStr}
                    onClick={() => setSelectedDate(w.dateStr)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-navy text-offwhite border-gold"
                        : "bg-offwhite/50 hover:bg-white text-navy border-offwhite-border"
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-semibold uppercase ${
                          isSelected ? "text-gold" : "text-slate"
                        }`}
                      >
                        {w.weekday}
                      </span>
                      <p className="font-serif text-lg font-semibold">
                        {formatBRDate(w.dateStr)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          dayAppts.length > 0
                            ? "bg-terracotta text-white"
                            : "bg-white/10 text-slate"
                        }`}
                      >
                        {dayAppts.length} atendimento(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISUALIZAÇÃO 3: DIA (Linha do Tempo Detalhada) */}
          {viewMode === "day" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-offwhite p-3.5 rounded-2xl">
                <span className="font-serif text-lg font-semibold text-navy">
                  Linha do Tempo — {formatLongDayLabel(selectedDate)}
                </span>
                <span className="text-xs font-semibold text-terracotta">
                  {selectedDayAppointments.length} agendamento(s)
                </span>
              </div>

              {[
                "08:30",
                "09:00",
                "10:00",
                "11:00",
                "11:30",
                "13:30",
                "14:00",
                "15:00",
                "16:00",
                "17:00",
              ].map((hour) => {
                const match = selectedDayAppointments.find(
                  (a) => a.start_time === hour
                );
                return (
                  <div
                    key={hour}
                    className="flex items-center gap-3 p-3 rounded-xl border border-offwhite-border bg-offwhite/30"
                  >
                    <span className="font-mono text-xs font-bold text-navy w-14">
                      {hour}
                    </span>
                    {match ? (
                      <div className="flex-1 flex items-center justify-between bg-white p-2.5 rounded-xl border border-gold/40">
                        <div>
                          <p className="text-xs font-bold text-navy">
                            {match.client_name_snapshot}
                          </p>
                          <p className="text-[11px] text-slate">
                            {match.procedure_name_snapshot} ·{" "}
                            {match.unit_name_snapshot}
                          </p>
                        </div>
                        {renderStatusBadge(match.status)}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAppointment(null);
                          setFormDate(selectedDate);
                          setFormTime(hour);
                          setShowNewModal(true);
                        }}
                        className="text-xs text-slate hover:text-terracotta font-medium"
                      >
                        + Horário livre (Clique para agendar)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legenda Visual Acessível */}
          <div className="pt-3 border-t border-offwhite-border flex flex-wrap items-center justify-between gap-3 text-xs text-slate">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Confirmado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Pendente de aprovação
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Bloqueio de agenda
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCalYear(2026);
                setCalMonth(11);
                setSelectedDate("2026-11-12");
              }}
              className="text-xs font-semibold text-terracotta hover:underline"
            >
              Ir para 12 de novembro (Demo)
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: PAINEL DO DIA SELECIONADO (5 Colunas no Desktop — Fiel ao modelo ilustrativo do prompt) */}
        <div className="lg:col-span-5 bg-navy text-offwhite rounded-3xl p-6 sm:p-7 border border-gold/30 shadow-luxury space-y-5">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gold block">
                Programação Diária
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-offwhite mt-0.5">
                {formatLongDayLabel(selectedDate)}
              </h2>
              <p className="text-xs text-gold mt-1 font-medium">
                {selectedDayAppointments.length}{" "}
                {selectedDayAppointments.length === 1
                  ? "atendimento"
                  : "atendimentos"}
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModalForSelectedDate}
              className="px-3.5 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Encaixar</span>
            </button>
          </div>

          {/* Bloqueios ativos na data */}
          {selectedDayBlocks.length > 0 && (
            <div className="space-y-2">
              {selectedDayBlocks.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-red-500/15 border border-red-400/30 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <strong className="text-red-200 block">
                      🔒{" "}
                      {b.is_full_day
                        ? "Dia Inteiro Bloqueado"
                        : `Bloqueio: ${b.start_time} às ${b.end_time}`}
                    </strong>
                    <span className="text-offwhite/80">{b.reason}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(b.id)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px]"
                  >
                    Desbloquear
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Lista de Atendimentos do Dia (Layout: 09:00 | Mariana Silva | Laserterapia · Platinum | Confirmado) */}
          {selectedDayAppointments.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <CalendarIcon className="w-8 h-8 text-gold mx-auto opacity-80" />
              <div>
                <p className="text-sm font-semibold text-offwhite">
                  Nenhum atendimento agendado para este dia
                </p>
                <p className="text-xs text-offwhite/70 mt-1">
                  Os horários de expediente estão livres na página pública.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModalForSelectedDate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gold text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar agendamento neste dia</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {selectedDayAppointments.map((appt) => {
                const waDigits = (appt.client_phone_snapshot || "").replace(
                  /\D/g,
                  ""
                );
                return (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl bg-white text-navy border border-gold/40 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="px-2.5 py-1.5 rounded-xl bg-navy text-gold font-mono text-xs sm:text-sm font-bold shrink-0">
                          {appt.start_time}
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-navy leading-snug">
                            {appt.client_name_snapshot}
                          </h3>
                          <p className="text-xs font-medium text-slate">
                            {appt.procedure_name_snapshot} ·{" "}
                            <strong className="text-navy">
                              {appt.unit_name_snapshot}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {renderStatusBadge(appt.status)}
                    </div>

                    {(appt.client_notes || appt.admin_notes) && (
                      <p className="text-xs text-slate bg-offwhite px-3 py-2 rounded-xl border border-offwhite-border">
                        {appt.admin_notes || appt.client_notes}
                      </p>
                    )}

                    {/* Controles Administrativos de 1 Clique */}
                    <div className="pt-2 border-t border-offwhite-border flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {appt.status === "pending" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(appt.id, "confirmed")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirmar</span>
                          </button>
                        )}

                        {appt.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(appt.id, "completed")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy hover:bg-navy-800 text-white text-[11px] font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3 text-gold" />
                            <span>Concluir</span>
                          </button>
                        )}

                        {appt.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(appt.id, "cancelled")
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {waDigits && (
                          <a
                            href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                              `Olá ${appt.client_name_snapshot}! Tudo bem? Aqui é do consultório da Dra. Fernanda Caetano sobre seu agendamento de ${appt.procedure_name_snapshot} em ${formatBRDate(
                                appt.appointment_date
                              )} às ${appt.start_time}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-offwhite hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Chamar paciente no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(appt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-offwhite hover:bg-navy hover:text-white text-navy text-[11px] font-semibold transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar / Reagendar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CRIAR OU EDITAR/REAGENDAR ATENDIMENTO */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-gold/40 shadow-luxury space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-offwhite-border pb-3">
              <h3 className="font-serif text-2xl font-semibold text-navy">
                {editingAppointment
                  ? "Editar / Reagendar Atendimento"
                  : "Novo Agendamento Manual"}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-xl bg-offwhite text-slate hover:text-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formFeedback && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                {formFeedback}
              </div>
            )}

            <form onSubmit={handleSaveAppointment} className="space-y-4">
              {!editingAppointment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Nome do Paciente *
                    </label>
                    <input
                      type="text"
                      required
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="Ex.: Mariana Silva"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="text"
                      required
                      value={formClientPhone}
                      onChange={(e) => setFormClientPhone(e.target.value)}
                      placeholder="5522999999999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Procedimento *
                </label>
                <select
                  value={formProcedureId}
                  onChange={(e) => setFormProcedureId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                >
                  {procedures.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Unidade *
                  </label>
                  <select
                    value={formUnitId}
                    onChange={(e) => setFormUnitId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as AppointmentStatus)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendente</option>
                    <option value="completed">Concluído</option>
                    <option value="no_show">Ausência</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Horário (Início) *
                  </label>
                  <input
                    type="time"
                    required
                    step={900}
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Observações Administrativas
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-offwhite text-navy text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm"
                >
                  Salvar na Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BLOQUEAR DIA OU HORÁRIO */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gold/40 shadow-luxury space-y-4">
            <div className="flex items-center justify-between border-b border-offwhite-border pb-3">
              <h3 className="font-serif text-2xl font-semibold text-navy">
                Bloquear Data ou Horário
              </h3>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="p-1.5 rounded-xl bg-offwhite text-slate hover:text-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Data do Bloqueio
                </label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockFullDay}
                  onChange={(e) => setBlockFullDay(e.target.checked)}
                  className="w-4 h-4 accent-terracotta"
                />
                <span>Bloquear o dia inteiro em todas as unidades</span>
              </label>

              {!blockFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Das
                    </label>
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Até
                    </label>
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Motivo do Bloqueio
                </label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex.: Congresso, Férias, Compromisso externo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl bg-offwhite text-navy text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

