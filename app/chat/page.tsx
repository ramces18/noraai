import { requireChatGPTUser } from "../chatgpt-auth";
import ChatApp from "./ChatApp";
export const dynamic="force-dynamic";
export default async function ChatPage(){const user=await requireChatGPTUser("/chat");return <ChatApp user={{name:user.displayName,email:user.email}}/>}
