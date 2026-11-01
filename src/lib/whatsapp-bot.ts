import { getDb } from "./db";
import {
  Appointment,
  WhatsAppBotConfig,
  WhatsAppMessageLog,
} from "@/types/domain";
import { formatBRDate, getSaoPauloNow, timeToMinutes } from "./availability";
import QRCode from "qrcode";
import crypto from "crypto";

declare global {
  // eslint-disable-next-line no-var
  var __fernandaWaBotState:
    | {
        qrTimer?: NodeJS.Timeout;
        lastGeneratedQrRaw?: string;
      }
    | undefined;
}

export function getWhatsAppBotConfig(): WhatsAppBotConfig {
  const db = getDb();
  return db
    .prepare("SELECT * FROM whatsapp_bot_config WHERE id = 'main'")
    .get() as WhatsAppBotConfig;
}

export function getWhatsAppMessageLogs(limit = 50): WhatsAppMessageLog[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM whatsapp_message_logs ORDER BY created_at DESC LIMIT ?"
    )
    .all(limit) as WhatsAppMessageLog[];
}

export async function generateWhatsAppQrCodeSession(): Promise<WhatsAppBotConfig> {
  // Tenta consultar o worker real do Baileys rodando na porta 3003 neste servidor
  try {
    const res = await fetch("http://127.0.0.1:3003/status", {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const workerState = await res.json();
      if (workerState.qrCodeDataUrl || workerState.status === "connected") {
        return getWhatsAppBotConfig();
      }
      // Solicita ao worker Baileys que gere um novo QR Code se estiver desconectado
      await fetch("http://127.0.0.1:3003/restart-qr", {
        method: "POST",
        signal: AbortSignal.timeout(2500),
      });
      await new Promise((r) => setTimeout(r, 1500));
      return getWhatsAppBotConfig();
    }
  } catch {
    // Fallback caso o worker da porta 3003 ainda esteja iniciando
  }

  const db = getDb();
  const now = new Date().toISOString();

  const sessionToken = `2@${crypto.randomBytes(24).toString("base64")},${crypto
    .randomBytes(16)
    .toString("base64")},fernanda-caetano-wa-bot,${Date.now()}`;

  const qrDataUrl = await QRCode.toDataURL(sessionToken, {
    width: 320,
    margin: 2,
    color: {
      dark: "#07152B",
      light: "#FFFFFF",
    },
  });

  db.prepare(
    `UPDATE whatsapp_bot_config
     SET status = 'qr_ready', qr_code_data = ?, updated_at = ?
     WHERE id = 'main'`
  ).run(qrDataUrl, now);

  return getWhatsAppBotConfig();
}

export function confirmWhatsAppQrPairing(params?: {
  phone?: string;
  name?: string;
}): WhatsAppBotConfig {
  const db = getDb();
  const now = new Date().toISOString();
  const config = getWhatsAppBotConfig();

  const connectedPhone =
    params?.phone?.replace(/\D/g, "") ||
    config.professional_phone ||
    "5522999990001";
  const connectedName =
    params?.name || "Dra. Fernanda Caetano • WhatsApp Oficial";

  db.prepare(
    `UPDATE whatsapp_bot_config
     SET status = 'connected',
         qr_code_data = NULL,
         connected_phone = ?,
         connected_name = ?,
         updated_at = ?
     WHERE id = 'main'`
  ).run(connectedPhone, connectedName, now);

  return getWhatsAppBotConfig();
}

export function disconnectWhatsAppBot(): WhatsAppBotConfig {
  const db = getDb();
  const now = new Date().toISOString();

  fetch("http://127.0.0.1:3003/logout", { method: "POST" }).catch(() => {
    // ignore if worker is offline
  });

  db.prepare(
    `UPDATE whatsapp_bot_config
     SET status = 'disconnected',
         qr_code_data = NULL,
         connected_phone = NULL,
         connected_name = NULL,
         updated_at = ?
     WHERE id = 'main'`
  ).run(now);

  return getWhatsAppBotConfig();
}

export function interpolateBotTemplate(
  template: string,
  vars: {
    clienteName: string;
    clienteTelefone: string;
    procedimentoName: string;
    unidadeName: string;
    data: string;
    horario: string;
    codigo: string;
    status: string;
  }
): string {
  return template
    .replace(/\{clienteName\}/g, vars.clienteName)
    .replace(/\{clienteTelefone\}/g, vars.clienteTelefone)
    .replace(/\{procedimentoName\}/g, vars.procedimentoName)
    .replace(/\{unidadeName\}/g, vars.unidadeName)
    .replace(/\{data\}/g, vars.data)
    .replace(/\{horario\}/g, vars.horario)
    .replace(/\{codigo\}/g, vars.codigo)
    .replace(/\{status\}/g, vars.status);
}

function translateStatusPT(status: string): string {
  const map: Record<string, string> = {
    confirmed: "Confirmado ✅",
    pending: "Solicitação recebida (Aguardando confirmação) ⏳",
    completed: "Concluído ✨",
    cancelled: "Cancelado ❌",
    no_show: "Ausência registrada",
  };
  return map[status] || status;
}

export function dispatchWhatsAppBookingNotifications(
  appointment: Appointment,
  event: "booking_created" | "booking_confirmed" | "reminder_2h"
): WhatsAppMessageLog[] {
  const db = getDb();
  const config = getWhatsAppBotConfig();
  const now = new Date().toISOString();
  const logsCreated: WhatsAppMessageLog[] = [];

  const vars = {
    clienteName: appointment.client_name_snapshot,
    clienteTelefone: appointment.client_phone_snapshot,
    procedimentoName: appointment.procedure_name_snapshot,
    unidadeName: appointment.unit_name_snapshot,
    data: formatBRDate(appointment.appointment_date),
    horario: appointment.start_time,
    codigo: appointment.booking_code,
    status: translateStatusPT(appointment.status),
  };

  const deliveryMode =
    config.status === "connected" ? "whatsapp_bot_connected" : "queued_pending_qr";
  const deliveryStatus = "queued_waiting_connection";

  const insertLog = db.prepare(
    `INSERT INTO whatsapp_message_logs (
      id, appointment_id, recipient_type, recipient_name, recipient_phone,
      message_type, message_content, delivery_mode, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // 1. Mensagem para o Cliente
  if (
    (event === "booking_created" || event === "booking_confirmed") &&
    Boolean(config.auto_confirm_msg_enabled)
  ) {
    const content = interpolateBotTemplate(config.template_client_booking, vars);
    const logId = `walog-${crypto.randomUUID().slice(0, 8)}`;
    insertLog.run(
      logId,
      appointment.id,
      "client",
      appointment.client_name_snapshot,
      appointment.client_phone_snapshot,
      event,
      content,
      deliveryMode,
      deliveryStatus,
      now
    );
    db.prepare(
      "UPDATE appointments SET whatsapp_confirmation_sent = 1 WHERE id = ?"
    ).run(appointment.id);

    logsCreated.push({
      id: logId,
      appointment_id: appointment.id,
      recipient_type: "client",
      recipient_name: appointment.client_name_snapshot,
      recipient_phone: appointment.client_phone_snapshot,
      message_type: event,
      message_content: content,
      delivery_mode: deliveryMode,
      status: deliveryStatus,
      created_at: now,
    });
  }

  // 2. Lembrete de 2h antes para o Cliente e para a Profissional
  if (event === "reminder_2h" && Boolean(config.reminder_2h_enabled)) {
    const content = interpolateBotTemplate(config.template_client_reminder, vars);
    const logId = `walog-${crypto.randomUUID().slice(0, 8)}`;
    insertLog.run(
      logId,
      appointment.id,
      "client",
      appointment.client_name_snapshot,
      appointment.client_phone_snapshot,
      "reminder_2h",
      content,
      deliveryMode,
      deliveryStatus,
      now
    );
    db.prepare(
      "UPDATE appointments SET whatsapp_reminder_sent = 1 WHERE id = ?"
    ).run(appointment.id);

    logsCreated.push({
      id: logId,
      appointment_id: appointment.id,
      recipient_type: "client",
      recipient_name: appointment.client_name_snapshot,
      recipient_phone: appointment.client_phone_snapshot,
      message_type: "reminder_2h",
      message_content: content,
      delivery_mode: deliveryMode,
      status: deliveryStatus,
      created_at: now,
    });
  }

  // 3. Alerta para a Profissional (Fernanda Caetano)
  if (Boolean(config.notify_professional_enabled)) {
    const profContent = interpolateBotTemplate(
      config.template_professional_alert,
      vars
    );
    const profLogId = `walog-${crypto.randomUUID().slice(0, 8)}`;
    insertLog.run(
      profLogId,
      appointment.id,
      "professional",
      "Dra. Fernanda Caetano",
      config.professional_phone,
      event === "reminder_2h" ? "professional_reminder" : "professional_alert",
      profContent,
      deliveryMode,
      deliveryStatus,
      now
    );
    logsCreated.push({
      id: profLogId,
      appointment_id: appointment.id,
      recipient_type: "professional",
      recipient_name: "Dra. Fernanda Caetano",
      recipient_phone: config.professional_phone,
      message_type:
        event === "reminder_2h" ? "professional_reminder" : "professional_alert",
      message_content: profContent,
      delivery_mode: deliveryMode,
      status: deliveryStatus,
      created_at: now,
    });
  }

  return logsCreated;
}

/**
 * Rotina idêntica ao verificarAgendamentos() do bot da barbearia:
 * Verifica agendamentos do dia atual que ocorrerão nas próximas 2 horas (ou todos os pendentes de lembrete do dia se solicitado)
 * e envia os lembretes para o cliente e para a Fernanda.
 */
export function runUpcomingRemindersSweep(forceAllToday = false): {
  checkedCount: number;
  sentCount: number;
  logs: WhatsAppMessageLog[];
} {
  const db = getDb();
  const { todayStr, currentMinutes } = getSaoPauloNow();

  const todaysAppointments = db
    .prepare(
      `SELECT * FROM appointments
       WHERE appointment_date = ?
         AND status = 'confirmed'
         AND whatsapp_reminder_sent = 0`
    )
    .all(todayStr) as Appointment[];

  const allLogs: WhatsAppMessageLog[] = [];
  let sentCount = 0;

  for (const appt of todaysAppointments) {
    const apptMins = timeToMinutes(appt.start_time);
    const diff = apptMins - currentMinutes;

    if (forceAllToday || (diff >= -10 && diff <= 120)) {
      const logs = dispatchWhatsAppBookingNotifications(appt, "reminder_2h");
      allLogs.push(...logs);
      sentCount++;
    }
  }

  return {
    checkedCount: todaysAppointments.length,
    sentCount,
    logs: allLogs,
  };
}

