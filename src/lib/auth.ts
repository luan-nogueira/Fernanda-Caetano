import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb, verifyPassword } from "./db";

const SESSION_COOKIE_NAME = "fc_admin_session";
const SECRET_KEY =
  process.env.SESSION_SECRET ||
  "fernanda_caetano_super_secret_hmac_key_2026_lgpd";

export interface AdminSessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export function createSessionToken(payload: AdminSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token?: string): AdminSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("base64url");

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "utf8"),
        Buffer.from(expectedSig, "utf8")
      )
    ) {
      return null;
    }
    const decoded = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as AdminSessionPayload;

    if (Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function authenticateAdminCredentials(
  email: string,
  password: string
): AdminSessionPayload | null {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
    .get(email.trim()) as
    | { id: string; email: string; password_hash: string; role: string }
    | undefined;

  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 dias
  };
}

export const SESSION_COOKIE_CONFIG = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
};

// Rate limiter simples em memória para proteger a rota pública de agendamento contra abusos
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests = 15,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

