import { getDb } from "./db";
import {
  calculateDayAvailability,
  classifyShift,
  formatBRDate,
  minutesToTime,
  timeToMinutes,
} from "./availability";
import {
  Appointment,
  AppointmentStatus,
  Procedure,
  SiteSettings,
  Unit,
} from "@/types/domain";
import { dispatchWhatsAppBookingNotifications } from "./whatsapp-bot";
import crypto from "crypto";

export interface CreateBookingInput {
  procedureId: string;
  unitId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientNotes?: string;
  homeCareAddress?: string;
  source?: "online" | "admin_manual";
  forceStatus?: AppointmentStatus;
  bypassAdvanceCheck?: boolean;
}

export function normalizePhoneBR(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

function generateBookingCode(): string {
  const rand = crypto.randomInt(100000, 999999);
  return `FC-${rand}`;
}

/**
 * Cria um agendamento dentro de uma transação atômica (BEGIN IMMEDIATE no SQLite),
 * revalidando a disponibilidade no exato milissegundo da gravação para impedir
 * que dois usuários reservem horários incompatíveis simultaneamente.
 */
export function createBookingTransactional(
  input: CreateBookingInput
): Appointment {
  const db = getDb();

  const tx = db.transaction((payload: CreateBookingInput): Appointment => {
    const settings = db
      .prepare("SELECT * FROM site_settings WHERE id = 'main'")
      .get() as SiteSettings;

    const procedure = db
      .prepare(
        "SELECT * FROM procedures WHERE id = ? AND is_active = 1 AND is_archived = 0"
      )
      .get(payload.procedureId) as Procedure | undefined;

    if (!procedure) {
      throw new Error("O procedimento selecionado não está disponível.");
    }

    const unit = db
      .prepare("SELECT * FROM units WHERE id = ? AND is_active = 1")
      .get(payload.unitId) as Unit | undefined;

    if (!unit) {
      throw new Error("A unidade selecionada não está disponível.");
    }

    // Revalidar disponibilidade no servidor dentro da transação
    const dayAvail = calculateDayAvailability({
      procedureId: payload.procedureId,
      unitId: payload.unitId,
      dateStr: payload.appointmentDate,
      bypassAdvanceCheck:
        payload.bypassAdvanceCheck || payload.source === "admin_manual",
    });

    const allSlots = [
      ...dayAvail.shifts.morning,
      ...dayAvail.shifts.afternoon,
      ...dayAvail.shifts.evening,
    ];

    const matchingSlot = allSlots.find((s) => s.time === payload.startTime);
    if (!matchingSlot) {
      throw new Error(
        `O horário ${payload.startTime} do dia ${formatBRDate(
          payload.appointmentDate
        )} acabou de ficar indisponível ou conflita com outro atendimento. Por favor, selecione outro horário.`
      );
    }

    const now = new Date().toISOString();
    const cleanPhone = normalizePhoneBR(payload.clientPhone);

    // Localizar ou criar cliente
    let client = db
      .prepare("SELECT * FROM clients WHERE whatsapp_phone = ?")
      .get(cleanPhone) as { id: string } | undefined;

    if (!client) {
      const clientId = `client-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(
        `INSERT INTO clients (
          id, full_name, whatsapp_phone, email, notes, lgpd_consent_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        clientId,
        payload.clientName.trim(),
        cleanPhone,
        payload.clientEmail?.trim() || null,
        null,
        now,
        now,
        now
      );
      client = { id: clientId };
    } else {
      db.prepare(
        `UPDATE clients
         SET full_name = ?, email = COALESCE(?, email), updated_at = ?
         WHERE id = ?`
      ).run(
        payload.clientName.trim(),
        payload.clientEmail?.trim() || null,
        now,
        client.id
      );
    }

    const duration = Number(procedure.duration_minutes) || 60;
    const bufferAfter = Number(procedure.buffer_after_minutes) || 15;
    const startMins = timeToMinutes(payload.startTime);
    const endTime = minutesToTime(startMins + duration);
    const occupiedUntilTime = minutesToTime(startMins + duration + bufferAfter);
    const shift = classifyShift(payload.startTime);

    // Determinar status conforme configuração global ou exigência do procedimento
    let status: AppointmentStatus = "confirmed";
    if (payload.forceStatus) {
      status = payload.forceStatus;
    } else if (
      settings.booking_mode === "approval" ||
      Boolean(procedure.requires_approval) ||
      procedure.modality === "domiciliar"
    ) {
      status = "pending";
    }

    const appointmentId = `appt-${crypto.randomUUID().slice(0, 10)}`;
    const bookingCode = generateBookingCode();

    db.prepare(
      `INSERT INTO appointments (
        id, booking_code, client_id, procedure_id, unit_id,
        client_name_snapshot, client_phone_snapshot, client_email_snapshot,
        procedure_name_snapshot, unit_name_snapshot,
        duration_minutes, buffer_after_minutes, price_cents_snapshot,
        appointment_date, shift, start_time, end_time, occupied_until_time,
        status, source, client_notes, admin_notes, home_care_address,
        whatsapp_reminder_sent, whatsapp_confirmation_sent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, ?, ?)`
    ).run(
      appointmentId,
      bookingCode,
      client.id,
      procedure.id,
      unit.id,
      payload.clientName.trim(),
      cleanPhone,
      payload.clientEmail?.trim() || null,
      procedure.name,
      unit.short_name || unit.name,
      duration,
      bufferAfter,
      procedure.show_price ? procedure.price_cents : null,
      payload.appointmentDate,
      shift,
      payload.startTime,
      endTime,
      occupiedUntilTime,
      status,
      payload.source || "online",
      payload.clientNotes?.trim() || null,
      payload.homeCareAddress?.trim() || null,
      now,
      now
    );

    // Registrar notificação interna no painel
    const notifTitle =
      status === "pending"
        ? "Nova solicitação aguardando confirmação"
        : "Novo agendamento confirmado";
    const notifMsg = `${payload.clientName.trim()} agendou ${
      procedure.name
    } (${unit.short_name}) para ${formatBRDate(
      payload.appointmentDate
    )} às ${payload.startTime}.`;

    db.prepare(
      `INSERT INTO notifications (id, event_type, title, message, appointment_id, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).run(
      `notif-${crypto.randomUUID().slice(0, 8)}`,
      status === "pending" ? "pending_request" : "new_booking",
      notifTitle,
      notifMsg,
      appointmentId,
      now
    );

    // Registrar log de auditoria sem expor dados sensíveis desnecessários
    db.prepare(
      `INSERT INTO audit_logs (id, actor, action, entity_type, entity_id, details_json, created_at)
       VALUES (?, ?, 'create_appointment', 'appointment', ?, ?, ?)`
    ).run(
      `audit-${crypto.randomUUID().slice(0, 8)}`,
      payload.source === "admin_manual" ? "admin" : "public_booking",
      appointmentId,
      JSON.stringify({
        booking_code: bookingCode,
        date: payload.appointmentDate,
        start_time: payload.startTime,
        status,
      }),
      now
    );

    const created = db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .get(appointmentId) as Appointment;

    return created;
  });

  // Executa em modo IMMEDIATE para garantir lock de escrita contra condições de corrida
  const createdAppointment = tx.immediate(input);

  // Dispara notificações do WhatsApp Bot de forma assíncrona (não bloqueia a resposta da transação)
  try {
    dispatchWhatsAppBookingNotifications(createdAppointment, "booking_created");
  } catch (err) {
    console.error("Aviso: erro não impeditivo ao acionar WhatsApp Bot:", err);
  }

  return createdAppointment;
}

