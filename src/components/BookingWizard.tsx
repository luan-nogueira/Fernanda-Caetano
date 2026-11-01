"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Procedure, SiteSettings, Unit } from "@/types/domain";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Info,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  User,
} from "lucide-react";

interface TimeSlotOption {
  time: string;
  endTime: string;
  shift: "morning" | "afternoon" | "evening";
}

interface DayAvailabilityResponse {
  date: string;
  isAvailable: boolean;
  reason?: string;
  totalSlots: number;
  shifts: {
    morning: TimeSlotOption[];
    afternoon: TimeSlotOption[];
    evening: TimeSlotOption[];
  };
}

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

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatBRDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function BookingWizard({
  procedures,
  units,
  settings,
  initialProcedureSlug,
  initialUnitSlug,
  todayStr,
}: {
  procedures: Procedure[];
  units: Unit[];
  settings: SiteSettings;
  initialProcedureSlug?: string;
  initialUnitSlug?: string;
  todayStr: string;
}) {
  const router = useRouter();

  // Resolver preseleção via querystring (procedimento e/ou unidade)
  const preselectedProc = useMemo(() => {
    if (!initialProcedureSlug) return null;
    return (
      procedures.find(
        (p) =>
          p.slug === initialProcedureSlug || p.id === initialProcedureSlug
      ) || null
    );
  }, [procedures, initialProcedureSlug]);

  const preselectedUnit = useMemo(() => {
    if (!initialUnitSlug) return null;
    return (
      units.find(
        (u) => u.slug === initialUnitSlug || u.id === initialUnitSlug
      ) || null
    );
  }, [units, initialUnitSlug]);

  const defaultProc = preselectedProc || procedures[0] || null;
  const defaultUnit =
    preselectedUnit ||
    units.find((u) => defaultProc?.unit_ids?.includes(u.id)) ||
    units[0] ||
    null;

  const [step, setStep] = useState<number>(preselectedProc ? 3 : 1);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>(
    defaultProc?.id || ""
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    defaultUnit?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-12");
  const [selectedShift, setSelectedShift] = useState<
    "morning" | "afternoon" | "evening" | ""
  >("morning");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Dados de identificação do cliente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [homeCareAddress, setHomeCareAddress] = useState("");
  const [lgpdAccepted, setLgpdAccepted] = useState(true);

  // Estado de carregamento de disponibilidade do mês e do dia
  const [calYear, setCalYear] = useState<number>(() =>
    parseInt(todayStr.slice(0, 4), 10)
  );
  const [calMonth, setCalMonth] = useState<number>(() =>
    parseInt(todayStr.slice(5, 7), 10)
  );
  const [monthDaysMap, setMonthDaysMap] = useState<
    Record<
      string,
      { date: string; isAvailable: boolean; totalSlots: number; reason?: string }
    >
  >({});
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [dayAvailability, setDayAvailability] =
    useState<DayAvailabilityResponse | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProcedure = useMemo(
    () => procedures.find((p) => p.id === selectedProcedureId) || null,
    [procedures, selectedProcedureId]
  );

  // Unidades elegíveis para o procedimento escolhido
  const availableUnitsForProcedure = useMemo(() => {
    if (!selectedProcedure) return units;
    if (selectedProcedure.unit_ids && selectedProcedure.unit_ids.length > 0) {
      return units.filter((u) => selectedProcedure.unit_ids?.includes(u.id));
    }
    return units;
  }, [selectedProcedure, units]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId) || null,
    [units, selectedUnitId]
  );

  // Pré-selecionar unidade se houver apenas 1 ou vier na URL
  useEffect(() => {
    if (!selectedProcedure) return;
    if (initialUnitSlug && !selectedUnitId) {
      const match = availableUnitsForProcedure.find(
        (u) => u.slug === initialUnitSlug || u.id === initialUnitSlug
      );
      if (match) {
        setSelectedUnitId(match.id);
        return;
      }
    }
    if (availableUnitsForProcedure.length === 1) {
      setSelectedUnitId(availableUnitsForProcedure[0].id);
    }
  }, [
    selectedProcedure,
    availableUnitsForProcedure,
    initialUnitSlug,
    selectedUnitId,
  ]);

  // Carregar mapa de disponibilidade mensal quando procedimento, unidade ou mês mudar
  useEffect(() => {
    if (!selectedProcedureId || !selectedUnitId) return;
    let active = true;
    setLoadingMonth(true);
    fetch(
      `/api/availability?procedureId=${encodeURIComponent(
        selectedProcedureId
      )}&unitId=${encodeURIComponent(
        selectedUnitId
      )}&year=${calYear}&month=${calMonth}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data?.days) {
          setMonthDaysMap(data.days);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (active) setLoadingMonth(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProcedureId, selectedUnitId, calYear, calMonth]);

  // Carregar turnos e horários quando data for selecionada
  useEffect(() => {
    if (!selectedProcedureId || !selectedUnitId || !selectedDate) return;
    let active = true;
    setLoadingDay(true);
    fetch(
      `/api/availability?procedureId=${encodeURIComponent(
        selectedProcedureId
      )}&unitId=${encodeURIComponent(
        selectedUnitId
      )}&date=${encodeURIComponent(selectedDate)}`
    )
      .then((r) => r.json())
      .then((data: DayAvailabilityResponse) => {
        if (!active) return;
        setDayAvailability(data);
        // Auto-selecionar o primeiro turno que tiver vaga
        if (data?.shifts) {
          if (data.shifts.morning.length > 0) setSelectedShift("morning");
          else if (data.shifts.afternoon.length > 0)
            setSelectedShift("afternoon");
          else if (data.shifts.evening.length > 0) setSelectedShift("evening");
          else setSelectedShift("");
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (active) setLoadingDay(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProcedureId, selectedUnitId, selectedDate]);

  // Gerar células do calendário mensal
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();
    const totalDays = new Date(calYear, calMonth, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: `empty-${i}` });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [calYear, calMonth]);

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

  async function handleConfirmBooking(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedureId: selectedProcedureId,
          unitId: selectedUnitId,
          appointmentDate: selectedDate,
          startTime: selectedTime,
          clientName,
          clientPhone,
          clientEmail,
          clientNotes,
          homeCareAddress,
          lgpdAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(
          data.error || "Não foi possível confirmar o agendamento."
        );
        setSubmitting(false);
        return;
      }

      const b = data.booking;
      const query = new URLSearchParams({
        code: b.bookingCode,
        status: b.status,
        proc: b.procedureName,
        unit: b.unitName,
        wa: b.unitWhatsapp,
        date: b.appointmentDate,
        time: b.startTime,
        end: b.endTime,
        name: b.clientName,
      });

      router.push(`/agendamento/sucesso?${query.toString()}`);
    } catch {
      setErrorMessage("Erro de conexão ao registrar agendamento.");
      setSubmitting(false);
    }
  }

  const stepsLabels = [
    { num: 1, title: "Procedimento" },
    { num: 2, title: "Unidade" },
    { num: 3, title: "Data" },
    { num: 4, title: "Turno & Horário" },
    { num: 5, title: "Seus Dados" },
    { num: 6, title: "Revisão" },
  ];

  const slotsForCurrentShift = useMemo(() => {
    if (!dayAvailability || !selectedShift) return [];
    return dayAvailability.shifts[selectedShift] || [];
  }, [dayAvailability, selectedShift]);

  return (
    <div className="space-y-6">
      {/* Barra de Progresso Elegante */}
      <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card">
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {stepsLabels.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num <= 4) setStep(s.num);
                }}
                className="flex items-center gap-2 shrink-0 px-2 py-1 cursor-pointer hover:opacity-80"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive
                      ? "bg-terracotta text-white shadow-sm scale-105"
                      : isCompleted
                      ? "bg-navy text-gold"
                      : "bg-offwhite text-slate border border-offwhite-border"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isActive
                      ? "text-navy font-semibold"
                      : isCompleted
                      ? "text-navy/80"
                      : "text-slate"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Resumo compacto das escolhas até o momento */}
        {selectedProcedure && (
          <div className="mt-3 pt-3 border-t border-offwhite-border flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-navy text-offwhite font-medium">
              {selectedProcedure.name} ({selectedProcedure.duration_minutes} min)
            </span>
            {selectedUnit && (
              <span className="px-2.5 py-1 rounded-lg bg-offwhite text-navy border border-offwhite-border font-medium">
                {selectedUnit.short_name}
              </span>
            )}
            {selectedDate && (
              <span className="px-2.5 py-1 rounded-lg bg-offwhite text-navy border border-offwhite-border font-medium">
                {formatBRDate(selectedDate)}
              </span>
            )}
            {selectedTime && (
              <span className="px-2.5 py-1 rounded-lg bg-terracotta/15 text-terracotta-dark font-semibold">
                às {selectedTime}
              </span>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-start gap-2.5">
          <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ETAPA 1: SELECIONAR PROCEDIMENTO */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
              Etapa 1 de 6
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
              Selecione o procedimento desejado
            </h2>
            <p className="text-xs sm:text-sm text-slate mt-0.5">
              Escolha o cuidado que deseja agendar com a Dra. Fernanda Caetano.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {procedures
              .filter((p) => Boolean(p.online_booking_enabled))
              .map((proc) => {
                const isSelected = selectedProcedureId === proc.id;
                return (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => {
                      setSelectedProcedureId(proc.id);
                      setSelectedUnitId("");
                      setSelectedDate("");
                      setSelectedTime("");
                      setStep(2);
                    }}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-navy text-offwhite border-gold shadow-luxury"
                        : "bg-offwhite/50 hover:bg-white text-navy border-offwhite-border hover:border-gold/60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-lg sm:text-xl font-semibold">
                          {proc.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-white/15 text-gold"
                              : "bg-navy/5 text-navy"
                          }`}
                        >
                          {proc.duration_minutes} min
                        </span>
                        {proc.modality === "domiciliar" && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-terracotta/20 text-terracotta">
                            Home Care
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs leading-relaxed ${
                          isSelected ? "text-offwhite/80" : "text-slate"
                        }`}
                      >
                        {proc.short_description}
                      </p>
                    </div>

                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-terracotta text-white"
                          : "bg-white text-navy border border-offwhite-border"
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ETAPA 2: SELECIONAR UNIDADE */}
      {step === 2 && selectedProcedure && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                Etapa 2 de 6
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                Escolha a unidade de atendimento
              </h2>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Unidades onde{" "}
                <strong className="text-navy">{selectedProcedure.name}</strong>{" "}
                está disponível:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:text-navy"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trocar procedimento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {availableUnitsForProcedure.map((unit) => {
              const isSelected = selectedUnitId === unit.id;
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setSelectedUnitId(unit.id);
                    setSelectedDate("");
                    setSelectedTime("");
                    setStep(3);
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-navy text-offwhite border-gold shadow-luxury"
                      : "bg-offwhite/50 hover:bg-white text-navy border-offwhite-border hover:border-gold/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-white/10 text-gold"
                          : "bg-navy text-gold"
                      }`}
                    >
                      {unit.modality === "domiciliar" ? (
                        <Home className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-semibold">
                        {unit.name}
                      </h3>
                      <p
                        className={`text-xs mt-0.5 ${
                          isSelected ? "text-gold" : "text-slate"
                        }`}
                      >
                        {unit.neighborhood_city}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isSelected ? "text-offwhite/80" : "text-navy/80"
                        }`}
                      >
                        {unit.address_line}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 shrink-0 text-terracotta" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ETAPA 3: SELECIONAR DATA */}
      {step === 3 && selectedProcedure && selectedUnit && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                Etapa 3 de 6
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                Selecione a data no calendário
              </h2>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Apenas datas com horários compatíveis com a duração de{" "}
                {selectedProcedure.duration_minutes} minutos estão habilitadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:text-navy"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>

          {/* Navegação do Mês */}
          <div className="flex items-center justify-between bg-offwhite px-4 py-3 rounded-2xl border border-offwhite-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-white text-navy transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="font-serif text-xl font-semibold text-navy">
                {MONTH_NAMES[calMonth - 1]} de {calYear}
              </span>
              {loadingMonth && (
                <span className="block text-[11px] text-slate">
                  Calculando disponibilidade real...
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-white text-navy transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Grade de Dias da Semana */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-[11px] font-semibold uppercase tracking-wider text-slate py-1"
              >
                {w}
              </div>
            ))}

            {calendarCells.map((cell) => {
              if (!cell.day) {
                return <div key={cell.dateStr} className="h-12" />;
              }

              const dayInfo = monthDaysMap[cell.dateStr];
              const isPast = cell.dateStr < todayStr;
              const isAvailable = !isPast && Boolean(dayInfo?.isAvailable);
              const isSelected = selectedDate === cell.dateStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    setSelectedDate(cell.dateStr);
                    setSelectedTime("");
                    setStep(4);
                  }}
                  title={
                    isAvailable
                      ? `${dayInfo?.totalSlots} horários livres`
                      : dayInfo?.reason || "Indisponível"
                  }
                  className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center transition-all border text-sm font-semibold relative ${
                    isSelected
                      ? "bg-terracotta text-white border-terracotta shadow-sm"
                      : isAvailable
                      ? "bg-white hover:bg-navy hover:text-white text-navy border-offwhite-border hover:border-navy cursor-pointer"
                      : "bg-offwhite/50 text-slate/40 border-transparent cursor-not-allowed"
                  }`}
                >
                  <span>{cell.day}</span>
                  {isAvailable && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? "bg-white" : "bg-terracotta"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate pt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta inline-block" />
              <span>Data com vagas disponíveis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate/30 inline-block" />
              <span>Sem expediente / Agenda completa</span>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 4 & 5: SELECIONAR TURNO E HORÁRIO */}
      {step === 4 && selectedProcedure && selectedUnit && selectedDate && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                Etapa 4 de 6
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                Escolha o turno e o horário
              </h2>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Disponibilidade para{" "}
                <strong className="text-navy">
                  {formatBRDate(selectedDate)}
                </strong>{" "}
                na unidade{" "}
                <strong className="text-navy">{selectedUnit.short_name}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:text-navy"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trocar data</span>
            </button>
          </div>

          {loadingDay ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-terracotta" />
              <span className="text-xs">Consultando horários livres...</span>
            </div>
          ) : dayAvailability && dayAvailability.isAvailable ? (
            <>
              {/* Seleção de Turnos derivados dos horários realmente livres */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate mb-2.5">
                  1. Selecione o turno disponível
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {dayAvailability.shifts.morning.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedShift("morning")}
                      className={`p-3 rounded-2xl border text-xs sm:text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                        selectedShift === "morning"
                          ? "bg-navy text-gold border-navy shadow-sm"
                          : "bg-offwhite/60 text-navy border-offwhite-border hover:bg-white"
                      }`}
                    >
                      <Sun className="w-4 h-4 text-terracotta" />
                      <span>Manhã</span>
                      <span className="text-[10px] opacity-75">
                        {dayAvailability.shifts.morning.length} horários
                      </span>
                    </button>
                  )}

                  {dayAvailability.shifts.afternoon.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedShift("afternoon")}
                      className={`p-3 rounded-2xl border text-xs sm:text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                        selectedShift === "afternoon"
                          ? "bg-navy text-gold border-navy shadow-sm"
                          : "bg-offwhite/60 text-navy border-offwhite-border hover:bg-white"
                      }`}
                    >
                      <Sunset className="w-4 h-4 text-terracotta" />
                      <span>Tarde</span>
                      <span className="text-[10px] opacity-75">
                        {dayAvailability.shifts.afternoon.length} horários
                      </span>
                    </button>
                  )}

                  {dayAvailability.shifts.evening.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedShift("evening")}
                      className={`p-3 rounded-2xl border text-xs sm:text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                        selectedShift === "evening"
                          ? "bg-navy text-gold border-navy shadow-sm"
                          : "bg-offwhite/60 text-navy border-offwhite-border hover:bg-white"
                      }`}
                    >
                      <Moon className="w-4 h-4 text-terracotta" />
                      <span>Noite</span>
                      <span className="text-[10px] opacity-75">
                        {dayAvailability.shifts.evening.length} horários
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grade de Horários do Turno */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate mb-2.5">
                  2. Escolha o horário de início ({selectedProcedure.duration_minutes} min)
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {slotsForCurrentShift.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setStep(5);
                        }}
                        className={`py-3 px-3 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? "bg-terracotta text-white border-terracotta font-bold shadow-sm"
                            : "bg-white hover:bg-navy hover:text-white text-navy border-offwhite-border font-semibold"
                        }`}
                      >
                        <span className="block text-sm">{slot.time}</span>
                        <span className="block text-[10px] opacity-70">
                          até {slot.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 3. Botão de Avançar explícito após selecionar o horário */}
              {selectedTime && (
                <div className="pt-4 border-t border-offwhite-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-navy">
                    Horário selecionado:{" "}
                    <strong className="text-terracotta">
                      {formatBRDate(selectedDate)} às {selectedTime}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm"
                  >
                    <span>Continuar com este horário</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 rounded-2xl bg-offwhite text-center space-y-3">
              <p className="text-sm font-semibold text-navy">
                Não há horários livres nesta data.
              </p>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-semibold"
              >
                Escolher outra data
              </button>
            </div>
          )}
        </div>
      )}

      {/* ETAPA 6: IDENTIFICAÇÃO DO CLIENTE */}
      {step === 5 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                Etapa 5 de 6
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                Seus dados para contato
              </h2>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Informe seus dados para confirmação e lembrete via WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:text-navy"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trocar horário</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex.: Mariana Silva"
                className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ex.: (22) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
                />
              </div>
            </div>

            {selectedProcedure?.modality === "domiciliar" && (
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Endereço completo para Atendimento Domiciliar (Home Care) *
                </label>
                <input
                  type="text"
                  required
                  value={homeCareAddress}
                  onChange={(e) => setHomeCareAddress(e.target.value)}
                  placeholder="Rua, número, bairro e ponto de referência"
                  className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Observação administrativa (opcional)
              </label>
              <textarea
                rows={2}
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Ex.: Preferência de contato, dificuldade de locomoção, etc. (Não insira dados clínicos sensíveis)."
                className="w-full px-4 py-3 rounded-xl border border-offwhite-border bg-offwhite/40 focus:bg-white focus:border-navy focus:outline-none text-sm text-navy"
              />
            </div>

            <div className="p-4 rounded-2xl bg-offwhite border border-offwhite-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-terracotta rounded"
                />
                <span className="text-xs text-slate leading-relaxed">
                  Concordo com o tratamento dos meus dados de contato
                  exclusivamente para gestão deste agendamento e envio de
                  lembretes de atendimento, conforme a{" "}
                  <a
                    href="/privacidade"
                    target="_blank"
                    className="text-navy font-semibold underline"
                  >
                    Política de Privacidade & LGPD
                  </a>
                  .
                </span>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={
                  clientName.trim().length < 3 ||
                  clientPhone.replace(/\D/g, "").length < 10 ||
                  !lgpdAccepted ||
                  (selectedProcedure?.modality === "domiciliar" &&
                    homeCareAddress.trim().length < 5)
                }
                onClick={() => setStep(6)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-terracotta hover:bg-terracotta-dark disabled:opacity-40 text-white text-sm font-semibold shadow-sm transition-all"
              >
                <span>Revisar agendamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 7: REVISÃO E CONFIRMAÇÃO */}
      {step === 6 && selectedProcedure && selectedUnit && (
        <form
          onSubmit={handleConfirmBooking}
          className="bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-luxury space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
                Etapa Final — Revisão
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-navy">
                Confirme os dados do seu agendamento
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:text-navy"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Editar dados</span>
            </button>
          </div>

          <div className="rounded-2xl bg-offwhite p-5 border border-gold/40 space-y-3.5 text-sm">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-offwhite-border">
              <div>
                <span className="text-xs text-slate block">Procedimento</span>
                <strong className="font-serif text-xl text-navy">
                  {selectedProcedure.name}
                </strong>
              </div>
              <span className="px-3 py-1 rounded-full bg-navy text-gold text-xs font-semibold">
                {selectedProcedure.duration_minutes} min
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-terracotta shrink-0" />
                <div>
                  <span className="text-[11px] text-slate block">Unidade</span>
                  <strong className="text-navy text-xs sm:text-sm">
                    {selectedUnit.name}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-4 h-4 text-terracotta shrink-0" />
                <div>
                  <span className="text-[11px] text-slate block">
                    Data e Horário
                  </span>
                  <strong className="text-navy text-xs sm:text-sm">
                    {formatBRDate(selectedDate)} às {selectedTime}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-terracotta shrink-0" />
                <div>
                  <span className="text-[11px] text-slate block">Paciente</span>
                  <strong className="text-navy text-xs sm:text-sm">
                    {clientName}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-terracotta shrink-0" />
                <div>
                  <span className="text-[11px] text-slate block">WhatsApp</span>
                  <strong className="text-navy text-xs sm:text-sm">
                    {clientPhone}
                  </strong>
                </div>
              </div>
            </div>

            {selectedProcedure.preparation_instructions && (
              <div className="pt-3 border-t border-offwhite-border text-xs text-navy/85">
                <strong className="block text-navy mb-0.5">
                  Orientações para o atendimento:
                </strong>
                {selectedProcedure.preparation_instructions}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate">
              <ShieldCheck className="w-4 h-4 text-gold-dark shrink-0" />
              <span>
                {settings.booking_mode === "approval" ||
                Boolean(selectedProcedure.requires_approval) ||
                selectedProcedure.modality === "domiciliar"
                  ? "Sua solicitação será enviada para confirmação da profissional."
                  : "Confirmação imediata na agenda da profissional."}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-terracotta hover:bg-terracotta-dark disabled:opacity-50 text-white text-sm font-semibold shadow-luxury transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirmando horário...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Agendamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

