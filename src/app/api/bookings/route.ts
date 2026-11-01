import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingTransactional } from "@/lib/booking-service";
import { checkRateLimit } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";

const bookingSchema = z.object({
  procedureId: z.string().min(1, "Selecione o procedimento."),
  unitId: z.string().min(1, "Selecione a unidade de atendimento."),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione uma data válida."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Selecione um horário válido."),
  clientName: z
    .string()
    .min(3, "Informe seu nome completo (mínimo 3 caracteres).")
    .max(120),
  clientPhone: z
    .string()
    .min(10, "Informe seu WhatsApp com DDD válido.")
    .max(25),
  clientEmail: z
    .string()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("")),
  clientNotes: z.string().max(400).optional().or(z.literal("")),
  homeCareAddress: z.string().max(300).optional().or(z.literal("")),
  lgpdAccepted: z.boolean().refine((v) => v === true, {
    message: "É necessário concordar com os termos de privacidade para agendar.",
  }),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`booking:${ip}`, 12, 60_000)) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas realizadas em sequência. Aguarde um minuto e tente novamente.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      const firstErr =
        parsed.error.issues[0]?.message || "Dados de agendamento inválidos.";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }

    await pullAllTablesFromTurso(true);

    const created = createBookingTransactional({
      procedureId: parsed.data.procedureId,
      unitId: parsed.data.unitId,
      appointmentDate: parsed.data.appointmentDate,
      startTime: parsed.data.startTime,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail || undefined,
      clientNotes: parsed.data.clientNotes || undefined,
      homeCareAddress: parsed.data.homeCareAddress || undefined,
      source: "online",
    });

    await pushAllTablesToTurso();

    const db = getDb();
    const unit = db
      .prepare("SELECT whatsapp_phone, name, short_name FROM units WHERE id = ?")
      .get(created.unit_id) as
      | { whatsapp_phone: string; name: string; short_name: string }
      | undefined;

    // Retorna somente os dados do protocolo recém-criado para a tela de sucesso do cliente
    return NextResponse.json({
      success: true,
      booking: {
        bookingCode: created.booking_code,
        status: created.status,
        procedureName: created.procedure_name_snapshot,
        unitName: created.unit_name_snapshot,
        unitWhatsapp: unit?.whatsapp_phone || "5522999990001",
        appointmentDate: created.appointment_date,
        startTime: created.start_time,
        endTime: created.end_time,
        durationMinutes: created.duration_minutes,
        clientName: created.client_name_snapshot,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível concluir o agendamento.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

