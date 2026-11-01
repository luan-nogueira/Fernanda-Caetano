import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdminCredentials,
  createSessionToken,
  getAdminSession,
  SESSION_COOKIE_CONFIG,
} from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: { email: session.email, role: session.role },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password } = body;

    if (action === "logout") {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_CONFIG.name);
      return NextResponse.json({ success: true });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe o e-mail e a senha administrativa." },
        { status: 400 }
      );
    }

    const sessionPayload = authenticateAdminCredentials(email, password);
    if (!sessionPayload) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique o e-mail e a senha." },
        { status: 401 }
      );
    }

    const token = createSessionToken(sessionPayload);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_CONFIG.name, token, {
      httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
      path: SESSION_COOKIE_CONFIG.path,
      sameSite: SESSION_COOKIE_CONFIG.sameSite,
      maxAge: SESSION_COOKIE_CONFIG.maxAge,
    });

    return NextResponse.json({
      success: true,
      user: { email: sessionPayload.email, role: sessionPayload.role },
    });
  } catch (err) {
    console.error("Erro no login admin:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar autenticação." },
      { status: 500 }
    );
  }
}

