import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createBookingTransactional } from "@/lib/booking-service";
import {
  calculateDayAvailability,
  classifyShift,
  minutesToTime,
  timeToMinutes,
} from "@/lib/availability";
import { Appointment, Procedure, Unit } from "@/types/domain";
import { dispatchWhatsAppBookingNotifications } from "@/lib/whatsapp-bot";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso();
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date");
    const month = searchParams.get("month"); // YYYY-MM
    const status = searchParams.get("status");
    const unitId = searchParams.get("unitId");
    const procedureId = searchParams.get("procedureId");
    const search = searchParams.get("search");

    let sql = `SELECT * FROM appointments WHERE 1=1`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (date) {
      sql += ` AND appointment_date = ?`;
      params.push(date);
    } else if (month) {
      sql += ` AND appointment_date LIKE ?`;
      params.push(`${month}%`);
    }

    if (status && status !== "all") {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (unitId && unitId !== "all") {
      sql += ` AND unit_id = ?`;
      params.push(unitId);
    }

    if (procedureId && procedureId !== "all") {
      sql += ` AND procedure_id = ?`;
      params.push(procedureId);
    }

    if (search && search.trim()) {
      sql += ` AND (LOWER(client_name_snapshot) LIKE LOWER(?) OR client_phone_snapshot LIKE ? OR LOWER(booking_code) LIKE LOWER(?))`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY appointment_date ASC, start_time ASC`;

    const appointments = db.prepare(sql).all(...params) as Appointment[];
    const blocks = db
      .prepare("SELECT * FROM schedule_blocks ORDER BY block_date ASC")
      .all();

    return NextResponse.json({ appointments, blocks });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao consultar agendamentos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso(true);
    const body = await req.json();

    const created = createBookingTransactional({
      procedureId: body.procedureId,
      unitId: body.unitId,
      appointmentDate: body.appointmentDate,
      startTime: body.startTime,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      clientEmail: body.clientEmail || undefined,
      clientNotes: body.clientNotes || undefined,
      homeCareAddress: body.homeCareAddress || undefined,
      source: "admin_manual",
      forceStatus: body.status || "confirmed",
      bypassAdvanceCheck: true,
    });

    await pushAllTablesToTurso();
    return NextResponse.json({ success: true, appointment: created });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Erro ao criar agendamento manual.",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso(true);
    const db = getDb();
    const body = await req.json();
    const {
      id,
      status,
      appointmentDate,
      startTime,
      procedureId,
      unitId,
      adminNotes,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do agendamento é obrigatório." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .get(id) as Appointment | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const nextDate = appointmentDate || existing.appointment_date;
    const nextStartTime = startTime || existing.start_time;
    const nextProcId = procedureId || existing.procedure_id;
    const nextUnitId = unitId || existing.unit_id;
    const nextStatus = status || existing.status;

    const isReschedulingOrChangingService =
      nextDate !== existing.appointment_date ||
      nextStartTime !== existing.start_time ||
      nextProcId !== existing.procedure_id ||
      nextUnitId !== existing.unit_id;

    let procSnapshot = existing.procedure_name_snapshot;
    let unitSnapshot = existing.unit_name_snapshot;
    let duration = existing.duration_minutes;
    let bufferAfter = existing.buffer_after_minutes;
    let endTime = existing.end_time;
    let occupiedUntil = existing.occupied_until_time;
    let shift = existing.shift;

    if (
      isReschedulingOrChangingService &&
      nextStatus !== "cancelled" &&
      nextStatus !== "no_show"
    ) {
      const proc = db
        .prepare("SELECT * FROM procedures WHERE id = ?")
        .get(nextProcId) as Procedure | undefined;
      const unit = db
        .prepare("SELECT * FROM units WHERE id = ?")
        .get(nextUnitId) as Unit | undefined;

      if (!proc || !unit) {
        return NextResponse.json(
          { error: "Procedimento ou unidade inválidos." },
          { status: 400 }
        );
      }

      // Revalidar disponibilidade ignorando o próprio agendamento sendo editado
      const avail = calculateDayAvailability({
        procedureId: nextProcId,
        unitId: nextUnitId,
        dateStr: nextDate,
        ignoreAppointmentId: existing.id,
        bypassAdvanceCheck: true,
      });

      const allSlots = [
        ...avail.shifts.morning,
        ...avail.shifts.afternoon,
        ...avail.shifts.evening,
      ];

      const validSlot = allSlots.find((s) => s.time === nextStartTime);
      if (!validSlot) {
        return NextResponse.json(
          {
            error: `O novo horário (${nextStartTime} em ${nextDate}) conflita com outro compromisso ou está fora do expediente.`,
          },
          { status: 409 }
        );
      }

      procSnapshot = proc.name;
      unitSnapshot = unit.short_name || unit.name;
      duration = Number(proc.duration_minutes) || 60;
      bufferAfter = Number(proc.buffer_after_minutes) || 15;
      const startMins = timeToMinutes(nextStartTime);
      endTime = minutesToTime(startMins + duration);
      occupiedUntil = minutesToTime(startMins + duration + bufferAfter);
      shift = classifyShift(nextStartTime);
    }

    db.prepare(
      `UPDATE appointments
       SET procedure_id = ?,
           unit_id = ?,
           procedure_name_snapshot = ?,
           unit_name_snapshot = ?,
           duration_minutes = ?,
           buffer_after_minutes = ?,
           appointment_date = ?,
           shift = ?,
           start_time = ?,
           end_time = ?,
           occupied_until_time = ?,
           status = ?,
           admin_notes = COALESCE(?, admin_notes),
           updated_at = ?
       WHERE id = ?`
    ).run(
      nextProcId,
      nextUnitId,
      procSnapshot,
      unitSnapshot,
      duration,
      bufferAfter,
      nextDate,
      shift,
      nextStartTime,
      endTime,
      occupiedUntil,
      nextStatus,
      adminNotes !== undefined ? adminNotes : null,
      now,
      id
    );

    const updated = db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .get(id) as Appointment;

    // Se uma solicitação pendente acabou de ser confirmada, dispara confirmação no WhatsApp Bot
    if (existing.status === "pending" && nextStatus === "confirmed") {
      try {
        dispatchWhatsAppBookingNotifications(updated, "booking_confirmed");
      } catch {
        // non-blocking
      }
    }

    await pushAllTablesToTurso();
    return NextResponse.json({ success: true, appointment: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso(true);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const clearDemo = searchParams.get("clearDemo") === "1";
    const id = searchParams.get("id");

    if (clearDemo) {
      db.prepare("DELETE FROM whatsapp_message_logs WHERE appointment_id LIKE 'appt-demo-%'").run();
      db.prepare("DELETE FROM appointments WHERE id LIKE 'appt-demo-%'").run();
      db.prepare("DELETE FROM clients WHERE id LIKE 'client-demo-%' AND id NOT IN (SELECT DISTINCT client_id FROM appointments WHERE client_id IS NOT NULL)").run();
      db.prepare("DELETE FROM notifications WHERE id LIKE 'notif-demo-%' OR related_appointment_id LIKE 'appt-demo-%'").run();
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, clearedDemo: true });
    }

    if (id) {
      db.prepare("DELETE FROM whatsapp_message_logs WHERE appointment_id = ?").run(id);
      db.prepare("DELETE FROM notifications WHERE related_appointment_id = ?").run(id);
      db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, deletedId: id });
    }

    return NextResponse.json(
      { error: "Informe id ou clearDemo=1." },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao remover agendamento." },
      { status: 500 }
    );
  }
}

