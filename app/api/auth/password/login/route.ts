import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { passwordAccounts, users } from "../../../../../db/schema";
import { createPasswordRecord, emailUserId, normalizeEmail, sameOriginRequest, verifyPassword } from "../../../../auth-credentials";
import { createSession, safeRelativeReturnPath, SESSION_COOKIE } from "../../../../chatgpt-auth";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!sameOriginRequest(request)) return loginError(url.origin, "No pudimos validar esta solicitud.");
  if (Number(request.headers.get("content-length") || 0) > 20_000) return loginError(url.origin, "La solicitud es demasiado grande.");
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") || ""));
  const password = String(form.get("password") || "");
  const returnTo = safeRelativeReturnPath(String(form.get("returnTo") || "/chat"));
  try {
    const userId = await emailUserId(email);
    const db = getDb();
    const [account] = await db.select().from(passwordAccounts).where(eq(passwordAccounts.userId, userId)).limit(1);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const valid = account && user ? await verifyPassword(password, account.salt, account.iterations, account.passwordHash) : (await createPasswordRecord(password), false);
    if (!valid || !user) return loginError(url.origin, "El correo o la contraseña no coinciden.", returnTo);
    await db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, userId));
    const session = await createSession({ userId, email: user.email, name: user.displayName });
    const response = new Response(null, { status: 303, headers: { Location: `${url.origin}${returnTo}` } });
    response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    return response;
  } catch (error) {
    console.error(JSON.stringify({ event: "email_login_failed", message: error instanceof Error ? error.message : "unknown" }));
    return loginError(url.origin, "No pudimos iniciar sesión en este momento.", returnTo);
  }
}
function loginError(origin: string, message: string, returnTo = "/chat") {
  return new Response(null, { status: 303, headers: { Location: `${origin}/login?mode=email&returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(message)}` } });
}
