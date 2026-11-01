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
const { spawn } = require("child_process");
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
const VIDEOS_DIR = path.join(__dirname, "cursos-videos");
const BOT_PORT = Number(process.env.BOT_PORT || 3003);
const TURSO_URL = (
  process.env.TURSO_DATABASE_URL ||
  "libsql://fernanda-caetano-luan-nogueira.aws-sa-east-1.turso.io"
).replace(/^libsql:\/\//, "https://");
const DEFAULT_TOKEN_PARTS = [
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9",
  "eyJhIjoicnciLCJpYXQiOjE3OTM1NTkzNzAsImlkIjoiMDFhMTk4NzctOTkwMS03YzAzLTk2NGQtZGYxMDRmMWZiMWFlIiwia2lkIjoiTnl5eW44ejBRRTlVbFBDMHJOT0JlWGJpZDdqRFViSEJ6R3VkOEpzWTV2TSIsInJpZCI6ImY5NmE1MjUwLTI1MDEtNGZmYS1hNzJiLTU4ZmI3MjE2ZDYxNyJ9",
  "Tla6mVttyGWVzunrhRbdbpVs9QJPfC1irZyBAf_G15cLeUmGm-5jqgd6iEsAaz6riO7w28q97qFU9SCMtn0KBw",
];
const TURSO_TOKEN =
  process.env.TURSO_AUTH_TOKEN || DEFAULT_TOKEN_PARTS.join(".");

let latestQRDataUrl = null;
let latestQRRaw = null;
let botStatus = "starting";
let clientSocket = null;
let connectedPhone = null;
let connectedName = null;
let isSyncingTurso = false;
let publicMediaServerUrl = "";
let lastSyncedMediaFingerprint = "";

function listServerVideoFiles() {
  try {
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(VIDEOS_DIR);
    return files
      .filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(VIDEOS_DIR, f));
        return {
          name: f,
          sizeMB: (st.size / (1024 * 1024)).toFixed(2),
          updatedAt: st.mtime.toISOString(),
        };
      });
  } catch {
    return [];
  }
}

async function publishMediaBridgeToTurso(force = false) {
  try {
    const files = listServerVideoFiles();
    const payload = JSON.stringify({
      mediaServerUrl: publicMediaServerUrl,
      videosFolderPath: VIDEOS_DIR,
      files,
      updatedAt: new Date().toISOString(),
    });
    const fingerprint = `${publicMediaServerUrl}|${files
      .map((f) => `${f.name}:${f.sizeMB}`)
      .join(",")}`;
    if (!force && fingerprint === lastSyncedMediaFingerprint) {
      return;
    }
    lastSyncedMediaFingerprint = fingerprint;

    const db = getDb();
    if (!db) return;
    try {
      db.prepare(
        `INSERT INTO site_sections (id, title, subtitle, is_visible, sort_order, updated_at)
         VALUES ('server_media_bridge', ?, ?, 0, 999, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           subtitle = excluded.subtitle,
           updated_at = excluded.updated_at`
      ).run(publicMediaServerUrl || "", payload, new Date().toISOString());
    } finally {
      db.close();
    }

    await pushTablesToTurso(["site_sections"]);
  } catch (err) {
    console.error("Erro ao publicar ponte de vídeos no Turso:", err.message || err);
  }
}

function startMediaTunnel() {
  const cloudflaredPath = path.join(__dirname, "cloudflared.exe");
  if (fs.existsSync(cloudflaredPath)) {
    const proc = spawn(
      cloudflaredPath,
      ["tunnel", "--url", `http://localhost:${BOT_PORT}`, "--no-autoupdate"],
      { windowsHide: true }
    );

    const onOutput = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && match[0] !== publicMediaServerUrl) {
        publicMediaServerUrl = match[0];
        console.log(
          `🌐 [Ponte de Vídeos Online] Servidor local conectado à Vercel via HTTPS: ${publicMediaServerUrl}`
        );
        publishMediaBridgeToTurso(true);
      }
    };

    proc.stdout.on("data", onOutput);
    proc.stderr.on("data", onOutput);
    proc.on("close", () => {
      setTimeout(startMediaTunnel, 5000);
    });
  }
}

function toHranaArg(val) {
  if (val === null || val === undefined) return { type: "null" };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { type: "integer", value: String(val) };
    return { type: "float", value: val };
  }
  return { type: "text", value: String(val) };
}

async function executeTursoPipeline(statements) {
  if (!TURSO_URL || !TURSO_TOKEN) return null;
  const requests = [
    ...statements.map((s) => ({
      type: "execute",
      stmt: {
        sql: s.sql,
        args: (s.args || []).map(toHranaArg),
      },
    })),
    { type: "close" },
  ];

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}`);
  }
  return res.json();
}

async function pushTablesToTurso(tableNames) {
  const db = getDb();
  if (!db) return;
  try {
    const now = new Date().toISOString();
    const statements = [
      {
        sql: `CREATE TABLE IF NOT EXISTS turso_state_snapshot (
          table_name TEXT PRIMARY KEY,
          rows_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
    ];

    for (const table of tableNames) {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      statements.push({
        sql: `INSERT INTO turso_state_snapshot (table_name, rows_json, updated_at)
              VALUES (?, ?, ?)
              ON CONFLICT(table_name) DO UPDATE SET
                rows_json = excluded.rows_json,
                updated_at = excluded.updated_at`,
        args: [table, JSON.stringify(rows), now],
      });
    }

    await executeTursoPipeline(statements);
  } catch (err) {
    console.error("Aviso: erro ao enviar tabelas para Turso:", err.message || err);
  } finally {
    db.close();
  }
}

async function syncWithTursoCloud() {
  if (isSyncingTurso) return;
  isSyncingTurso = true;
  try {
    const data = await executeTursoPipeline([
      {
        sql: `CREATE TABLE IF NOT EXISTS turso_state_snapshot (
          table_name TEXT PRIMARY KEY,
          rows_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      },
      {
        sql: `SELECT table_name, rows_json FROM turso_state_snapshot WHERE table_name IN ('whatsapp_bot_config', 'whatsapp_message_logs', 'appointments', 'site_sections')`,
      },
    ]);

    const rows = data?.results?.[1]?.response?.result?.rows;
    const db = getDb();
    if (!db) return;

    let deletedAnyVideoFromQueue = false;
    try {
      db.exec("PRAGMA foreign_keys = OFF;");
      if (Array.isArray(rows) && rows.length > 0) {
        for (const r of rows) {
          const tableName = r[0]?.value;
          const rowsJson = r[1]?.value;
          if (!tableName || !rowsJson) continue;
          const parsed = JSON.parse(rowsJson);
          if (!Array.isArray(parsed)) continue;

          if (tableName === "site_sections") {
            const deleteQueueRow = parsed.find(
              (s) => s.id === "server_videos_delete_queue" && s.subtitle
            );
            if (deleteQueueRow && deleteQueueRow.subtitle) {
              try {
                const toDelete = JSON.parse(deleteQueueRow.subtitle);
                if (Array.isArray(toDelete) && toDelete.length > 0) {
                  for (const fname of toDelete) {
                    const safeName = path.basename(String(fname));
                    const targetPath = path.join(VIDEOS_DIR, safeName);
                    if (fs.existsSync(targetPath)) {
                      fs.unlinkSync(targetPath);
                      console.log(
                        `🗑️ [Ponte de Vídeos] Vídeo excluído da pasta cursos-videos por comando do Admin: ${safeName}`
                      );
                    }
                  }
                  deletedAnyVideoFromQueue = true;
                }
              } catch {
                // ignore malformed json
              }
            }
          } else if (tableName === "whatsapp_bot_config" && parsed[0]) {
            const remoteCfg = parsed[0];
            // Atualiza configurações de templates vindas da nuvem, mas preserva o status real do Baileys local
            db.prepare(
              `UPDATE whatsapp_bot_config
               SET auto_confirm_msg_enabled = ?,
                   reminder_2h_enabled = ?,
                   notify_professional_enabled = ?,
                   professional_phone = ?,
                   template_client_booking = ?,
                   template_client_reminder = ?,
                   template_professional_alert = ?,
                   status = ?,
                   qr_code_data = ?,
                   connected_phone = COALESCE(?, connected_phone),
                   connected_name = COALESCE(?, connected_name),
                   updated_at = ?
               WHERE id = 'main'`
            ).run(
              remoteCfg.auto_confirm_msg_enabled ?? 1,
              remoteCfg.reminder_2h_enabled ?? 1,
              remoteCfg.notify_professional_enabled ?? 1,
              remoteCfg.professional_phone ?? "",
              remoteCfg.template_client_booking ?? "",
              remoteCfg.template_client_reminder ?? "",
              remoteCfg.template_professional_alert ?? "",
              botStatus,
              latestQRDataUrl,
              connectedPhone,
              connectedName,
              new Date().toISOString()
            );
          } else if (
            tableName === "whatsapp_message_logs" ||
            tableName === "appointments"
          ) {
            db.prepare(`DELETE FROM ${tableName}`).run();
            if (parsed.length > 0) {
              const cols = Object.keys(parsed[0]);
              const placeholders = cols.map(() => "?").join(", ");
              const stmt = db.prepare(
                `INSERT OR REPLACE INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders})`
              );
              for (const item of parsed) {
                stmt.run(...cols.map((c) => item[c] ?? null));
              }
            }
          }
        }
      }
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
      db.close();
    }

    if (deletedAnyVideoFromQueue) {
      const dbClean = getDb();
      if (dbClean) {
        try {
          dbClean
            .prepare(
              `DELETE FROM site_sections WHERE id = 'server_videos_delete_queue'`
            )
            .run();
        } finally {
          dbClean.close();
        }
      }
      await publishMediaBridgeToTurso(true);
    } else {
      await publishMediaBridgeToTurso(false);
    }

    // Sempre empurra o whatsapp_bot_config atualizado (com QR Code ao vivo / status conectado) para o Turso
    await pushTablesToTurso(["whatsapp_bot_config"]);

    // Se estiver conectado, já processa imediatamente qualquer mensagem na fila que veio da Vercel
    if (botStatus === "connected" && clientSocket) {
      await processarFilaDeEnvioImediato();
    }
  } catch {
    // ignore transient network errors
  } finally {
    isSyncingTurso = false;
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
  pushTablesToTurso(["whatsapp_bot_config"]);
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

  let anySent = false;
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
        anySent = true;
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

  if (anySent) {
    await pushTablesToTurso(["whatsapp_message_logs"]);
  }
}

// 2. Rotina idêntica ao verificarAgendamentos() do bot da barbearia (a cada 5 minutos)
async function verificarAgendamentosProximos() {
  if (botStatus !== "connected" || !clientSocket) return;
  const db = getDb();
  if (!db) return;

  let anyUpdated = false;
  try {
    const { hoje, minutosHoje } = getAgoraBR();
    const config = db
      .prepare("SELECT * FROM whatsapp_bot_config WHERE id = 'main'")
      .get();

    if (!config || !config.reminder_2h_enabled) {
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
            anyUpdated = true;
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
          anyUpdated = true;
        }
      }
    }
  } catch (err) {
    console.error("Erro na rotina de verificação de lembretes:", err.message || err);
  } finally {
    db.close();
  }

  if (anyUpdated) {
    await pushTablesToTurso(["whatsapp_message_logs", "appointments"]);
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

// Servidor HTTP na porta 3003 (com API de controle local para o Painel Admin + Ponte de Vídeos cursos-videos)
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-File-Name, Range"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Range, Accept-Ranges, Content-Length"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || "/", `http://localhost:${BOT_PORT}`);

  // 1. Listar vídeos da pasta cursos-videos do servidor
  if (parsedUrl.pathname === "/videos" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        files: listServerVideoFiles(),
        videosFolderPath: VIDEOS_DIR,
        mediaServerUrl: publicMediaServerUrl,
      })
    );
    return;
  }

  // 2. Streaming de vídeo direto da pasta cursos-videos (suporta HTTP 206 Range para avançar/voltar vídeo)
  if (
    parsedUrl.pathname.startsWith("/videos/stream/") &&
    req.method === "GET"
  ) {
    const rawName = decodeURIComponent(
      parsedUrl.pathname.replace("/videos/stream/", "")
    );
    const safeName = path.basename(rawName);
    const filePath = path.join(VIDEOS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Vídeo não encontrado no servidor." }));
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === ".webm"
        ? "video/webm"
        : ext === ".mov"
        ? "video/quicktime"
        : "video/mp4";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : Math.min(start + 2 * 1024 * 1024, fileSize - 1);
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 3. Upload direto de vídeo do computador da Dra. Fernanda para a pasta cursos-videos deste servidor
  if (parsedUrl.pathname === "/videos/upload" && req.method === "POST") {
    try {
      if (!fs.existsSync(VIDEOS_DIR)) {
        fs.mkdirSync(VIDEOS_DIR, { recursive: true });
      }
      const rawFileName =
        parsedUrl.searchParams.get("filename") ||
        req.headers["x-file-name"] ||
        `aula-${Date.now()}.mp4`;
      const safeFileName = path
        .basename(decodeURIComponent(String(rawFileName)))
        .replace(/[^a-zA-Z0-9._-]/g, "-");

      const destPath = path.join(VIDEOS_DIR, safeFileName);
      const writeStream = fs.createWriteStream(destPath);

      req.pipe(writeStream);

      writeStream.on("finish", async () => {
        const st = fs.statSync(destPath);
        const sizeMB = (st.size / (1024 * 1024)).toFixed(2);
        console.log(
          `📥 [Ponte de Vídeos] Novo vídeo salvo em cursos-videos: ${safeFileName} (${sizeMB} MB)`
        );
        await publishMediaBridgeToTurso(true);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            fileName: safeFileName,
            sizeMB,
            files: listServerVideoFiles(),
          })
        );
      });

      writeStream.on("error", (err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Erro ao gravar vídeo no servidor: " + err.message,
          })
        );
      });
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Falha no upload para o servidor." }));
    }
    return;
  }

  // 4. Excluir vídeo da pasta cursos-videos deste servidor
  if (
    parsedUrl.pathname === "/videos/delete" &&
    (req.method === "POST" || req.method === "DELETE")
  ) {
    let bodyStr = "";
    req.on("data", (chunk) => {
      bodyStr += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const parsed = bodyStr ? JSON.parse(bodyStr) : {};
        const rawName =
          parsed.fileName || parsedUrl.searchParams.get("filename") || "";
        const safeName = path.basename(String(rawName));
        if (!safeName) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Nome do arquivo não informado." }));
          return;
        }
        const targetPath = path.join(VIDEOS_DIR, safeName);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
          console.log(
            `🗑️ [Ponte de Vídeos] Arquivo removido de cursos-videos: ${safeName}`
          );
        }
        await publishMediaBridgeToTurso(true);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            deleted: safeName,
            files: listServerVideoFiles(),
          })
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro ao apagar vídeo do servidor." }));
      }
    });
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
    `🚀 Servidor do Bot WhatsApp + Ponte de Vídeos (Dra. Fernanda Caetano) rodando na porta ${BOT_PORT} e sincronizado com Turso Cloud!`
  );
  connectToWhatsApp();
  startMediaTunnel();
  publishMediaBridgeToTurso(true);
  setInterval(syncWithTursoCloud, 4000);
});
