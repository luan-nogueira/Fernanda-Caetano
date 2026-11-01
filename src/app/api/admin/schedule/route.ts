import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";
import crypto from "crypto";

export async function GET() {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso();
    const db = getDb();

    const units = db
      .prepare("SELECT * FROM units ORDER BY sort_order ASC")
      .all();
    const workingHours = db
      .prepare("SELECT * FROM working_hours ORDER BY unit_id ASC, day_of_week ASC")
      .all();
    const blocks = db
      .prepare("SELECT * FROM schedule_blocks ORDER BY block_date DESC")
      .all();
    const exceptions = db
      .prepare(
        "SELECT * FROM availability_exceptions ORDER BY exception_date DESC"
      )
      .all();

    return NextResponse.json({
      units,
      workingHours,
      blocks,
      exceptions,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar unidades e horários." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso(true);
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    if (body.action === "update_unit") {
      db.prepare(
        `UPDATE units
         SET name = ?,
             short_name = ?,
             description = ?,
             address_line = ?,
             neighborhood_city = ?,
             maps_url = ?,
             whatsapp_phone = ?,
             is_active = ?,
             is_demo_data = 0,
             updated_at = ?
         WHERE id = ?`
      ).run(
        body.name,
        body.short_name,
        body.description || "",
        body.address_line,
        body.neighborhood_city,
        body.maps_url || "",
        (body.whatsapp_phone || "").replace(/\D/g, ""),
        body.is_active ? 1 : 0,
        now,
        body.id
      );
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    if (body.action === "update_working_hours") {
      const { unitId, schedule } = body; // schedule: Array<{ day_of_week, is_open, shifts }>
      const upsert = db.prepare(
        `INSERT INTO working_hours (id, unit_id, day_of_week, is_open, shifts_json)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(unit_id, day_of_week) DO UPDATE SET
           is_open = excluded.is_open,
           shifts_json = excluded.shifts_json`
      );

      for (const item of schedule) {
        upsert.run(
          `wh-${unitId}-${item.day_of_week}`,
          unitId,
          Number(item.day_of_week),
          item.is_open ? 1 : 0,
          JSON.stringify(item.shifts || [])
        );
      }

      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    if (body.action === "create_block") {
      const id = `blk-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(
        `INSERT INTO schedule_blocks (
          id, block_date, unit_id, is_full_day, start_time, end_time, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        body.block_date,
        body.unit_id || null,
        body.is_full_day ? 1 : 0,
        body.is_full_day ? null : body.start_time || "08:00",
        body.is_full_day ? null : body.end_time || "18:00",
        body.reason || "Bloqueio administrativo",
        now
      );
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "delete_block") {
      db.prepare("DELETE FROM schedule_blocks WHERE id = ?").run(body.id);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    if (body.action === "create_exception") {
      const id = `exc-${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(
        `INSERT INTO availability_exceptions (
          id, exception_date, unit_id, exception_type, title, is_closed, custom_shifts_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        body.exception_date,
        body.unit_id || null,
        body.exception_type || "holiday",
        body.title || "Feriado / Ausência",
        body.is_closed !== false ? 1 : 0,
        body.custom_shifts_json || null,
        now
      );
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "delete_exception") {
      db.prepare("DELETE FROM availability_exceptions WHERE id = ?").run(
        body.id
      );
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao salvar configurações de horários/unidades." },
      { status: 500 }
    );
  }
}

