import { safeRelativeReturnPath, SESSION_COOKIE } from "../../../chatgpt-auth";
export async function GET(request: Request) {
  const url = new URL(request.url), returnTo = safeRelativeReturnPath(url.searchParams.get("returnTo") || "/");
  const response = Response.redirect(`${url.origin}${returnTo}`, 302);
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
