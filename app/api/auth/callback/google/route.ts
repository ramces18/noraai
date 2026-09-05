import { createSession, OAUTH_STATE_COOKIE, readCookie, safeRelativeReturnPath, SESSION_COOKIE } from "../../../../chatgpt-auth";
type GoogleProfile = { sub?: string; email?: string; email_verified?: boolean; name?: string };

export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get("code"), state = url.searchParams.get("state");
  const storedState = readCookie(request.headers.get("cookie"), OAUTH_STATE_COOKIE);
  if (!code || !state || !storedState || state !== storedState) return loginError(url.origin, "La solicitud de acceso expiró. Inténtalo nuevamente.");
  const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(url.origin, "Google todavía no está configurado.");
  try {
    const redirectUri = `${url.origin}/api/auth/callback/google`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    if (!tokenResponse.ok) { console.error(JSON.stringify({ event: "google_token_failed", status: tokenResponse.status })); return loginError(url.origin, "Google no pudo completar el acceso. Revisa la configuración."); }
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) return loginError(url.origin, "Google no devolvió una sesión válida.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!profileResponse.ok) return loginError(url.origin, "No pudimos leer tu perfil de Google.");
    const profile = await profileResponse.json() as GoogleProfile;
    if (!profile.sub || !profile.email || profile.email_verified === false) return loginError(url.origin, "Tu correo de Google no pudo verificarse.");
    const session = await createSession({ sub: profile.sub, email: profile.email, name: profile.name || profile.email.split("@")[0] });
    const encodedReturn = state.split(".")[1];
    let decodedReturn = "/chat";
    try { if (encodedReturn) decodedReturn = atob(encodedReturn.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - encodedReturn.length % 4) % 4)); } catch {}
    const response = new Response(null, { status: 302, headers: { Location: `${url.origin}${safeRelativeReturnPath(decodedReturn)}` } });
    response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(session)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    response.headers.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return response;
  } catch (error) {
    console.error(JSON.stringify({ event: "google_auth_error", message: error instanceof Error ? error.message : "unknown" }));
    return loginError(url.origin, "No pudimos iniciar sesión en este momento.");
  }
}
function loginError(origin: string, message: string) { return new Response(null, { status: 302, headers: { Location: `${origin}/login?error=${encodeURIComponent(message)}` } }); }
