import { getChatGPTUser, safeRelativeReturnPath } from "../chatgpt-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type LoginParams = { returnTo?: string; error?: string; mode?: string };

export default async function Login({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const params = await searchParams;
  const destination = safeRelativeReturnPath(params.returnTo);
  if (await getChatGPTUser()) redirect(destination);
  const registerOpen = params.mode === "register";
  return <main className="login-page">
    <Link className="login-home" href="/"><span className="logo-mark small">n</span><span>nora</span></Link>
    <div className="login-glow glow-one"/><div className="login-glow glow-two"/>
    <section className="login-story">
      <div className="login-eyebrow">TU ESPACIO · TU RITMO</div>
      <h1>Volvamos a ese lugar donde puedes ser tú.</h1>
      <p>Nora guarda el hilo de tus conversaciones y los recuerdos que tú elijas, para que no tengas que comenzar desde cero.</p>
      <div className="login-whisper"><span>♡</span><p>“La curiosa paradoja es que cuando me acepto tal como soy, entonces puedo cambiar.”<small>— Carl Rogers</small></p></div>
    </section>
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-nora"><span className="logo-mark large">n</span><i/><i/><i/></div>
      <div><small>BIENVENIDO A NORA</small><h2 id="login-title">Entra a tu espacio</h2><p>Elige la forma que te resulte más cómoda.</p></div>
      {params.error && <div className="login-error" role="alert">{params.error}</div>}
      <a className="google-button" href={`/api/auth/google?returnTo=${encodeURIComponent(destination)}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.55c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.63A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.32-1.86V7.51H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.49l3.34-2.63Z"/><path fill="#EA4335" d="M12 6.02c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.34 2.63c.79-2.36 3-4.12 5.6-4.12Z"/></svg>
        Continuar con Google
      </a>
      <div className="login-divider"><span>o usa tu correo</span></div>
      <form className="email-form" action="/api/auth/password/login" method="post">
        <input type="hidden" name="returnTo" value={destination}/>
        <label>Correo electrónico<input type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="tu@correo.com"/></label>
        <label>Contraseña<input type="password" name="password" autoComplete="current-password" required minLength={10} maxLength={128} placeholder="Tu contraseña"/></label>
        <button type="submit">Entrar con correo <span>→</span></button>
      </form>
      <details className="register-panel" open={registerOpen}>
        <summary>¿No tienes cuenta? Crear una</summary>
        <form className="email-form" action="/api/auth/password/register" method="post">
          <input type="hidden" name="returnTo" value={destination}/>
          <label>Cómo quieres que te llamemos<input name="name" autoComplete="name" required minLength={2} maxLength={60} placeholder="Tu nombre"/></label>
          <label>Correo electrónico<input type="email" name="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="tu@correo.com"/></label>
          <label>Contraseña<input type="password" name="password" autoComplete="new-password" required minLength={10} maxLength={128} placeholder="Mínimo 10 caracteres"/></label>
          <label className="terms-check"><input type="checkbox" name="terms" value="yes" required/><span>Entiendo que Nora ofrece acompañamiento y no sustituye atención profesional o de emergencia.</span></label>
          <button type="submit">Crear mi espacio <span>→</span></button>
        </form>
      </details>
      <div className="login-protection"><span>⌁</span><p><b>Acceso protegido</b>Usamos tus datos únicamente para identificar tu espacio. Tus mensajes se envían al proveedor de IA solo para generar la respuesta.</p></div>
      <p className="login-terms">Google es la opción recomendada. El acceso con correo todavía no ofrece recuperación de contraseña; guarda tu contraseña de forma segura.</p>
    </section>
    <Link className="login-back" href="/">← Volver al inicio</Link>
  </main>;
}
