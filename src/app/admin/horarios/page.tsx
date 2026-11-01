"use client";

import React, { useEffect, useState } from "react";
import {
  AvailabilityException,
  ScheduleBlock,
  ShiftWindow,
  Unit,
  WorkingHours,
} from "@/types/domain";
import {
  CalendarOff,
  Check,
  Clock,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { day: 0, label: "Domingo" },
  { day: 1, label: "Segunda-feira" },
  { day: 2, label: "Terça-feira" },
  { day: 3, label: "Quarta-feira" },
  { day: 4, label: "Quinta-feira" },
  { day: 5, label: "Sexta-feira" },
  { day: 6, label: "Sábado" },
];

export default function AdminHorariosPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("unit-farol");
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Estado editável dos 7 dias da unidade selecionada
  const [editableDays, setEditableDays] = useState<
    Array<{ day_of_week: number; is_open: boolean; shifts: ShiftWindow[] }>
  >([]);

  // Formulário de Feriado / Exceção
  const [excDate, setExcDate] = useState("2026-11-15");
  const [excTitle, setExcTitle] = useState("Feriado Nacional");
  const [excType, setExcType] = useState("holiday");

  async function loadScheduleData() {
    const res = await fetch("/api/admin/schedule");
    const data = await res.json();
    if (data.units) setUnits(data.units);
    if (data.workingHours) setWorkingHours(data.workingHours);
    if (data.blocks) setBlocks(data.blocks);
    if (data.exceptions) setExceptions(data.exceptions);
  }

  useEffect(() => {
    loadScheduleData();
  }, []);

  useEffect(() => {
    const unitWh = workingHours.filter((w) => w.unit_id === selectedUnitId);
    const list = DAYS_OF_WEEK.map((d) => {
      const found = unitWh.find((w) => Number(w.day_of_week) === d.day);
      let shifts: ShiftWindow[] = [
        { start: "08:30", end: "12:30" },
        { start: "13:30", end: "18:00" },
      ];
      if (found) {
        try {
          shifts = JSON.parse(found.shifts_json || "[]");
        } catch {
          shifts = [];
        }
      }
      return {
        day_of_week: d.day,
        is_open: found ? Boolean(found.is_open) : d.day !== 0,
        shifts,
      };
    });
    setEditableDays(list);
  }, [selectedUnitId, workingHours]);

  async function handleSaveWorkingHours() {
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_working_hours",
        unitId: selectedUnitId,
        schedule: editableDays,
      }),
    });
    setToast(
      "Horários de expediente salvos e calendário público atualizado imediatamente!"
    );
    setTimeout(() => setToast(null), 3500);
    loadScheduleData();
  }

  async function handleCreateException(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_exception",
        exception_date: excDate,
        title: excTitle,
        exception_type: excType,
        is_closed: true,
      }),
    });
    setToast("Feriado/Ausência cadastrado na agenda!");
    setTimeout(() => setToast(null), 3500);
    loadScheduleData();
  }

  async function handleDeleteException(id: string) {
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_exception", id }),
    });
    loadScheduleData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Regras de Disponibilidade
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Horários de Atendimento, Turnos & Feriados
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Configure os dias de funcionamento, intervalos de almoço e feriados
            de cada unidade.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveWorkingHours}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Expediente da Unidade</span>
        </button>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Seletor de Unidade */}
      <div className="flex flex-wrap items-center gap-2">
        {units.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setSelectedUnitId(u.id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedUnitId === u.id
                ? "bg-navy text-gold shadow-sm"
                : "bg-white text-slate hover:text-navy border border-offwhite-border"
            }`}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* Grade Semanal de Expediente */}
      <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4">
        <h2 className="font-serif text-2xl font-semibold text-navy flex items-center gap-2">
          <Clock className="w-5 h-5 text-terracotta" />
          <span>Expediente Semanal por Dia e Turno</span>
        </h2>

        <div className="space-y-3">
          {editableDays.map((item, idx) => {
            const dayLabel =
              DAYS_OF_WEEK.find((d) => d.day === item.day_of_week)?.label || "";
            return (
              <div
                key={item.day_of_week}
                className="p-4 rounded-2xl bg-offwhite/60 border border-offwhite-border flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-[180px]">
                  <input
                    type="checkbox"
                    checked={item.is_open}
                    onChange={(e) => {
                      const copy = [...editableDays];
                      copy[idx] = {
                        ...item,
                        is_open: e.target.checked,
                        shifts:
                          e.target.checked && item.shifts.length === 0
                            ? [{ start: "08:30", end: "17:30" }]
                            : item.shifts,
                      };
                      setEditableDays(copy);
                    }}
                    className="w-4 h-4 accent-terracotta"
                  />
                  <span className="font-semibold text-sm text-navy">
                    {dayLabel}
                  </span>
                </div>

                {!item.is_open ? (
                  <span className="text-xs font-medium text-slate">
                    Sem expediente neste dia
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    {item.shifts.map((shift, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-offwhite-border text-xs"
                      >
                        <span className="text-slate font-medium">
                          Turno {sIdx + 1}:
                        </span>
                        <input
                          type="time"
                          value={shift.start}
                          onChange={(e) => {
                            const copy = [...editableDays];
                            const nextShifts = [...item.shifts];
                            nextShifts[sIdx] = {
                              ...shift,
                              start: e.target.value,
                            };
                            copy[idx] = { ...item, shifts: nextShifts };
                            setEditableDays(copy);
                          }}
                          className="font-mono font-semibold text-navy"
                        />
                        <span>às</span>
                        <input
                          type="time"
                          value={shift.end}
                          onChange={(e) => {
                            const copy = [...editableDays];
                            const nextShifts = [...item.shifts];
                            nextShifts[sIdx] = {
                              ...shift,
                              end: e.target.value,
                            };
                            copy[idx] = { ...item, shifts: nextShifts };
                            setEditableDays(copy);
                          }}
                          className="font-mono font-semibold text-navy"
                        />
                        {item.shifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...editableDays];
                              copy[idx] = {
                                ...item,
                                shifts: item.shifts.filter(
                                  (_, i) => i !== sIdx
                                ),
                              };
                              setEditableDays(copy);
                            }}
                            className="text-red-500 hover:text-red-700 ml-1"
                            title="Remover turno"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...editableDays];
                        copy[idx] = {
                          ...item,
                          shifts: [
                            ...item.shifts,
                            { start: "13:30", end: "18:00" },
                          ],
                        };
                        setEditableDays(copy);
                      }}
                      className="text-xs font-semibold text-terracotta hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar turno</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feriados, Férias e Folgas */}
      <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-5">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-terracotta" />
          <h2 className="font-serif text-2xl font-semibold text-navy">
            Feriados, Férias e Folgas Programadas
          </h2>
        </div>

        <form
          onSubmit={handleCreateException}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-offwhite p-4 rounded-2xl border border-offwhite-border"
        >
          <input
            type="date"
            required
            value={excDate}
            onChange={(e) => setExcDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-offwhite-border bg-white text-xs sm:text-sm text-navy"
          />
          <input
            type="text"
            required
            value={excTitle}
            onChange={(e) => setExcTitle(e.target.value)}
            placeholder="Ex.: Feriado Proclamação da República"
            className="px-3 py-2 rounded-xl border border-offwhite-border bg-white text-xs sm:text-sm text-navy sm:col-span-2"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold"
          >
            + Cadastrar Data Fechada
          </button>
        </form>

        <div className="space-y-2">
          {exceptions.map((ex) => (
            <div
              key={ex.id}
              className="p-3.5 rounded-xl bg-offwhite/50 border border-offwhite-border flex items-center justify-between text-xs sm:text-sm"
            >
              <div>
                <strong className="text-navy">{ex.exception_date}</strong> —{" "}
                <span className="text-slate">{ex.title}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteException(ex.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {blocks.map((blk) => (
            <div
              key={blk.id}
              className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 flex items-center justify-between text-xs sm:text-sm"
            >
              <div>
                <strong className="text-red-900">
                  Bloqueio em {blk.block_date}
                </strong>{" "}
                —{" "}
                <span className="text-red-800">
                  {Boolean(blk.is_full_day)
                    ? "Dia Inteiro"
                    : `${blk.start_time} às ${blk.end_time}`}{" "}
                  ({blk.reason})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

