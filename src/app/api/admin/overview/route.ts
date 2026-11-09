import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb, hashPassword } from "@/lib/db";
import { getSaoPauloNow } from "@/lib/availability";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";

export async function GET() {
  try {
    const session = await requireAdminSession();
    await pullAllTablesFromTurso();
    const db = getDb();
    const { todayStr } = getSaoPauloNow();

    const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

    const todayCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM appointments WHERE appointment_date = ? AND status IN ('confirmed', 'pending', 'completed')"
        )
        .get(todayStr) as { c: number }
    ).c;

    const monthCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM appointments WHERE appointment_date LIKE ? AND status IN ('confirmed', 'pending', 'completed')"
        )
        .get(`${currentMonthPrefix}%`) as { c: number }
    ).c;

    const pendingCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM appointments WHERE status = 'pending'"
        )
        .get() as { c: number }
    ).c;

    const cancelledCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM appointments WHERE status IN ('cancelled', 'no_show')"
        )
        .get() as { c: number }
    ).c;

    const activeProceduresCount = (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM procedures WHERE is_active = 1 AND is_archived = 0"
        )
        .get() as { c: number }
    ).c;

    const totalClientsCount = (
      db.prepare("SELECT COUNT(*) as c FROM clients").get() as { c: number }
    ).c;

    const upcomingAppointments = db
      .prepare(
        `SELECT * FROM appointments
         WHERE appointment_date >= ? AND status IN ('confirmed', 'pending')
         ORDER BY appointment_date ASC, start_time ASC
         LIMIT 12`
      )
      .all(todayStr);

    const notifications = db
      .prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30")
      .all();

    const adminProfile = db
      .prepare(
        `SELECT p.*, u.email
         FROM admin_profiles p
         JOIN users u ON u.id = p.user_id
         LIMIT 1`
      )
      .get();

    const whatsappBot = db
      .prepare("SELECT status, connected_phone, connected_name FROM whatsapp_bot_config WHERE id = 'main'")
      .get();

    return NextResponse.json({
      currentUser: { email: session.email, role: session.role },
      kpis: {
        todayCount,
        monthCount,
        pendingCount,
        cancelledCount,
        activeProceduresCount,
        totalClientsCount,
      },
      upcomingAppointments,
      notifications,
      adminProfile,
      whatsappBot,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar dashboard." },
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

    if (body.action === "mark_notifications_read") {
      db.prepare("UPDATE notifications SET is_read = 1").run();
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    if (body.action === "update_profile") {
      db.prepare(
        `UPDATE admin_profiles
         SET full_name = ?,
             professional_title = ?,
             registration_number = ?,
             whatsapp_phone = ?,
             receive_whatsapp_alerts = ?,
             updated_at = ?
         WHERE user_id = ?`
      ).run(
        body.full_name,
        body.professional_title,
        body.registration_number || "",
        (body.whatsapp_phone || "").replace(/\D/g, ""),
        body.receive_whatsapp_alerts ? 1 : 0,
        now,
        session.userId
      );

      if (body.new_password && body.new_password.length >= 6) {
        db.prepare(
          "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
        ).run(hashPassword(body.new_password), now, session.userId);
      }

      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro na operação administrativa." },
      { status: 500 }
    );
  }
}

