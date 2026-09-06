import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { memories } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const CATEGORIES = ["personal", "support", "goal", "boundary"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await params, body = await request.json() as { content?: string; category?: string };
  const content = body.content?.trim().replace(/\s+/g, " ").slice(0, 240);
  const category = CATEGORIES.includes(body.category ?? "") ? body.category : undefined;
  if (!content && !category) return Response.json({ error: "Cambio inválido." }, { status: 400 });
  const result = await getDb().update(memories).set({ ...(content ? { content } : {}), ...(category ? { category } : {}), updatedAt: Date.now() }).where(and(eq(memories.id, id), eq(memories.userId, user.userId)));
  return result.meta.changes ? Response.json({ ok: true }) : Response.json({ error: "Recuerdo no encontrado." }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await params;
  const result = await getDb().delete(memories).where(and(eq(memories.id, id), eq(memories.userId, user.userId)));
  return result.meta.changes ? Response.json({ ok: true }) : Response.json({ error: "Recuerdo no encontrado." }, { status: 404 });
}
