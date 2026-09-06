import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import CompanionApp from "./CompanionApp";
import "./companion.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi compañero — Nora", description: "Un espacio de autocuidado sin rachas, culpa ni perfección." };

export default async function CompanionPage() {
  const user = await requireChatGPTUser("/companion");
  return <CompanionApp user={{ name: user.displayName, email: user.email }}/>;
}
