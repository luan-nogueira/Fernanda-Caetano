import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET() {
  try {
    await requireAdminSession();
    const db = getDb();

    const settings = db
      .prepare("SELECT * FROM site_settings WHERE id = 'main'")
      .get();
    const sections = db
      .prepare("SELECT * FROM site_sections ORDER BY sort_order ASC")
      .all();
    const links = db
      .prepare("SELECT * FROM custom_links ORDER BY sort_order ASC")
      .all();
    const units = db
      .prepare("SELECT id, slug, name, short_name FROM units ORDER BY sort_order ASC")
      .all();
    const procedures = db
      .prepare(
        "SELECT id, slug, name FROM procedures WHERE is_archived = 0 ORDER BY sort_order ASC"
      )
      .all();

    return NextResponse.json({
      settings,
      sections,
      links,
      units,
      procedures,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar editor da página pública." },
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

    // 1. Salvar rascunho de configurações do site
    if (body.action === "save_draft") {
      db.prepare(
        "UPDATE site_settings SET draft_json = ?, updated_at = ? WHERE id = 'main'"
      ).run(JSON.stringify(body.draft), now);
      return NextResponse.json({ success: true });
    }

    // 2. Publicar configurações do site
    if (body.action === "publish_settings") {
      const s = body.settings;
      db.prepare(
        `UPDATE site_settings
         SET professional_name = ?,
             professional_subtitle = ?,
             professional_bio = ?,
             hero_badge = ?,
             avatar_url = ?,
             instagram_url = ?,
             instagram_handle = ?,
             primary_color = ?,
             accent_color = ?,
             background_color = ?,
             gold_color = ?,
             booking_mode = ?,
             online_booking_enabled = ?,
             min_advance_hours = ?,
             max_advance_days = ?,
             slot_interval_minutes = ?,
             booking_success_message = ?,
             privacy_policy_text = ?,
             about_full_text = ?,
             draft_json = NULL,
             published_at = ?,
             updated_at = ?
         WHERE id = 'main'`
      ).run(
        s.professional_name,
        s.professional_subtitle,
        s.professional_bio,
        s.hero_badge,
        s.avatar_url,
        s.instagram_url,
        s.instagram_handle,
        s.primary_color || "#07152B",
        s.accent_color || "#D97732",
        s.background_color || "#F7F5F1",
        s.gold_color || "#C5A46D",
        s.booking_mode || "automatic",
        s.online_booking_enabled ? 1 : 0,
        Number(s.min_advance_hours) || 1,
        Number(s.max_advance_days) || 60,
        Number(s.slot_interval_minutes) || 30,
        s.booking_success_message,
        s.privacy_policy_text,
        s.about_full_text,
        now,
        now
      );
      return NextResponse.json({ success: true });
    }

    // 3. Criar novo botão
    if (body.action === "create_link") {
      const id = `link-${crypto.randomUUID().slice(0, 8)}`;
      const maxOrderRow = db
        .prepare("SELECT MAX(sort_order) as maxOrder FROM custom_links")
        .get() as { maxOrder: number | null };
      const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;

      db.prepare(
        `INSERT INTO custom_links (
          id, title, subtitle, icon_name, destination_type, destination_value,
          whatsapp_message, style_variant, badge_text, is_active, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        body.title.trim(),
        body.subtitle?.trim() || null,
        body.icon_name || "Sparkles",
        body.destination_type || "internal_page",
        body.destination_value || "/agendar",
        body.whatsapp_message || null,
        body.style_variant || "default",
        body.badge_text || null,
        body.is_active !== false ? 1 : 0,
        nextOrder,
        now,
        now
      );
      return NextResponse.json({ success: true, id });
    }

    // 4. Atualizar botão existente
    if (body.action === "update_link") {
      db.prepare(
        `UPDATE custom_links
         SET title = ?,
             subtitle = ?,
             icon_name = ?,
             destination_type = ?,
             destination_value = ?,
             whatsapp_message = ?,
             style_variant = ?,
             badge_text = ?,
             is_active = ?,
             updated_at = ?
         WHERE id = ?`
      ).run(
        body.title.trim(),
        body.subtitle?.trim() || null,
        body.icon_name || "Sparkles",
        body.destination_type,
        body.destination_value,
        body.whatsapp_message || null,
        body.style_variant || "default",
        body.badge_text || null,
        body.is_active ? 1 : 0,
        now,
        body.id
      );
      return NextResponse.json({ success: true });
    }

    // 5. Reordenar botões (drag & drop ou setas)
    if (body.action === "reorder_links" && Array.isArray(body.orderedIds)) {
      const stmt = db.prepare(
        "UPDATE custom_links SET sort_order = ?, updated_at = ? WHERE id = ?"
      );
      body.orderedIds.forEach((id: string, idx: number) => {
        stmt.run(idx + 1, now, id);
      });
      return NextResponse.json({ success: true });
    }

    // 6. Excluir botão
    if (body.action === "delete_link") {
      db.prepare("DELETE FROM custom_links WHERE id = ?").run(body.id);
      return NextResponse.json({ success: true });
    }

    // 7. Atualizar seções da página
    if (body.action === "update_sections" && Array.isArray(body.sections)) {
      const stmt = db.prepare(
        `UPDATE site_sections
         SET title = ?, subtitle = ?, is_visible = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`
      );
      body.sections.forEach(
        (
          sec: {
            id: string;
            title: string;
            subtitle?: string;
            is_visible: boolean | number;
          },
          idx: number
        ) => {
          stmt.run(
            sec.title,
            sec.subtitle || null,
            sec.is_visible ? 1 : 0,
            idx + 1,
            now,
            sec.id
          );
        }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao salvar personalização do site." },
      { status: 500 }
    );
  }
}

