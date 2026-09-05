import { getChatGPTUser } from "../chatgpt-auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  if (await getChatGPTUser()) redirect(params.returnTo || "/chat");
  const destination = params.returnTo?.startsWith("/") ? params.returnTo : "/chat";
  return <main className="login-page">
    <a className="login-home" href="/"><span className="logo-mark small">n</span><span>nora</span></a>
    <div className="login-glow glow-one"/><div className="login-glow glow-two"/>
    <section className="login-story"><div className="login-eyebrow">TU ESPACIO · TU RITMO</div><h1>Volvamos a ese lugar donde puedes ser tú.</h1><p>Nora guarda el hilo de tus conversaciones para que no tengas que empezar desde cero cada vez que necesites hablar.</p><div className="login-whisper"><span>♡</span><p>“No tienes que tener las palabras correctas. Puedes comenzar simplemente diciendo cómo estuvo tu día.”</p></div></section>
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-nora"><span className="logo-mark large">n</span><i/><i/><i/></div>
      <div><small>BIENVENIDO A NORA</small><h2 id="login-title">Entra a tu espacio</h2><p>Tu historial y tus preferencias estarán disponibles de forma privada.</p></div>
      {params.error && <div className="login-error" role="alert">{params.error}</div>}
      <a className="google-button" href={`/api/auth/google?returnTo=${encodeURIComponent(destination)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.55c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.63A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.32-1.86V7.51H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.49l3.34-2.63Z"/><path fill="#EA4335" d="M12 6.02c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.34 2.63c.79-2.36 3-4.12 5.6-4.12Z"/></svg>Continuar con Google</a>
      <div className="login-protection"><span>⌁</span><p><b>Acceso protegido</b>Nora solo recibe tu nombre y correo para identificar tu cuenta. Nunca publicamos en Google.</p></div>
      <p className="login-terms">Al continuar aceptas usar Nora como herramienta de acompañamiento emocional, no como sustituto de atención profesional.</p>
    </section>
    <a className="login-back" href="/">← Volver al inicio</a>
  </main>;
}
