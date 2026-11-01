import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizePhoneBR } from "@/lib/booking-service";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    let sql = `
      SELECT
        c.*,
        COUNT(a.id) as total_appointments,
        SUM(CASE WHEN a.status = 'completed' OR a.status = 'confirmed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN a.status IN ('confirmed', 'pending') AND a.appointment_date >= date('now') THEN 1 ELSE 0 END) as upcoming_count,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        MAX(a.appointment_date) as last_appointment_date
      FROM clients c
      LEFT JOIN appointments a ON a.client_id = c.id
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    if (search) {
      sql += ` WHERE LOWER(c.full_name) LIKE LOWER(?) OR c.whatsapp_phone LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` GROUP BY c.id ORDER BY c.updated_at DESC`;

    const clients = db.prepare(sql).all(...params);
    return NextResponse.json({ clients });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao consultar clientes." },
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

    if (body.id) {
      db.prepare(
        `UPDATE clients
         SET full_name = ?, whatsapp_phone = ?, email = ?, notes = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        body.full_name.trim(),
        normalizePhoneBR(body.whatsapp_phone),
        body.email?.trim() || null,
        body.notes?.trim() || null,
        now,
        body.id
      );
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, id: body.id });
    }

    const id = `client-${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(
      `INSERT INTO clients (
        id, full_name, whatsapp_phone, email, notes, lgpd_consent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.full_name.trim(),
      normalizePhoneBR(body.whatsapp_phone),
      body.email?.trim() || null,
      body.notes?.trim() || null,
      now,
      now,
      now
    );

    await pushAllTablesToTurso();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao salvar cliente." },
      { status: 500 }
    );
  }
}

