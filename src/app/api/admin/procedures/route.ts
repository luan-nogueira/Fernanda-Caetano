import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Procedure, ProcedureCategory } from "@/types/domain";
import crypto from "crypto";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    await requireAdminSession();
    const db = getDb();

    const categories = db
      .prepare("SELECT * FROM procedure_categories ORDER BY sort_order ASC")
      .all() as ProcedureCategory[];

    const proceduresRaw = db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM procedures p
         LEFT JOIN procedure_categories c ON c.id = p.category_id
         WHERE p.is_archived = 0
         ORDER BY p.sort_order ASC`
      )
      .all() as Procedure[];

    const procUnits = db
      .prepare("SELECT procedure_id, unit_id FROM procedure_units")
      .all() as Array<{ procedure_id: string; unit_id: string }>;

    const procedures = proceduresRaw.map((p) => ({
      ...p,
      unit_ids: procUnits
        .filter((r) => r.procedure_id === p.id)
        .map((r) => r.unit_id),
    }));

    return NextResponse.json({ categories, procedures });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar procedimentos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    if (body.entity === "category") {
      const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
      const slug = slugify(body.name) || id;
      db.prepare(
        `INSERT INTO procedure_categories (id, slug, name, description, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`
      ).run(id, slug, body.name.trim(), body.description || null, body.sort_order || 10);
      return NextResponse.json({ success: true, id });
    }

    const id = `proc-${crypto.randomUUID().slice(0, 8)}`;
    const baseSlug = slugify(body.name) || id;
    const existingSlug = db
      .prepare("SELECT id FROM procedures WHERE slug = ?")
      .get(baseSlug);
    const slug = existingSlug ? `${baseSlug}-${id.slice(-4)}` : baseSlug;

    db.prepare(
      `INSERT INTO procedures (
        id, slug, category_id, name, short_description, full_description,
        image_url, duration_minutes, buffer_before_minutes, buffer_after_minutes,
        price_cents, show_price, modality, preparation_instructions,
        online_booking_enabled, requires_approval, is_visible_public,
        is_active, is_archived, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
    ).run(
      id,
      slug,
      body.category_id || "cat-feridas",
      body.name.trim(),
      body.short_description?.trim() || body.name.trim(),
      body.full_description?.trim() || body.short_description?.trim() || "",
      body.image_url || null,
      Number(body.duration_minutes) || 60,
      Number(body.buffer_before_minutes) || 0,
      Number(body.buffer_after_minutes) || 15,
      body.price_cents ? Number(body.price_cents) : null,
      body.show_price ? 1 : 0,
      body.modality || "presencial",
      body.preparation_instructions || null,
      body.online_booking_enabled !== false ? 1 : 0,
      body.requires_approval ? 1 : 0,
      body.is_visible_public !== false ? 1 : 0,
      body.is_active !== false ? 1 : 0,
      Number(body.sort_order) || 20,
      now,
      now
    );

    const unitIds: string[] =
      Array.isArray(body.unit_ids) && body.unit_ids.length > 0
        ? body.unit_ids
        : ["unit-farol", "unit-platinum"];

    const insertPU = db.prepare(
      "INSERT OR IGNORE INTO procedure_units (procedure_id, unit_id) VALUES (?, ?)"
    );
    for (const uId of unitIds) {
      insertPU.run(id, uId);
    }

    return NextResponse.json({ success: true, id, slug });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao cadastrar procedimento." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdminSession();
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    if (!body.id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    db.prepare(
      `UPDATE procedures
       SET category_id = ?,
           name = ?,
           short_description = ?,
           full_description = ?,
           image_url = ?,
           duration_minutes = ?,
           buffer_before_minutes = ?,
           buffer_after_minutes = ?,
           price_cents = ?,
           show_price = ?,
           modality = ?,
           preparation_instructions = ?,
           online_booking_enabled = ?,
           requires_approval = ?,
           is_visible_public = ?,
           is_active = ?,
           sort_order = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      body.category_id,
      body.name.trim(),
      body.short_description?.trim() || "",
      body.full_description?.trim() || "",
      body.image_url || null,
      Number(body.duration_minutes) || 60,
      Number(body.buffer_before_minutes) || 0,
      Number(body.buffer_after_minutes) || 15,
      body.price_cents !== null && body.price_cents !== ""
        ? Number(body.price_cents)
        : null,
      body.show_price ? 1 : 0,
      body.modality || "presencial",
      body.preparation_instructions || null,
      body.online_booking_enabled ? 1 : 0,
      body.requires_approval ? 1 : 0,
      body.is_visible_public ? 1 : 0,
      body.is_active ? 1 : 0,
      Number(body.sort_order) || 1,
      now,
      body.id
    );

    if (Array.isArray(body.unit_ids)) {
      db.prepare("DELETE FROM procedure_units WHERE procedure_id = ?").run(
        body.id
      );
      const insertPU = db.prepare(
        "INSERT OR IGNORE INTO procedure_units (procedure_id, unit_id) VALUES (?, ?)"
      );
      for (const uId of body.unit_ids) {
        insertPU.run(body.id, uId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao atualizar procedimento." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    // Preservar integridade histórica caso haja agendamentos vinculados (arquivamento seguro)
    const hasHistory = db
      .prepare("SELECT 1 FROM appointments WHERE procedure_id = ? LIMIT 1")
      .get(id);

    if (hasHistory) {
      db.prepare(
        "UPDATE procedures SET is_archived = 1, is_active = 0, is_visible_public = 0, updated_at = ? WHERE id = ?"
      ).run(new Date().toISOString(), id);
      return NextResponse.json({
        success: true,
        archived: true,
        message:
          "Procedimento arquivado com segurança para preservar o histórico de agendamentos anteriores.",
      });
    }

    db.prepare("DELETE FROM procedures WHERE id = ?").run(id);
    return NextResponse.json({
      success: true,
      archived: false,
      message: "Procedimento excluído.",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao remover procedimento." },
      { status: 500 }
    );
  }
}

