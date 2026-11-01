/**
 * =============================================================================
 * 🤖 BOT DE WHATSAPP (BAILEYS) — DRA. FERNANDA CAETANO
 * =============================================================================
 * Rodando 24/7 no servidor exatamente como o bot da barbearia (../whatsapp-bot/index.js).
 *
 * Funcionalidades:
 * 1. Conecta ao WhatsApp via @whiskeysockets/baileys (useMultiFileAuthState em ./whatsapp-session).
 * 2. Sempre que o Baileys emite um QR Code real, converte para DataURL PNG e grava
 *    em `whatsapp_bot_config` no banco SQLite para aparecer AO VIVO na aba `/admin/whatsapp`
 *    do painel administrativo (e também na porta HTTP 3003).
 * 3. Quando a Dra. Fernanda lê o QR Code no celular, muda o status para `connected`,
 *    identifica o número conectado e inicia o loop de envio.
 * 4. Despacha imediatamente mensagens na fila (`queued_waiting_connection` / `pending_send`)
 *    de novos agendamentos/confirmações e roda o cron de 5 em 5 minutos para enviar
 *    os lembretes de 2h antes para o Paciente e para a Dra. Fernanda!
 */

const path = require("path");
const fs = require("fs");
const http = require("http");
const { DatabaseSync } = require("node:sqlite");
const QRCode = require("qrcode");

// Carrega Baileys, Pino e Node-Cron (da própria pasta ou compartilhado de ../whatsapp-bot)
function requireShared(pkgName) {
  try {
    return require(pkgName);
  } catch {
    return require(path.join(__dirname, "..", "whatsapp-bot", "node_modules", pkgName));
  }
}

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = requireShared("@whiskeysockets/baileys");
const pino = requireShared("pino");
const cron = requireShared("node-cron");

const DB_PATH = path.join(__dirname, "data", "fernanda_caetano.sqlite");
const SESSION_DIR = path.join(__dirname, "whatsapp-session");
const BOT_PORT = Number(process.env.BOT_PORT || 3003);
const VERCEL_SITE_URL = (process.env.VERCEL_SITE_URL || "").replace(/\/$/, "");
const BOT_SYNC_SECRET = process.env.BOT_SYNC_SECRET || "fernanda_bot_sync_2026";

let latestQRDataUrl = null;
let latestQRRaw = null;
let botStatus = "starting";
let clientSocket = null;
let connectedPhone = null;
let connectedName = null;

async function syncWithRemoteSiteIfConfigured() {
  if (!VERCEL_SITE_URL) return;
  try {
    const res = await fetch(`${VERCEL_SITE_URL}/api/admin/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-sync-token": BOT_SYNC_SECRET,
      },
      body: JSON.stringify({
        action: "worker_sync_status",
        status: botStatus,
        qr_code_data: latestQRDataUrl,
        connected_phone: connectedPhone,
        connected_name: connectedName,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (
      botStatus === "connected" &&
      clientSocket &&
      Array.isArray(data.pendingMessages)
    ) {
      for (const item of data.pendingMessages) {
        const jid = await formatarEValidarTelefoneBrasil(item.recipient_phone);
        if (!jid) continue;
        try {
          await clientSocket.sendMessage(jid, { text: item.message_content });
          await fetch(`${VERCEL_SITE_URL}/api/admin/whatsapp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-bot-sync-token": BOT_SYNC_SECRET,
            },
            body: JSON.stringify({
              action: "worker_mark_sent",
              logId: item.id,
            }),
          });
          console.log(
            `✅ [Nuvem Vercel -> Baileys Local] Mensagem enviada para ${item.recipient_name} (${jid})`
          );
        } catch (e) {
          console.error("Erro ao enviar mensagem da nuvem:", e.message || e);
        }
      }
    }
  } catch {
    // ignore network hiccups
  }
}

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    return null;
  }
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
}

function updateBotStatusInDb(status, qrDataUrl = null, phone = null, name = null) {
  botStatus = status;
  syncWithRemoteSiteIfConfigured();
  try {
    const db = getDb();
    if (!db) return;
    db.prepare(
      `UPDATE whatsapp_bot_config
       SET status = ?,
           qr_code_data = ?,
           connected_phone = COALESCE(?, connected_phone),
           connected_name = COALESCE(?, connected_name),
           updated_at = ?
       WHERE id = 'main'`
    ).run(status, qrDataUrl, phone, name, new Date().toISOString());
    db.close();
  } catch (err) {
    console.error("Erro ao atualizar status do bot no SQLite:", err.message || err);
  }
}

// Formata e valida número de telefone do Brasil no WhatsApp via Baileys (idêntico ao bot da barbearia)
async function formatarEValidarTelefoneBrasil(telefone) {
  if (!telefone) return null;
  let nums = telefone.toString().replace(/\D/g, "");
  if (!nums) return null;

  if (!nums.startsWith("55") && nums.length <= 11) {
    nums = "55" + nums;
  }

  if (clientSocket && typeof clientSocket.onWhatsApp === "function") {
    try {
      const results = await clientSocket.onWhatsApp(nums);
      if (results && results.length > 0 && (results[0]?.exists || results[0]?.jid)) {
        return results[0].jid;
      }

      if (nums.length === 13 && nums.startsWith("55")) {
        const semNove = nums.slice(0, 4) + nums.slice(5);
        const resultsSemNove = await clientSocket.onWhatsApp(semNove);
        if (
          resultsSemNove &&
          resultsSemNove.length > 0 &&
          (resultsSemNove[0]?.exists || resultsSemNove[0]?.jid)
        ) {
          return resultsSemNove[0].jid;
        }
      }

      if (nums.length === 12 && nums.startsWith("55")) {
        const comNove = nums.slice(0, 4) + "9" + nums.slice(4);
        const resultsComNove = await clientSocket.onWhatsApp(comNove);
        if (
          resultsComNove &&
          resultsComNove.length > 0 &&
          (resultsComNove[0]?.exists || resultsComNove[0]?.jid)
        ) {
          return resultsComNove[0].jid;
        }
      }
    } catch (err) {
      console.error(`Erro ao consultar onWhatsApp para ${nums}:`, err.message || err);
    }
  }

  return `${nums}@s.whatsapp.net`;
}

function getAgoraBR() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const obj = {};
  for (const part of parts) {
    if (part.type !== "literal") obj[part.type] = part.value;
  }
  let hour = parseInt(obj.hour, 10);
  if (hour === 24) hour = 0;

  const hoje = `${obj.year}-${obj.month}-${obj.day}`;
  const minutosHoje = hour * 60 + parseInt(obj.minute, 10);
  return { hoje, minutosHoje };
}

function formatBRDate(dateStr) {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function interpolateTemplate(tpl, vars) {
  return (tpl || "")
    .replace(/\{clienteName\}/g, vars.clienteName)
    .replace(/\{clienteTelefone\}/g, vars.clienteTelefone)
    .replace(/\{procedimentoName\}/g, vars.procedimentoName)
    .replace(/\{unidadeName\}/g, vars.unidadeName)
    .replace(/\{data\}/g, vars.data)
    .replace(/\{horario\}/g, vars.horario)
    .replace(/\{codigo\}/g, vars.codigo)
    .replace(/\{status\}/g, vars.status);
}

// 1. Processa fila de mensagens recém-criadas pelo painel ou pelo site (confirmações e testes)
async function processarFilaDeEnvioImediato() {
  if (botStatus !== "connected" || !clientSocket) return;
  const db = getDb();
  if (!db) return;

  try {
    const pendentes = db
      .prepare(
        `SELECT * FROM whatsapp_message_logs
         WHERE status IN ('queued_waiting_connection', 'pending_send')
         ORDER BY created_at ASC LIMIT 20`
      )
      .all();

    for (const item of pendentes) {
      const jid = await formatarEValidarTelefoneBrasil(item.recipient_phone);
      if (!jid) continue;

      try {
        await clientSocket.sendMessage(jid, { text: item.message_content });
        db.prepare(
          `UPDATE whatsapp_message_logs
           SET status = 'sent', delivery_mode = 'baileys_live'
           WHERE id = ?`
        ).run(item.id);
        console.log(
          `✅ [Baileys] Mensagem (${item.message_type}) enviada para ${item.recipient_name} (${jid})`
        );
      } catch (err) {
        console.error(
          `❌ [Baileys] Falha ao enviar para ${item.recipient_name}:`,
          err.message || err
        );
      }
    }
  } catch (err) {
    console.error("Erro ao processar fila imediata:", err.message || err);
  } finally {
    db.close();
  }
}

// 2. Rotina idêntica ao verificarAgendamentos() do bot da barbearia (a cada 5 minutos)
async function verificarAgendamentosProximos() {
  if (botStatus !== "connected" || !clientSocket) return;
  const db = getDb();
  if (!db) return;

  try {
    const { hoje, minutosHoje } = getAgoraBR();
    const config = db
      .prepare("SELECT * FROM whatsapp_bot_config WHERE id = 'main'")
      .get();

    if (!config || !config.reminder_2h_enabled) {
      db.close();
      return;
    }

    const agendamentosHoje = db
      .prepare(
        `SELECT * FROM appointments
         WHERE appointment_date = ?
           AND status = 'confirmed'
           AND whatsapp_reminder_sent = 0`
      )
      .all(hoje);

    for (const appt of agendamentosHoje) {
      const [h, m] = (appt.start_time || "00:00")
        .split(":")
        .map((n) => parseInt(n, 10));
      const minutosAgendamento = h * 60 + m;
      const diferencaMinutos = minutosAgendamento - minutosHoje;

      // Envia lembrete para agendamentos nas próximas 2 horas (120 min)
      if (diferencaMinutos >= -5 && diferencaMinutos <= 120) {
        console.log(
          `⏳ Encontrado atendimento próximo da Dra. Fernanda! Horário: ${appt.start_time} (faltam ${diferencaMinutos} min)`
        );

        const vars = {
          clienteName: appt.client_name_snapshot,
          clienteTelefone: appt.client_phone_snapshot,
          procedimentoName: appt.procedure_name_snapshot,
          unidadeName: appt.unit_name_snapshot,
          data: formatBRDate(appt.appointment_date),
          horario: appt.start_time,
          codigo: appt.booking_code,
          status: "Confirmado ✅",
        };

        const jidCliente = await formatarEValidarTelefoneBrasil(
          appt.client_phone_snapshot
        );
        let clienteEnviado = false;

        if (jidCliente) {
          const msgCliente = interpolateTemplate(
            config.template_client_reminder,
            vars
          );
          try {
            await clientSocket.sendMessage(jidCliente, { text: msgCliente });
            console.log(
              `✅ Lembrete enviado para paciente: ${appt.client_name_snapshot} (${jidCliente})`
            );
            clienteEnviado = true;

            db.prepare(
              `INSERT INTO whatsapp_message_logs (
                id, appointment_id, recipient_type, recipient_name, recipient_phone,
                message_type, message_content, delivery_mode, status, created_at
              ) VALUES (?, ?, 'client', ?, ?, 'reminder_2h', ?, 'baileys_live', 'sent', ?)`
            ).run(
              `walog-${Date.now()}-c`,
              appt.id,
              appt.client_name_snapshot,
              appt.client_phone_snapshot,
              msgCliente,
              new Date().toISOString()
            );
          } catch (e) {
            console.error(
              `❌ Erro ao enviar lembrete para paciente ${appt.client_name_snapshot}:`,
              e.message || e
            );
          }
        }

        if (config.notify_professional_enabled && config.professional_phone) {
          const jidProf = await formatarEValidarTelefoneBrasil(
            config.professional_phone
          );
          if (jidProf) {
            const msgProf = interpolateTemplate(
              config.template_professional_alert,
              vars
            );
            try {
              await clientSocket.sendMessage(jidProf, { text: msgProf });
              console.log(
                `✅ Alerta enviado para Dra. Fernanda (${jidProf})`
              );
            } catch (e) {
              console.error(
                `❌ Erro ao enviar alerta para Dra. Fernanda:`,
                e.message || e
              );
            }
          }
        }

        if (clienteEnviado) {
          db.prepare(
            "UPDATE appointments SET whatsapp_reminder_sent = 1 WHERE id = ?"
          ).run(appt.id);
        }
      }
    }
  } catch (err) {
    console.error("Erro na rotina de verificação de lembretes:", err.message || err);
  } finally {
    db.close();
  }
}

let cronTask = null;
let queueInterval = null;

function iniciarRotinas() {
  if (!cronTask) {
    console.log(
      "⏰ Rotina de lembretes da Dra. Fernanda iniciada (verificando a cada 5 minutos)."
    );
    verificarAgendamentosProximos();
    cronTask = cron.schedule("*/5 * * * *", verificarAgendamentosProximos);
  }
  if (!queueInterval) {
    queueInterval = setInterval(processarFilaDeEnvioImediato, 6000);
  }
}

async function connectToWhatsApp() {
  try {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: state,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    clientSocket = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQRRaw = qr;
        latestQRDataUrl = await QRCode.toDataURL(qr, {
          width: 320,
          margin: 2,
          color: { dark: "#07152B", light: "#FFFFFF" },
        });
        console.log(
          "📲 [QR CODE PRONTO] Acesse http://localhost:3000/admin/whatsapp (ou http://localhost:3003) para escanear no WhatsApp da Dra. Fernanda!"
        );
        updateBotStatusInDb("qr_ready", latestQRDataUrl);
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(
          "Conexão WhatsApp fechada. Reconectando:",
          shouldReconnect
        );

        if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 4000);
        } else {
          console.log(
            "Aparelho desconectado (Logout). Limpando sessão e gerando novo QR Code..."
          );
          updateBotStatusInDb("disconnected", null, null, null);
          try {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          } catch {
            // ignore
          }
          setTimeout(connectToWhatsApp, 3000);
        }
      } else if (connection === "open") {
        const me = sock.user;
        connectedPhone = (me?.id || "").split(":")[0].split("@")[0] || "Conectado";
        connectedName = me?.name || "WhatsApp Dra. Fernanda Caetano";
        latestQRDataUrl = null;
        latestQRRaw = null;

        console.log(
          `✨ Bot do WhatsApp (Baileys) da Dra. Fernanda conectado com sucesso! (${connectedPhone})`
        );
        updateBotStatusInDb("connected", null, connectedPhone, connectedName);
        iniciarRotinas();
      }
    });
  } catch (err) {
    console.error("Erro ao iniciar conexão Baileys:", err.message || err);
    setTimeout(connectToWhatsApp, 10000);
  }
}

// Servidor HTTP na porta 3003 (com API de controle local para o Painel Admin + visualização direta)
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: botStatus,
        qrCodeDataUrl: latestQRDataUrl,
        connectedPhone,
        connectedName,
      })
    );
    return;
  }

  if (req.url === "/restart-qr" && req.method === "POST") {
    try {
      if (clientSocket) {
        clientSocket.end(undefined);
      }
    } catch {
      // ignore
    }
    setTimeout(connectToWhatsApp, 500);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === "/logout" && req.method === "POST") {
    try {
      if (clientSocket) {
        await clientSocket.logout();
      }
    } catch {
      // ignore
    }
    try {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
    updateBotStatusInDb("disconnected", null, null, null);
    setTimeout(connectToWhatsApp, 1500);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Página HTML amigável igual à do bot da barbearia
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  if (botStatus === "qr_ready" && latestQRDataUrl) {
    res.end(`
      <html>
        <head>
          <meta http-equiv="refresh" content="6" />
          <title>QR Code WhatsApp — Dra. Fernanda Caetano</title>
        </head>
        <body style="text-align:center;font-family:sans-serif;padding-top:40px;background:#07152B;color:#F7F5F1;">
          <div style="background:white;color:#07152B;display:inline-block;padding:32px;border-radius:20px;border:3px solid #C5A46D;">
            <h2 style="margin-top:0;">Escaneie no WhatsApp da Dra. Fernanda Caetano</h2>
            <img src="${latestQRDataUrl}" alt="QR Code" style="width:280px;height:280px;border:4px solid #D97732;border-radius:12px;" />
            <p style="color:#64748B;font-size:13px;margin-top:16px;">🔄 Atualiza automaticamente e sincroniza com /admin/whatsapp</p>
          </div>
        </body>
      </html>
    `);
  } else if (botStatus === "connected") {
    res.end(`
      <html>
        <body style="text-align:center;font-family:sans-serif;padding-top:60px;background:#07152B;color:#F7F5F1;">
          <div style="background:white;color:#07152B;display:inline-block;padding:40px;border-radius:20px;">
            <h1 style="color:#15803d;">✅ Bot WhatsApp Dra. Fernanda Conectado!</h1>
            <p>Aparelho: ${connectedName || ""} (${connectedPhone || ""})</p>
          </div>
        </body>
      </html>
    `);
  } else {
    res.end(`
      <html>
        <head><meta http-equiv="refresh" content="4" /></head>
        <body style="text-align:center;font-family:sans-serif;padding-top:60px;background:#07152B;color:#F7F5F1;">
          <h2>⏳ Iniciando sessão do WhatsApp (Baileys)...</h2>
        </body>
      </html>
    `);
  }
});

server.listen(BOT_PORT, () => {
  console.log(
    `🚀 Servidor do Bot WhatsApp (Dra. Fernanda Caetano) rodando na porta ${BOT_PORT}.`
  );
  connectToWhatsApp();
  setInterval(syncWithRemoteSiteIfConfigured, 5000);
});
