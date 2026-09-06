import type { Metadata } from "next";
import { headers } from "next/headers";
import { readCookie, requireChatGPTUser } from "../chatgpt-auth";
import CompanionApp from "./CompanionApp";
import "./companion.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi compañero — Nora", description: "Un espacio de autocuidado sin rachas, culpa ni perfección." };

export default async function CompanionPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireChatGPTUser("/companion");
  const params = await searchParams;
  const requestHeaders = await headers();
  const cookieWelcome = readCookie(requestHeaders.get("cookie"), "nora_google_welcome") === "1";
  return <CompanionApp user={{ name: user.displayName, email: user.email }} googleWelcome={params.welcome === "google" || cookieWelcome}/>;
}
