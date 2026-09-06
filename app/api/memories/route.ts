import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { memories } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const CATEGORIES = ["personal", "support", "goal", "boundary"];

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const rows = await getDb().select().from(memories).where(eq(memories.userId, user.userId)).orderBy(desc(memories.updatedAt)).limit(30);
  return Response.json({ memories: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const body = await request.json() as { content?: string; category?: string };
  const content = body.content?.trim().replace(/\s+/g, " ").slice(0, 240);
  const category = CATEGORIES.includes(body.category ?? "") ? body.category! : "personal";
  if (!content || content.length < 3) return Response.json({ error: "Escribe un recuerdo un poco más claro." }, { status: 400 });
  const existing = await getDb().select({ id: memories.id }).from(memories).where(eq(memories.userId, user.userId)).limit(30);
  if (existing.length >= 30) return Response.json({ error: "Puedes guardar hasta 30 recuerdos. Borra uno para añadir otro." }, { status: 409 });
  const now = Date.now(), memory = { id: crypto.randomUUID(), userId: user.userId, content, category, sourceMessageId: null, createdAt: now, updatedAt: now };
  await getDb().insert(memories).values(memory);
  return Response.json({ memory }, { status: 201 });
}
