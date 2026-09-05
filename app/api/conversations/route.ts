import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { conversations, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

async function authenticatedUser() { const user = await getChatGPTUser(); if (!user) return null; const now = Date.now(); await getDb().insert(users).values({ id:user.userId, email:user.email, displayName:user.displayName, createdAt:now, lastLoginAt:now }).onConflictDoUpdate({ target:users.id, set:{ email:user.email, displayName:user.displayName, lastLoginAt:now } }); return user; }
export async function GET() { const user=await authenticatedUser(); if(!user) return Response.json({error:"Debes iniciar sesión."},{status:401}); const rows=await getDb().select().from(conversations).where(eq(conversations.userId,user.userId)).orderBy(desc(conversations.updatedAt)).limit(100); return Response.json({conversations:rows}); }
export async function POST() { const user=await authenticatedUser(); if(!user) return Response.json({error:"Debes iniciar sesión."},{status:401}); const now=Date.now(); const conversation={id:crypto.randomUUID(),userId:user.userId,title:"Nueva conversación",createdAt:now,updatedAt:now}; await getDb().insert(conversations).values(conversation); return Response.json({conversation},{status:201}); }
