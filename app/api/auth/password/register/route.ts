import { getDb } from "../../../../../db";
import { passwordAccounts, users } from "../../../../../db/schema";
import { createPasswordRecord, emailUserId, normalizeEmail, sameOriginRequest, validEmail } from "../../../../auth-credentials";
import { createSession, safeRelativeReturnPath, SESSION_COOKIE } from "../../../../chatgpt-auth";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!sameOriginRequest(request)) return loginError(url.origin, "No pudimos validar esta solicitud.");
  if (Number(request.headers.get("content-length") || 0) > 20_000) return loginError(url.origin, "La solicitud es demasiado grande.");
  const form = await request.formData();
  const name = String(form.get("name") || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const email = normalizeEmail(String(form.get("email") || ""));
  const password = String(form.get("password") || "");
  const returnTo = safeRelativeReturnPath(String(form.get("returnTo") || "/chat"));
  if (name.length < 2) return loginError(url.origin, "Escribe el nombre con el que quieres que Nora te llame.", returnTo);
  if (!validEmail(email)) return loginError(url.origin, "Escribe un correo válido.", returnTo);
  if (password.length < 10 || password.length > 128) return loginError(url.origin, "La contraseña debe tener entre 10 y 128 caracteres.", returnTo);
  if (form.get("terms") !== "yes") return loginError(url.origin, "Debes aceptar el uso responsable de Nora.", returnTo);
  try {
    const userId = await emailUserId(email);
    const record = await createPasswordRecord(password);
    const now = Date.now();
    const db = getDb();
    await db.batch([
      db.insert(users).values({ id: userId, email, displayName: name, createdAt: now, lastLoginAt: now }),
      db.insert(passwordAccounts).values({ userId, ...record, createdAt: now, updatedAt: now }),
    ]);
    return signedIn(url.origin, returnTo, await createSession({ userId, email, name }));
  } catch (error) {
    console.error(JSON.stringify({ event: "email_register_failed", message: error instanceof Error ? error.message : "unknown" }));
    return loginError(url.origin, "Ya existe una cuenta con ese correo o no pudimos crearla.", returnTo);
  }
}

function signedIn(origin: string, returnTo: string, session: string) {
  const response = new Response(null, { status: 303, headers: { Location: `${origin}${returnTo}` } });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  return response;
}
function loginError(origin: string, message: string, returnTo = "/chat") {
  return new Response(null, { status: 303, headers: { Location: `${origin}/login?mode=register&returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(message)}` } });
}
