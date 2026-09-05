import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { conversations, messages } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const user=await getChatGPTUser();if(!user)return Response.json({error:"Debes iniciar sesión."},{status:401});const {id}=await params;const body=await request.json() as {important?:boolean};if(typeof body.important!=="boolean")return Response.json({error:"Valor inválido."},{status:400});const [row]=await getDb().select({id:messages.id}).from(messages).innerJoin(conversations,eq(messages.conversationId,conversations.id)).where(and(eq(messages.id,id),eq(conversations.userId,user.userId))).limit(1);if(!row)return Response.json({error:"Mensaje no encontrado."},{status:404});await getDb().update(messages).set({important:body.important}).where(eq(messages.id,id));return Response.json({ok:true})}
