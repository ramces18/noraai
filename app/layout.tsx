import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export async function generateMetadata():Promise<Metadata>{const h=await headers();const host=h.get("host")??"localhost:3000";const protocol=host.startsWith("localhost")?"http":"https";const image=`${protocol}://${host}/og.png`;return{title:"Nora — Un espacio seguro para hablar",description:"Acompañamiento emocional con inteligencia artificial. Un proyecto de Gerard Ramces Bollard Gonzalez por el Mes de la Prevención del Suicidio.",openGraph:{title:"Nora — Un espacio seguro para hablar",description:"Una compañía digital empática para cuando necesitas hablar.",images:[image]},twitter:{card:"summary_large_image",title:"Nora — Un espacio seguro para hablar",description:"Una compañía digital empática para cuando necesitas hablar.",images:[image]}}}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>}
