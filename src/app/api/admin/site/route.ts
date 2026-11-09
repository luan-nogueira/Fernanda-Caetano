import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";
import { PRESET_ESSENCIAL, parseClientModules } from "@/lib/modules-config";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await requireAdminSession();
    await pullAllTablesFromTurso();
    const db = getDb();

    let settings = db
      .prepare("SELECT * FROM site_settings WHERE id = 'main'")
      .get() as Record<string, unknown> | undefined;

    if (settings && !settings.client_enabled_modules_json) {
      const defaultModules = JSON.stringify(PRESET_ESSENCIAL);
      db.prepare(
        "UPDATE site_settings SET client_enabled_modules_json = ? WHERE id = 'main'"
      ).run(defaultModules);
      settings.client_enabled_modules_json = defaultModules;
    }
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
      currentUser: { email: session.email, role: session.role },
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
    const session = await requireAdminSession();
    await pullAllTablesFromTurso(true);
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    const isSuperAdmin =
      session.role === "superadmin" ||
      session.email.toLowerCase() === "luanmnogueira@gmail.com";

    // 0. Atualizar Foto de Perfil recortada (Estilo WhatsApp) em todo o sistema
    const nextAvatar = body.avatar_url || body.avatarUrl;
    if (body.action === "update_avatar" && nextAvatar) {
      db.prepare(
        "UPDATE site_settings SET avatar_url = ?, published_at = ?, updated_at = ? WHERE id = 'main'"
      ).run(nextAvatar, now, now);

      db.prepare(
        "UPDATE admin_profiles SET avatar_url = ?, updated_at = ?"
      ).run(nextAvatar, now);

      // Se existir rascunho ativo, atualiza o avatar nele também
      const row = db
        .prepare("SELECT draft_json FROM site_settings WHERE id = 'main'")
        .get() as { draft_json: string | null } | undefined;
      if (row?.draft_json) {
        try {
          const parsedDraft = JSON.parse(row.draft_json);
          parsedDraft.avatar_url = nextAvatar;
          db.prepare(
            "UPDATE site_settings SET draft_json = ? WHERE id = 'main'"
          ).run(JSON.stringify(parsedDraft));
        } catch {
          // ignore
        }
      }

      await pushAllTablesToTurso();
      return NextResponse.json({
        success: true,
        avatarUrl: nextAvatar,
        avatar_url: nextAvatar,
      });
    }

    // 0.1 Atualizar Módulos Liberados para o Cliente (Exclusivo Desenvolvedor Master / Superadmin)
    if (body.action === "update_client_modules") {
      const validKeys = [
        (process.env.DEVELOPER_MASTER_KEY || "Luan@2026").trim(),
        "Luan@2026",
        "2026",
      ];
      const enteredKey = String(body.developer_key || "").trim();

      if (!isSuperAdmin && !validKeys.includes(enteredKey)) {
        return NextResponse.json(
          {
            error:
              "Acesso negado: Apenas o desenvolvedor master (Luan) pode alterar os módulos liberados para o cliente.",
          },
          { status: 403 }
        );
      }

      const rawModules = body.modules || {};
      const modulesToSave = {
        ...rawModules,
        dashboard: true, // Dashboard é sempre ativo
      };
      const modulesJson = JSON.stringify(modulesToSave);

      // Se desativou a agenda e o whatsapp bot, garante que o booking_mode fique em whatsapp_direct
      if (modulesToSave.agenda === false && modulesToSave.whatsapp === false) {
        db.prepare(
          `UPDATE site_settings
           SET client_enabled_modules_json = ?,
               booking_mode = 'whatsapp_direct',
               updated_at = ?
           WHERE id = 'main'`
        ).run(modulesJson, now);
      } else {
        db.prepare(
          `UPDATE site_settings
           SET client_enabled_modules_json = ?,
               updated_at = ?
           WHERE id = 'main'`
        ).run(modulesJson, now);
      }

      await pushAllTablesToTurso();
      return NextResponse.json({
        success: true,
        modules: modulesToSave,
      });
    }

    // 1. Salvar rascunho de configurações do site
    if (body.action === "save_draft") {
      db.prepare(
        "UPDATE site_settings SET draft_json = ?, updated_at = ? WHERE id = 'main'"
      ).run(JSON.stringify(body.draft), now);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    // 2. Publicar configurações do site
    if (body.action === "publish_settings") {
      const s = body.settings;
      const validKeys = [
        (process.env.DEVELOPER_MASTER_KEY || "Luan@2026").trim(),
        "Luan@2026",
        "2026",
      ];
      const enteredKey = String(body.developer_key || "").trim();

      // Proteção de Plano: se o modo atual for whatsapp_direct e o usuário tentar mudar para online sem a chave do desenvolvedor, mantém bloqueado!
      const currentSettings = db
        .prepare("SELECT booking_mode FROM site_settings WHERE id = 'main'")
        .get() as { booking_mode?: string } | undefined;

      let finalBookingMode = s.booking_mode || "whatsapp_direct";
      if (
        currentSettings?.booking_mode === "whatsapp_direct" &&
        finalBookingMode !== "whatsapp_direct" &&
        !isSuperAdmin &&
        !validKeys.includes(enteredKey)
      ) {
        finalBookingMode = "whatsapp_direct";
      }

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
             whatsapp_direct_phone = ?,
             whatsapp_direct_message_template = ?,
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
        finalBookingMode,
        s.online_booking_enabled ? 1 : 0,
        s.whatsapp_direct_phone || null,
        s.whatsapp_direct_message_template || null,
        Number(s.min_advance_hours) || 1,
        Number(s.max_advance_days) || 60,
        Number(s.slot_interval_minutes) || 30,
        s.booking_success_message,
        s.privacy_policy_text,
        s.about_full_text,
        now,
        now
      );
      if (s.avatar_url) {
        db.prepare(
          "UPDATE admin_profiles SET avatar_url = ?, updated_at = ?"
        ).run(s.avatar_url, now);
      }
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, booking_mode: finalBookingMode });
    }

    // 2.1 Alternar modo de operação (Essencial WhatsApp vs Agenda Online Completa)
    if (body.action === "toggle_booking_mode") {
      const targetMode = body.booking_mode || "whatsapp_direct";
      const validKeys = [
        (process.env.DEVELOPER_MASTER_KEY || "Luan@2026").trim(),
        "Luan@2026",
        "2026",
      ];
      const enteredKey = String(body.developer_key || "").trim();

      // Se tentar ativar a Agenda Online / Robô sem a chave mestra do Luan e não for Superadmin, rejeita!
      if (
        targetMode !== "whatsapp_direct" &&
        !isSuperAdmin &&
        !validKeys.includes(enteredKey)
      ) {
        return NextResponse.json(
          {
            error:
              "Acesso negado: Apenas o desenvolvedor responsável (Luan) pode desbloquear o Modo Avançado (Agenda Online & Robô).",
          },
          { status: 403 }
        );
      }

      const targetPhone = body.whatsapp_direct_phone;
      const targetMsg = body.whatsapp_direct_message_template;
      db.prepare(
        `UPDATE site_settings
         SET booking_mode = ?,
             whatsapp_direct_phone = COALESCE(?, whatsapp_direct_phone),
             whatsapp_direct_message_template = COALESCE(?, whatsapp_direct_message_template),
             updated_at = ?
         WHERE id = 'main'`
      ).run(targetMode, targetPhone || null, targetMsg || null, now);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, booking_mode: targetMode });
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
      await pushAllTablesToTurso();
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
      await pushAllTablesToTurso();
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
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    // 6. Excluir botão
    if (body.action === "delete_link") {
      db.prepare("DELETE FROM custom_links WHERE id = ?").run(body.id);
      await pushAllTablesToTurso();
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
      await pushAllTablesToTurso();
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

