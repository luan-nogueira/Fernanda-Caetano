import { getDb } from "./db";
import {
  Procedure,
  ShiftWindow,
  SiteSettings,
} from "@/types/domain";

export interface TimeSlotOption {
  time: string; // HH:MM
  endTime: string; // HH:MM
  shift: "morning" | "afternoon" | "evening";
}

export interface DayAvailabilitySummary {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  reason?: string;
  totalSlots: number;
  shifts: {
    morning: TimeSlotOption[];
    afternoon: TimeSlotOption[];
    evening: TimeSlotOption[];
  };
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function classifyShift(time: string): "morning" | "afternoon" | "evening" {
  const mins = timeToMinutes(time);
  if (mins < 12 * 60) return "morning";
  if (mins < 18 * 60) return "afternoon";
  return "evening";
}

export function getSaoPauloNow(): {
  todayStr: string;
  currentMinutes: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const h = parseInt(map.hour === "24" ? "0" : map.hour || "0", 10);
  const m = parseInt(map.minute || "0", 10);
  return {
    todayStr: `${map.year}-${map.month}-${map.day}`,
    currentMinutes: h * 60 + m,
  };
}

export function getDayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.getUTCDay();
}

export function formatBRDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Calcula todos os horários disponíveis para um procedimento, unidade e data (YYYY-MM-DD).
 * Considera:
 * - Expediente da unidade no dia da semana
 * - Exceções de calendário (feriados, férias, horários especiais)
 * - Bloqueios manuais (dia inteiro ou faixa de horário)
 * - Agendamentos ativos da profissional EM QUALQUER UNIDADE (agenda única compartilhada)
 * - Duração do procedimento + intervalo de segurança (buffer_after_minutes)
 */
export function calculateDayAvailability(params: {
  procedureId: string;
  unitId: string;
  dateStr: string;
  ignoreAppointmentId?: string;
  bypassAdvanceCheck?: boolean;
}): DayAvailabilitySummary {
  const db = getDb();
  const { procedureId, unitId, dateStr, ignoreAppointmentId, bypassAdvanceCheck } =
    params;

  const emptyResult = (reason: string): DayAvailabilitySummary => ({
    date: dateStr,
    isAvailable: false,
    reason,
    totalSlots: 0,
    shifts: { morning: [], afternoon: [], evening: [] },
  });

  const settings = db
    .prepare("SELECT * FROM site_settings WHERE id = 'main'")
    .get() as SiteSettings | undefined;

  if (!settings) {
    return emptyResult("Configurações não encontradas.");
  }

  if (!bypassAdvanceCheck && !settings.online_booking_enabled) {
    return emptyResult("Agendamento online temporariamente suspenso.");
  }

  const procedure = db
    .prepare("SELECT * FROM procedures WHERE id = ? AND is_active = 1 AND is_archived = 0")
    .get(procedureId) as Procedure | undefined;

  if (!procedure) {
    return emptyResult("Procedimento indisponível.");
  }

  // Verificar vínculo entre procedimento e unidade
  const linkExists = db
    .prepare(
      "SELECT 1 FROM procedure_units WHERE procedure_id = ? AND unit_id = ?"
    )
    .get(procedureId, unitId);

  if (!linkExists) {
    return emptyResult("Procedimento não oferecido nesta unidade.");
  }

  // Verificar se a data não está no passado (em America/Sao_Paulo)
  const { todayStr, currentMinutes } = getSaoPauloNow();
  if (!bypassAdvanceCheck && dateStr < todayStr) {
    return emptyResult("Data no passado.");
  }

  // Verificar exceções de funcionamento (feriados/férias/custom)
  const exceptions = db
    .prepare(
      `SELECT * FROM availability_exceptions
       WHERE exception_date = ? AND (unit_id IS NULL OR unit_id = ?)`
    )
    .all(dateStr, unitId) as Array<{
    is_closed: number;
    title: string;
    custom_shifts_json: string | null;
  }>;

  for (const exc of exceptions) {
    if (exc.is_closed) {
      return emptyResult(exc.title || "Dia sem expediente (Exceção/Feriado).");
    }
  }

  // Verificar bloqueio de dia inteiro
  const blocks = db
    .prepare(
      `SELECT * FROM schedule_blocks
       WHERE block_date = ? AND (unit_id IS NULL OR unit_id = ?)`
    )
    .all(dateStr, unitId) as Array<{
    is_full_day: number;
    start_time: string | null;
    end_time: string | null;
    reason: string;
  }>;

  for (const blk of blocks) {
    if (blk.is_full_day) {
      return emptyResult(blk.reason || "Data bloqueada na agenda.");
    }
  }

  // Determinar janelas de expediente do dia
  let shiftWindows: ShiftWindow[] = [];
  const customExceptionWithShifts = exceptions.find(
    (e) => !e.is_closed && e.custom_shifts_json
  );

  if (customExceptionWithShifts && customExceptionWithShifts.custom_shifts_json) {
    try {
      shiftWindows = JSON.parse(customExceptionWithShifts.custom_shifts_json);
    } catch {
      shiftWindows = [];
    }
  } else {
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr);
    const wh = db
      .prepare(
        "SELECT * FROM working_hours WHERE unit_id = ? AND day_of_week = ?"
      )
      .get(unitId, dayOfWeek) as
      | { is_open: number; shifts_json: string }
      | undefined;

    if (!wh || !wh.is_open) {
      return emptyResult("Sem expediente neste dia da semana.");
    }

    try {
      shiftWindows = JSON.parse(wh.shifts_json || "[]");
    } catch {
      shiftWindows = [];
    }
  }

  if (!shiftWindows.length) {
    return emptyResult("Sem turnos configurados para este dia.");
  }

  // Buscar TODOS os agendamentos ativos (confirmed ou pending) da Fernanda nesta data
  // (em qualquer unidade, pois a agenda da profissional é compartilhada entre unidades)
  const existingAppointments = db
    .prepare(
      `SELECT id, unit_id, start_time, end_time, occupied_until_time
       FROM appointments
       WHERE appointment_date = ?
         AND status IN ('confirmed', 'pending')`
    )
    .all(dateStr) as Array<{
    id: string;
    unit_id: string;
    start_time: string;
    end_time: string;
    occupied_until_time: string;
  }>;

  const duration = Number(procedure.duration_minutes) || 60;
  const bufferBefore = Number(procedure.buffer_before_minutes) || 0;
  const bufferAfter = Number(procedure.buffer_after_minutes) || 15;
  const stepMinutes = Math.max(15, Number(settings.slot_interval_minutes) || 30);
  const minAdvanceMinutes =
    (Number(settings.min_advance_hours) || 1) * 60;

  const morning: TimeSlotOption[] = [];
  const afternoon: TimeSlotOption[] = [];
  const evening: TimeSlotOption[] = [];

  for (const window of shiftWindows) {
    const winStart = timeToMinutes(window.start);
    const winEnd = timeToMinutes(window.end);

    for (
      let candidateStart = winStart;
      candidateStart + duration <= winEnd;
      candidateStart += stepMinutes
    ) {
      const candidateEnd = candidateStart + duration;
      const effectiveStart = candidateStart - bufferBefore;
      const effectiveOccupiedUntil = candidateEnd + bufferAfter;

      // Se for hoje, respeitar antecedência mínima configurada
      if (
        !bypassAdvanceCheck &&
        dateStr === todayStr &&
        candidateStart < currentMinutes + minAdvanceMinutes
      ) {
        continue;
      }

      // Verificar colisão com bloqueios parciais
      let blockedByScheduleBlock = false;
      for (const blk of blocks) {
        if (!blk.is_full_day && blk.start_time && blk.end_time) {
          const blkStart = timeToMinutes(blk.start_time);
          const blkEnd = timeToMinutes(blk.end_time);
          if (
            intervalsOverlap(
              effectiveStart,
              effectiveOccupiedUntil,
              blkStart,
              blkEnd
            )
          ) {
            blockedByScheduleBlock = true;
            break;
          }
        }
      }
      if (blockedByScheduleBlock) continue;

      // Verificar colisão com agendamentos existentes (em qualquer unidade)
      let conflictWithAppointment = false;
      for (const appt of existingAppointments) {
        if (ignoreAppointmentId && appt.id === ignoreAppointmentId) continue;

        const apptStart = timeToMinutes(appt.start_time);
        const apptOccupiedEnd = timeToMinutes(
          appt.occupied_until_time || appt.end_time
        );

        // Se o agendamento existente for em OUTRA unidade, adicionamos 15 min extras de margem de deslocamento
        const interUnitTravelMargin = appt.unit_id !== unitId ? 15 : 0;

        if (
          intervalsOverlap(
            effectiveStart,
            effectiveOccupiedUntil,
            apptStart - interUnitTravelMargin,
            apptOccupiedEnd + interUnitTravelMargin
          )
        ) {
          conflictWithAppointment = true;
          break;
        }
      }

      if (conflictWithAppointment) continue;

      const startStr = minutesToTime(candidateStart);
      const endStr = minutesToTime(candidateEnd);
      const shift = classifyShift(startStr);

      const slotObj: TimeSlotOption = {
        time: startStr,
        endTime: endStr,
        shift,
      };

      if (shift === "morning") morning.push(slotObj);
      else if (shift === "afternoon") afternoon.push(slotObj);
      else evening.push(slotObj);
    }
  }

  const totalSlots = morning.length + afternoon.length + evening.length;

  return {
    date: dateStr,
    isAvailable: totalSlots > 0,
    reason: totalSlots > 0 ? undefined : "Todos os horários deste dia estão preenchidos.",
    totalSlots,
    shifts: {
      morning,
      afternoon,
      evening,
    },
  };
}

/**
 * Calcula o mapa mensal de disponibilidade (YYYY-MM) para exibir no calendário do cliente
 */
export function calculateMonthAvailabilityMap(params: {
  procedureId: string;
  unitId: string;
  year: number;
  month: number; // 1-12
}): Record<
  string,
  {
    date: string;
    isAvailable: boolean;
    totalSlots: number;
    reason?: string;
  }
> {
  const { procedureId, unitId, year, month } = params;
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: Record<
    string,
    { date: string; isAvailable: boolean; totalSlots: number; reason?: string }
  > = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const dayAvail = calculateDayAvailability({
      procedureId,
      unitId,
      dateStr,
    });
    result[dateStr] = {
      date: dateStr,
      isAvailable: dayAvail.isAvailable,
      totalSlots: dayAvail.totalSlots,
      reason: dayAvail.reason,
    };
  }

  return result;
}

