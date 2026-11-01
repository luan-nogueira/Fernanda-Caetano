import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import { calculateDayAvailability } from "./availability";
import { createBookingTransactional } from "./booking-service";

describe("Motor de Disponibilidade e Prevenção de Conflitos — Fernanda Caetano", () => {
  beforeEach(() => {
    const db = getDb();
    // Limpa agendamentos e bloqueios de datas de teste em 2027
    db.prepare(
      "DELETE FROM appointments WHERE appointment_date LIKE '2027-05-%'"
    ).run();
    db.prepare(
      "DELETE FROM schedule_blocks WHERE block_date LIKE '2027-05-%'"
    ).run();
  });

  it("1. Deve retornar horários disponíveis separados por turno (Manhã e Tarde) em dia útil", () => {
    // 2027-05-10 é uma Segunda-feira
    const avail = calculateDayAvailability({
      procedureId: "proc-laserterapia", // 45 min + 15 min buffer = 60 min ocupados
      unitId: "unit-platinum",
      dateStr: "2027-05-10",
      bypassAdvanceCheck: true,
    });

    expect(avail.isAvailable).toBe(true);
    expect(avail.shifts.morning.length).toBeGreaterThan(0);
    expect(avail.shifts.afternoon.length).toBeGreaterThan(0);
    expect(avail.shifts.morning.some((s) => s.time === "09:00")).toBe(true);
  });

  it("2. Deve impedir dois agendamentos simultâneos e bloquear também a outra unidade (agenda compartilhada da profissional)", () => {
    // Cria agendamento às 09:00 na unidade Platinum
    const created = createBookingTransactional({
      procedureId: "proc-feridas", // 60 min + 15 min buffer -> ocupa 09:00 até 10:15
      unitId: "unit-platinum",
      appointmentDate: "2027-05-11",
      startTime: "09:00",
      clientName: "Paciente Teste Conflito",
      clientPhone: "5522999112233",
      source: "online",
      bypassAdvanceCheck: true,
    });

    expect(created.booking_code).toMatch(/^FC-\d{6}$/);
    expect(created.status).toBe("confirmed");

    // 1) Tentar agendar no mesmo horário na MESMA unidade deve falhar
    expect(() =>
      createBookingTransactional({
        procedureId: "proc-laserterapia",
        unitId: "unit-platinum",
        appointmentDate: "2027-05-11",
        startTime: "09:00",
        clientName: "Segundo Paciente",
        clientPhone: "5522999445566",
        source: "online",
        bypassAdvanceCheck: true,
      })
    ).toThrow(/indisponível|conflita/i);

    // 2) Verificar disponibilidade na OUTRA unidade (Farol de São Thomé) no mesmo horário (09:00 e 09:30):
    // Como a agenda da Dra. Fernanda é única entre unidades, 09:00 e 09:30 devem estar indisponíveis no Farol!
    const availOtherUnit = calculateDayAvailability({
      procedureId: "proc-laserterapia",
      unitId: "unit-farol",
      dateStr: "2027-05-11",
      bypassAdvanceCheck: true,
    });

    const morningTimesFarol = availOtherUnit.shifts.morning.map((s) => s.time);
    expect(morningTimesFarol).not.toContain("09:00");
    expect(morningTimesFarol).not.toContain("09:30");
  });

  it("3. Deve refletir imediatamente bloqueios administrativos de dia inteiro ou faixa de horário", () => {
    const db = getDb();

    // Bloqueia o turno da manhã de 2027-05-12 das 08:30 às 12:30
    db.prepare(
      `INSERT INTO schedule_blocks (id, block_date, unit_id, is_full_day, start_time, end_time, reason, created_at)
       VALUES ('blk-test-1', '2027-05-12', NULL, 0, '08:30', '12:30', 'Congresso de Dermatologia', datetime('now'))`
    ).run();

    const availPartial = calculateDayAvailability({
      procedureId: "proc-botox",
      unitId: "unit-platinum",
      dateStr: "2027-05-12",
      bypassAdvanceCheck: true,
    });

    expect(availPartial.shifts.morning.length).toBe(0);
    expect(availPartial.shifts.afternoon.length).toBeGreaterThan(0);

    // Agora bloqueia o dia inteiro
    db.prepare(
      `INSERT INTO schedule_blocks (id, block_date, unit_id, is_full_day, start_time, end_time, reason, created_at)
       VALUES ('blk-test-2', '2027-05-12', NULL, 1, NULL, NULL, 'Dia inteiro bloqueado', datetime('now'))`
    ).run();

    const availFull = calculateDayAvailability({
      procedureId: "proc-botox",
      unitId: "unit-platinum",
      dateStr: "2027-05-12",
      bypassAdvanceCheck: true,
    });

    expect(availFull.isAvailable).toBe(false);
    expect(availFull.totalSlots).toBe(0);
  });

  it("4. Atendimento domiciliar (Home Care) deve nascer com status 'pending' aguardando aprovação da profissional", () => {
    const homeCareAppt = createBookingTransactional({
      procedureId: "proc-homecare",
      unitId: "unit-homecare",
      appointmentDate: "2027-05-13",
      startTime: "14:00",
      clientName: "Paciente Home Care",
      clientPhone: "5522988776655",
      homeCareAddress: "Av. Pelinca, 100 - Campos/RJ",
      source: "online",
      bypassAdvanceCheck: true,
    });

    expect(homeCareAppt.status).toBe("pending");
  });
});

