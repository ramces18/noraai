import { OAUTH_STATE_COOKIE, safeRelativeReturnPath } from "../../../chatgpt-auth";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: "Google todavía no está configurado." }, { status: 503 });
  const requestUrl = new URL(request.url);
  const returnTo = safeRelativeReturnPath(requestUrl.searchParams.get("returnTo"));
  const encodedReturn = btoa(returnTo).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const state = `${crypto.randomUUID()}.${encodedReturn}`;
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", `${requestUrl.origin}/api/auth/callback/google`);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("prompt", "select_account");
  const response = Response.redirect(authorization, 302);
  response.headers.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  return response;
}
