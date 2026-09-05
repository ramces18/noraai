import { safeRelativeReturnPath, SESSION_COOKIE } from "../../../chatgpt-auth";
export async function GET(request: Request) {
  const url = new URL(request.url), returnTo = safeRelativeReturnPath(url.searchParams.get("returnTo") || "/");
  const response = new Response(null, { status: 302, headers: { Location: `${url.origin}${returnTo}` } });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
