import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:"Debes iniciar sesión."},{status:401});const [profile]=await getDb().select().from(users).where(eq(users.id,user.userId)).limit(1);return Response.json({profile:profile??{id:user.userId,email:user.email,displayName:user.displayName,theme:"light",tone:"warm"}})}
export async function PATCH(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"Debes iniciar sesión."},{status:401});const body=await request.json() as {theme?:string;tone?:string};const theme=["light","dark","system"].includes(body.theme??"")?body.theme:undefined;const tone=["warm","serious","gentle"].includes(body.tone??"")?body.tone:undefined;if(!theme&&!tone)return Response.json({error:"Preferencia inválida."},{status:400});await getDb().update(users).set({...theme&&{theme},...tone&&{tone}}).where(eq(users.id,user.userId));return Response.json({ok:true})}
