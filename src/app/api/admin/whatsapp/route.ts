import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  confirmWhatsAppQrPairing,
  disconnectWhatsAppBot,
  generateWhatsAppQrCodeSession,
  getWhatsAppBotConfig,
  getWhatsAppMessageLogs,
  interpolateBotTemplate,
  runUpcomingRemindersSweep,
} from "@/lib/whatsapp-bot";
import crypto from "crypto";

export async function GET() {
  try {
    await requireAdminSession();
    const config = getWhatsAppBotConfig();
    const logs = getWhatsAppMessageLogs(40);
    return NextResponse.json({ config, logs });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar status do WhatsApp Bot." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    // Sincronização do Worker Baileys Local -> Site na Vercel (autenticado via BOT_SYNC_TOKEN)
    const botSyncSecret =
      process.env.BOT_SYNC_SECRET || "fernanda_bot_sync_2026";
    const headerToken = req.headers.get("x-bot-sync-token");
    const isBotWorkerSync = headerToken === botSyncSecret;

    if (isBotWorkerSync) {
      if (body.action === "worker_sync_status") {
        db.prepare(
          `UPDATE whatsapp_bot_config
           SET status = ?,
               qr_code_data = ?,
               connected_phone = COALESCE(?, connected_phone),
               connected_name = COALESCE(?, connected_name),
               updated_at = ?
           WHERE id = 'main'`
        ).run(
          body.status,
          body.qr_code_data || null,
          body.connected_phone || null,
          body.connected_name || null,
          now
        );

        const pendingMessages = db
          .prepare(
            `SELECT * FROM whatsapp_message_logs
             WHERE status IN ('queued_waiting_connection', 'pending_send')
             ORDER BY created_at ASC LIMIT 20`
          )
          .all();

        const config = getWhatsAppBotConfig();
        return NextResponse.json({
          success: true,
          config,
          pendingMessages,
        });
      }

      if (body.action === "worker_mark_sent" && body.logId) {
        db.prepare(
          `UPDATE whatsapp_message_logs
           SET status = 'sent', delivery_mode = 'baileys_live'
           WHERE id = ?`
        ).run(body.logId);
        return NextResponse.json({ success: true });
      }
    }

    await requireAdminSession();

    if (body.action === "generate_qr") {
      const config = await generateWhatsAppQrCodeSession();
      return NextResponse.json({ success: true, config });
    }

    if (body.action === "confirm_pairing") {
      const config = confirmWhatsAppQrPairing({
        phone: body.phone,
        name: body.name,
      });
      return NextResponse.json({ success: true, config });
    }

    if (body.action === "disconnect") {
      const config = disconnectWhatsAppBot();
      return NextResponse.json({ success: true, config });
    }

    if (body.action === "save_templates") {
      db.prepare(
        `UPDATE whatsapp_bot_config
         SET auto_confirm_msg_enabled = ?,
             reminder_2h_enabled = ?,
             notify_professional_enabled = ?,
             professional_phone = ?,
             template_client_booking = ?,
             template_client_reminder = ?,
             template_professional_alert = ?,
             updated_at = ?
         WHERE id = 'main'`
      ).run(
        body.auto_confirm_msg_enabled ? 1 : 0,
        body.reminder_2h_enabled ? 1 : 0,
        body.notify_professional_enabled ? 1 : 0,
        (body.professional_phone || "").replace(/\D/g, ""),
        body.template_client_booking,
        body.template_client_reminder,
        body.template_professional_alert,
        now
      );

      const config = getWhatsAppBotConfig();
      return NextResponse.json({ success: true, config });
    }

    if (body.action === "run_reminders_now") {
      const result = runUpcomingRemindersSweep(true);
      const logs = getWhatsAppMessageLogs(40);
      return NextResponse.json({
        success: true,
        result,
        logs,
      });
    }

    if (body.action === "send_test_message") {
      const config = getWhatsAppBotConfig();
      const targetPhone = (
        body.testPhone ||
        config.professional_phone ||
        "5522999990001"
      ).replace(/\D/g, "");

      const sampleMsg = interpolateBotTemplate(config.template_client_reminder, {
        clienteName: body.testName || "Mariana Silva (Teste)",
        clienteTelefone: targetPhone,
        procedimentoName: "Laserterapia",
        unidadeName: "Consultório | Ed. Platinum",
        data: "12/11/2026",
        horario: "09:00",
        codigo: "FC-TESTE",
        status: "Confirmado ✅",
      });

      const logId = `walog-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(
        `INSERT INTO whatsapp_message_logs (
          id, appointment_id, recipient_type, recipient_name, recipient_phone,
          message_type, message_content, delivery_mode, status, created_at
        ) VALUES (?, NULL, 'test', ?, ?, 'manual_test', ?, ?, 'queued_waiting_connection', ?)`
      ).run(
        logId,
        body.testName || "Teste Painel Admin",
        targetPhone,
        sampleMsg,
        config.status === "connected"
          ? "whatsapp_bot_connected"
          : "test_preview",
        now
      );

      const logs = getWhatsAppMessageLogs(40);
      return NextResponse.json({
        success: true,
        sampleMsg,
        logs,
      });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao processar comando do WhatsApp Bot." },
      { status: 500 }
    );
  }
}

