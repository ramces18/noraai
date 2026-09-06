import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };
type SessionPayload = { uid?: string; sub?: string; email: string; name: string; exp: number };
export const SESSION_COOKIE = "nora_session";
export const OAUTH_STATE_COOKIE = "nora_oauth_state";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const token = readCookie(requestHeaders.get("cookie"), SESSION_COOKIE);
  const session = token ? await verifySession(token) : null;
  if (!session) return null;
  const userId = session.uid || (session.sub ? `google:${session.sub}` : null);
  if (!userId) return null;
  return { userId, displayName: session.name || session.email.split("@")[0], email: session.email, fullName: session.name || null };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string { return `/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`; }
export function chatGPTSignOutPath(returnTo = "/"): string { return `/api/auth/logout?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`; }

export async function createSession(payload: { userId: string; email: string; name: string }): Promise<string> {
  const session: SessionPayload = { uid: payload.userId, email: payload.email, name: payload.name, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 };
  const encoded = base64UrlEncode(JSON.stringify(session));
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  if (!constantTimeEqual(signature, await sign(encoded))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    return (payload.uid || payload.sub) && payload.email && payload.exp > Date.now() / 1000 ? payload : null;
  } catch { return null; }
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export function safeRelativeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/chat";
  try { const url = new URL(value, "https://nora.local"); return url.origin === "https://nora.local" ? `${url.pathname}${url.search}${url.hash}` : "/chat"; }
  catch { return "/chat"; }
}

function authSecret(): string { const secret = process.env.AUTH_SECRET; if (!secret) throw new Error("AUTH_SECRET no está configurado"); return secret; }
async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(authSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}
function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a), right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let difference = 0; for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i]; return difference === 0;
}
function base64UrlEncode(value: string): string { return bytesToBase64Url(new TextEncoder().encode(value)); }
function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/"), padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0)));
}
function bytesToBase64Url(bytes: Uint8Array): string { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
