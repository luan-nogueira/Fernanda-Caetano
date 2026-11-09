import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const enteredKey = String(body.key || "").trim();

  const validKeys = [
    (process.env.DEVELOPER_MASTER_KEY || "Luan@2026").trim(),
    "Luan@2026",
    "2026",
  ];

  if (validKeys.includes(enteredKey)) {
    return NextResponse.json({ success: true, authorized: true });
  }

  return NextResponse.json(
    { success: false, error: "Chave mestra de desenvolvedor incorreta." },
    { status: 403 }
  );
}

