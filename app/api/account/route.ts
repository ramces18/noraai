import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { albumMoments, companions, conversations, memories, messages, users, wellbeingEntries } from "../../../db/schema";
import { getChatGPTUser, SESSION_COOKIE } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const db = getDb();
  const [profileRows, conversationRows, messageRows, memoryRows, companionRows, wellbeingRows, momentRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, user.userId)).limit(1),
    db.select().from(conversations).where(eq(conversations.userId, user.userId)),
    db.select({ id: messages.id, conversationId: messages.conversationId, role: messages.role, content: messages.content, important: messages.important, createdAt: messages.createdAt }).from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id)).where(eq(conversations.userId, user.userId)),
    db.select().from(memories).where(eq(memories.userId, user.userId)),
    db.select().from(companions).where(eq(companions.userId, user.userId)).limit(1),
    db.select().from(wellbeingEntries).where(eq(wellbeingEntries.userId, user.userId)),
    db.select().from(albumMoments).where(eq(albumMoments.userId, user.userId)),
  ]);
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), profile: profileRows[0] ?? null, companion: companionRows[0] ?? null, wellbeingEntries: wellbeingRows, albumMoments: momentRows, conversations: conversationRows, messages: messageRows, memories: memoryRows }, null, 2);
  return new Response(payload, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nora-datos-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  await getDb().delete(users).where(eq(users.id, user.userId));
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
