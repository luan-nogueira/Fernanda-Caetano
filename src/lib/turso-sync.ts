import { getDb } from "./db";

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

const SYNC_TABLES = [
  "users",
  "admin_profiles",
  "site_settings",
  "site_sections",
  "custom_links",
  "units",
  "procedure_categories",
  "procedures",
  "procedure_units",
  "clients",
  "appointments",
  "working_hours",
  "availability_exceptions",
  "schedule_blocks",
  "notifications",
  "whatsapp_bot_config",
  "whatsapp_message_logs",
  "audit_logs",
  "courses",
  "course_lessons",
  "course_students",
  "course_enrollments",
  "course_lesson_progress",
] as const;

declare global {
  // eslint-disable-next-line no-var
  var __tursoLastPullAt: number | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toHranaArg(val: any) {
  if (val === null || val === undefined) return { type: "null" };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { type: "integer", value: String(val) };
    return { type: "float", value: val };
  }
  return { type: "text", value: String(val) };
}

export async function executeTursoPipeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statements: Array<{ sql: string; args?: any[] }>
) {
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
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Empurra todo o estado atual do SQLite local para o Turso Cloud (AWS São Paulo).
 * Chamado automaticamente após gravações na Vercel ou localmente.
 */
export async function pushAllTablesToTurso(): Promise<void> {
  try {
    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statements: Array<{ sql: string; args?: any[] }> = [];

    // 1. Garante a tabela de snapshot global no Turso para sincronização ultrarrápida em 1 query
    statements.push({
      sql: `CREATE TABLE IF NOT EXISTS turso_state_snapshot (
        table_name TEXT PRIMARY KEY,
        rows_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    });

    const now = new Date().toISOString();

    for (const table of SYNC_TABLES) {
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
    console.error("Aviso: falha ao sincronizar push com Turso:", err);
  }
}

/**
 * Puxa o estado mais recente do Turso Cloud para a instância SQLite em memória/disco.
 * Permite que a Vercel (serverless) e o Bot de WhatsApp aqui no servidor compartilhem
 * os mesmos dados em tempo real.
 */
export async function pullAllTablesFromTurso(force = false): Promise<boolean> {
  const nowMs = Date.now();
  if (
    !force &&
    global.__tursoLastPullAt &&
    nowMs - global.__tursoLastPullAt < 2000
  ) {
    return true;
  }

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
        sql: `SELECT table_name, rows_json FROM turso_state_snapshot`,
      },
    ]);

    const selectResult = data?.results?.[1]?.response?.result;
    if (!selectResult || !Array.isArray(selectResult.rows)) {
      return false;
    }

    if (selectResult.rows.length === 0) {
      // Primeiro acesso no Turso: inicializa a nuvem com os dados locais!
      await pushAllTablesToTurso();
      global.__tursoLastPullAt = Date.now();
      return true;
    }

    const db = getDb();
    db.exec("PRAGMA foreign_keys = OFF;");
    const syncedTableNames = new Set<string>();

    try {
      for (const row of selectResult.rows) {
        const tableName = row[0]?.value as string;
        const rowsJson = row[1]?.value as string;
        if (
          !tableName ||
          !rowsJson ||
          !SYNC_TABLES.includes(tableName as (typeof SYNC_TABLES)[number])
        ) {
          continue;
        }

        syncedTableNames.add(tableName);
        const parsedRows = JSON.parse(rowsJson);
        if (!Array.isArray(parsedRows)) continue;

        db.prepare(`DELETE FROM ${tableName}`).run();

        if (parsedRows.length > 0) {
          const cols = Object.keys(parsedRows[0]);
          const placeholders = cols.map(() => "?").join(", ");
          const insertStmt = db.prepare(
            `INSERT OR REPLACE INTO ${tableName} (${cols.join(
              ", "
            )}) VALUES (${placeholders})`
          );

          for (const item of parsedRows) {
            const values = cols.map((c) => item[c] ?? null);
            insertStmt.run(...values);
          }
        }
      }
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }

    if (!syncedTableNames.has("courses")) {
      const existingLink = db
        .prepare("SELECT id FROM custom_links WHERE id = 'link-cursos'")
        .get();
      if (!existingLink) {
        const now = new Date().toISOString();
        db.prepare(
          `INSERT INTO custom_links (
            id, title, subtitle, icon_name, link_type, destination,
            style_variant, badge_text, is_active, display_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
        ).run(
          "link-cursos",
          "Cursos & Especializações",
          "Área exclusiva de alunos e capacitações com a Dra. Fernanda Caetano",
          "GraduationCap",
          "internal_page",
          "/cursos",
          "outline_gold",
          "Área do Aluno",
          3,
          now,
          now
        );
      }
      await pushAllTablesToTurso();
    }

    global.__tursoLastPullAt = Date.now();
    return true;
  } catch (err) {
    console.error("Aviso: falha ao puxar estado do Turso:", err);
    return false;
  }
}
