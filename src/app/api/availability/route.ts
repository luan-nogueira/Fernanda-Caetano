import { NextRequest, NextResponse } from "next/server";
import {
  calculateDayAvailability,
  calculateMonthAvailabilityMap,
} from "@/lib/availability";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const procedureId = searchParams.get("procedureId");
    const unitId = searchParams.get("unitId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    if (!procedureId || !unitId) {
      return NextResponse.json(
        { error: "procedureId e unitId são obrigatórios." },
        { status: 400 }
      );
    }

    if (dateStr) {
      const dayAvail = calculateDayAvailability({
        procedureId,
        unitId,
        dateStr,
      });
      return NextResponse.json(dayAvail);
    }

    const now = new Date();
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;

    const monthMap = calculateMonthAvailabilityMap({
      procedureId,
      unitId,
      year,
      month,
    });

    return NextResponse.json({
      year,
      month,
      days: monthMap,
    });
  } catch (err) {
    console.error("Erro na rota de disponibilidade:", err);
    return NextResponse.json(
      { error: "Falha ao calcular disponibilidade." },
      { status: 500 }
    );
  }
}

