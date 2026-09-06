"use client";

/* Album photos are already compressed data URLs, so Next image optimization cannot process them. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ACCESSORIES, ACTIVITY_LABELS, APPEARANCES, CARE_ACTIVITIES, COMMUNICATION_STYLES, EMOTION_LABELS, EMOTIONS, GENTLE_ACTIONS, PERSONALITIES, PET_TYPES } from "./catalog";

type Companion = { userId: string; petType: string; name: string; appearance: string; accessory: string; personality: string; communicationStyle: string; unlockedItems: string[]; bondStage: number; setupComplete: boolean; createdAt: number; updatedAt: number; lastInteractionAt: number };
type Profile = { displayName: string; theme: string; reduceMotion: boolean; companionEnabled: boolean; noraUseCareData: boolean; noraUseAlbumMoments: boolean; companionUseWellbeing: boolean; wellbeingStatsEnabled: boolean };
type Entry = { id: string; kind: string; activity: string; emotion: string; note: string; allowNora: boolean; happenedAt: number; createdAt: number };
type Moment = { id: string; text: string; emotion: string; photoData: string | null; personalNote: string; allowNora: boolean; petReaction: string; happenedAt: number; createdAt: number };
type Stats = { monthTotal: number; careTotal: number; checkinTotal: number; byActivity: Record<string, number> } | null;
type Tab = "space" | "care" | "album" | "privacy";
type PetState = "idle" | "near" | "bright" | "rest";
type ApiData = { companion?: Companion; profile?: Profile; entries?: Entry[]; moments?: Moment[]; stats?: Stats; entry?: Entry; moment?: Moment; companionMessage?: string; error?: string; ok?: boolean };

const DEFAULT_COMPANION: Companion = { userId: "", petType: "cat", name: "Lumi", appearance: "ink", accessory: "none", personality: "calm", communicationStyle: "words", unlockedItems: ["cushion"], bondStage: 1, setupComplete: false, createdAt: Date.now(), updatedAt: Date.now(), lastInteractionAt: Date.now() };
const DEFAULT_PROFILE: Profile = { displayName: "", theme: "system", reduceMotion: false, companionEnabled: true, noraUseCareData: false, noraUseAlbumMoments: false, companionUseWellbeing: true, wellbeingStatsEnabled: true };
const ACTION_TO_ACTIVITY: Record<string, string> = { pause: "rest", write: "journal", walk: "walk", talk: "connect", relax: "rest", water: "water", music: "joy", rest: "rest" };

export default function CompanionApp({ user, googleWelcome = false }: { user: { name: string; email: string }; googleWelcome?: boolean }) {
  const [companion, setCompanion] = useState<Companion>(DEFAULT_COMPANION);
  const [draft, setDraft] = useState<Companion>(DEFAULT_COMPANION);
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE, displayName: user.name });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [stats, setStats] = useState<Stats>(null);
  const [tab, setTab] = useState<Tab>("space");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [petState, setPetState] = useState<PetState>("idle");
  const [companionCopy, setCompanionCopy] = useState("Aquí no hay rachas. Podemos continuar desde donde quedamos.");
  const [checkinEmotion, setCheckinEmotion] = useState("difficult");
  const [checkinNote, setCheckinNote] = useState("");
  const [shareCare, setShareCare] = useState(false);
  const [showGentleActions, setShowGentleActions] = useState(false);
  const [momentText, setMomentText] = useState("");
  const [momentEmotion, setMomentEmotion] = useState("");
  const [momentNote, setMomentNote] = useState("");
  const [momentPhoto, setMomentPhoto] = useState<string | null>(null);
  const [shareMoment, setShareMoment] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showGoogleWelcome, setShowGoogleWelcome] = useState(googleWelcome);

  useEffect(() => {
    let cancelled = false;
    Promise.all([requestJson("/api/companion"), requestJson("/api/profile"), requestJson("/api/wellbeing"), requestJson("/api/moments")])
      .then(([companionData, profileData, wellbeingData, momentData]) => {
        if (cancelled) return;
        const nextCompanion = companionData.companion ?? DEFAULT_COMPANION;
        setCompanion(nextCompanion); setDraft(nextCompanion);
        setProfile({ ...DEFAULT_PROFILE, ...profileData.profile, displayName: profileData.profile?.displayName ?? user.name });
        setEntries(wellbeingData.entries ?? []); setStats(wellbeingData.stats ?? null); setMoments(momentData.moments ?? []);
      }).catch(requestError => {
        const message = requestError instanceof Error ? requestError.message : "No pudimos preparar este espacio.";
        if (message === "AUTH_REQUIRED") window.location.assign("/login?returnTo=/companion");
        else setError(message);
      }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.name]);

  useEffect(() => {
    const root = document.documentElement;
    if (profile.theme === "system") delete root.dataset.theme; else root.dataset.theme = profile.theme;
    root.dataset.motion = profile.reduceMotion ? "reduced" : "full";
  }, [profile.theme, profile.reduceMotion]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!googleWelcome) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    document.cookie = "nora_google_welcome=; Path=/; Max-Age=0; SameSite=Lax; Secure";
    const closeWithEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setShowGoogleWelcome(false); };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [googleWelcome]);

  const topActivities = useMemo(() => Object.entries(stats?.byActivity ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3), [stats]);

  async function saveCompanion(setupComplete = false) {
    setSaving(true); setError("");
    try {
      const data = await requestJson("/api/companion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name, petType: draft.petType, appearance: draft.appearance, accessory: draft.accessory, personality: draft.personality, communicationStyle: draft.communicationStyle, setupComplete }) });
      if (!data.companion) throw new Error("No pudimos guardar a tu compañero.");
      setCompanion(data.companion); setDraft(data.companion); setCustomizing(false); setNotice(setupComplete ? `${data.companion.name} ya tiene su espacio.` : "Personalización guardada");
    } catch (requestError) { handleError(requestError); }
    finally { setSaving(false); }
  }

  async function recordCare(activity: string) {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const data = await requestJson("/api/wellbeing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "care", activity, allowNora: shareCare }) });
      if (data.entry) setEntries(current => [data.entry!, ...current]);
      if (data.companion) { setCompanion(data.companion); setDraft(data.companion); }
      setPetState(profile.companionUseWellbeing ? "bright" : "idle");
      setCompanionCopy(data.companionMessage || "Queda registrado para ti.");
      setNotice("Momento de autocuidado reconocido");
      await refreshStats();
    } catch (requestError) { handleError(requestError); }
    finally { setSaving(false); }
  }

  async function recordCheckin(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    try {
      const data = await requestJson("/api/wellbeing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "checkin", emotion: checkinEmotion, note: checkinNote, allowNora: shareCare }) });
      if (data.entry) setEntries(current => [data.entry!, ...current]);
      if (data.companion) { setCompanion(data.companion); setDraft(data.companion); }
      setPetState(profile.companionUseWellbeing ? "near" : "idle"); setCompanionCopy(data.companionMessage || "Queda registrado para ti.");
      setCheckinNote(""); setShowGentleActions(true); setNotice("Tu día quedó registrado sin calificaciones");
      await refreshStats();
    } catch (requestError) { handleError(requestError); }
    finally { setSaving(false); }
  }

  async function chooseGentleAction(value: string) {
    if (value === "nothing") { setPetState("rest"); setCompanionCopy("Está bien. No tienes que hacer nada ahora. Tu compañero puede quedarse aquí en silencio."); return; }
    if (value === "stay") { setPetState("rest"); setCompanionCopy("Nos quedamos aquí un momento. Sin tareas y sin tener que explicar nada."); return; }
    const activity = ACTION_TO_ACTIVITY[value];
    if (activity) await recordCare(activity);
  }

  async function saveMoment(event: FormEvent) {
    event.preventDefault(); if (!momentText.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const data = await requestJson("/api/moments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: momentText, emotion: momentEmotion, personalNote: momentNote, photoData: momentPhoto, allowNora: shareMoment }) });
      if (!data.moment) throw new Error("No pudimos guardar este momento.");
      setMoments(current => [data.moment!, ...current]);
      if (data.companion) { setCompanion(data.companion); setDraft(data.companion); }
      setMomentText(""); setMomentEmotion(""); setMomentNote(""); setMomentPhoto(null); setShareMoment(false);
      setPetState("bright"); setCompanionCopy(data.moment.petReaction || "Este momento ya tiene un lugar aquí."); setNotice("Momento añadido al álbum");
      await refreshStats();
    } catch (requestError) { handleError(requestError); }
    finally { setSaving(false); }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true); setError("");
    try { setMomentPhoto(await compressImage(file)); }
    catch (photoError) { handleError(photoError); event.target.value = ""; }
    finally { setPhotoLoading(false); }
  }

  async function toggleMomentPermission(moment: Moment) {
    const allowNora = !moment.allowNora;
    setMoments(current => current.map(item => item.id === moment.id ? { ...item, allowNora } : item));
    try { await requestJson(`/api/moments/${moment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allowNora }) }); }
    catch (requestError) { setMoments(current => current.map(item => item.id === moment.id ? { ...item, allowNora: !allowNora } : item)); handleError(requestError); }
  }

  async function deleteMoment(id: string) {
    if (!window.confirm("¿Eliminar este momento del álbum? La habitación conservará todo lo que ya haya incorporado.")) return;
    try { await requestJson(`/api/moments/${id}`, { method: "DELETE" }); setMoments(current => current.filter(item => item.id !== id)); setNotice("Momento eliminado"); }
    catch (requestError) { handleError(requestError); }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("¿Eliminar este registro? Nada de lo que tu compañero ya incorporó se perderá.")) return;
    try { await requestJson(`/api/wellbeing/${id}`, { method: "DELETE" }); setEntries(current => current.filter(item => item.id !== id)); setNotice("Registro eliminado"); await refreshStats(); }
    catch (requestError) { handleError(requestError); }
  }

  async function savePreference<K extends keyof Profile>(key: K, value: Profile[K]) {
    const previous = profile[key]; setProfile(current => ({ ...current, [key]: value }));
    try { await requestJson("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) }); setNotice("Preferencia guardada"); }
    catch (requestError) { setProfile(current => ({ ...current, [key]: previous })); handleError(requestError); }
  }

  async function refreshStats() {
    const data = await requestJson("/api/wellbeing"); setStats(data.stats ?? null);
  }

  function handleError(requestError: unknown) {
    const message = requestError instanceof Error ? requestError.message : "Algo no salió bien. Inténtalo nuevamente.";
    if (message === "AUTH_REQUIRED") { window.location.assign("/login?returnTo=/companion"); return; }
    setError(message);
  }

  function dismissGoogleWelcome() { setShowGoogleWelcome(false); }

  if (loading) return <div className="companion-loading"><span className="logo-mark large">n</span><p>Preparando un espacio tranquilo…</p></div>;

  if (!profile.companionEnabled) return <div className="companion-disabled"><div><span className="logo-mark large">n</span><p>COMPAÑERO EMOCIONAL</p><h1>Este espacio está desactivado.</h1><p>Está bien. Nora funciona completamente sin mascota y puedes volver a activarla cuando quieras.</p><button type="button" onClick={() => savePreference("companionEnabled", true)}>Activar mi compañero</button><Link href="/chat">Volver al chat</Link></div></div>;

  return <div className="companion-shell">
    <header className="companion-topbar"><Link className="companion-brand" href="/"><span className="logo-mark">n</span><b>nora</b></Link><nav aria-label="Navegación principal"><Link href="/chat">Conversaciones</Link><span aria-current="page">Mi compañero</span></nav><div className="companion-user" title={user.email}>{profile.displayName.charAt(0).toUpperCase()}</div></header>
    <main>
      <section className="companion-hero"><div><span>UN ESPACIO QUE NO CUENTA DÍAS PERFECTOS</span><h1>{companion.setupComplete ? `El rincón de ${companion.name}` : "Tu compañero, a tu manera"}</h1><p>Lo que hiciste sigue contando aunque mañana sea difícil. Aquí se reconoce el cuidado; nunca se castiga una pausa.</p></div>{companion.setupComplete && <button type="button" onClick={() => { setDraft(companion); setCustomizing(true); }}>Personalizar</button>}</section>
      <nav className="companion-tabs" aria-label="Secciones de mi compañero">{([['space','Espacio'],['care','Cuidarme'],['album','Álbum'],['privacy','Privacidad']] as [Tab,string][]).map(([value,label]) => <button type="button" key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>)}</nav>
      {error && <div className="companion-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Cerrar error">×</button></div>}
      {notice && <div className="companion-notice" role="status">{notice}</div>}

      {tab === "space" && <section className="space-layout">
        <div className={`room-scene state-${petState}`}>
          <RoomItems items={companion.unlockedItems}/>
          <div className="pet-position"><PetVisual companion={companion} state={petState}/><div className="pet-shadow"/></div>
          {companion.communicationStyle !== "silent" && <div className="pet-bubble" aria-live="polite">{companionCopy}</div>}
          <div className="room-caption"><span>Tiempo compartido · etapa {companion.bondStage}</span><small>Esta habitación solo suma. Nunca pierde objetos por una pausa.</small></div>
        </div>
        <aside className="space-panel"><span>HOY</span><h2>¿Qué te vendría bien?</h2><p>No hace falta completar nada. Puedes registrar algo, hablar con Nora o simplemente mirar el espacio.</p><button type="button" onClick={() => setTab("care")}>Registrar cómo estuvo mi día <i>→</i></button><button type="button" onClick={() => setTab("album")}>Guardar un buen momento <i>→</i></button><Link href="/chat">Hablar con Nora <i>→</i></Link><div className="no-streak-card"><b>Progreso sin perfección</b><p>Si pasan varios días, {companion.name} seguirá aquí. Continuarás desde donde quedaste, nunca desde cero.</p></div></aside>
      </section>}

      {tab === "care" && <section className="care-layout">
        <div className="care-main"><div className="section-heading"><span>CUIDARME</span><h2>Reconocer un día real</h2><p>Esto es voluntario. No hay objetivos diarios, puntos ni rachas.</p></div>
          <form className="checkin-card" onSubmit={recordCheckin}><h3>¿Cómo quieres describir hoy?</h3><div className="emotion-grid">{EMOTIONS.slice(0, 8).map(item => <button type="button" key={item.value} className={checkinEmotion === item.value ? "selected" : ""} onClick={() => setCheckinEmotion(item.value)}>{item.label}</button>)}</div><label>Si quieres añadir algo <small>Opcional</small><textarea value={checkinNote} onChange={event => setCheckinNote(event.target.value)} maxLength={500} rows={3} placeholder="Solo lo que quieras dejar escrito…"/></label><PermissionCheck checked={shareCare} onChange={setShareCare} enabled={profile.noraUseCareData} label="Permitir que Nora use este registro si resulta pertinente"/><button type="submit" className="primary-action" disabled={saving}>Guardar sin calificar mi día</button></form>
          {showGentleActions && <div className="gentle-actions"><div><span>ALGO PEQUEÑO, SOLO SI QUIERES</span><h3>{companionCopy}</h3></div><div>{GENTLE_ACTIONS.map(action => <button type="button" key={action.value} onClick={() => chooseGentleAction(action.value)}><i>{action.icon}</i>{action.label}</button>)}</div></div>}
          <div className="activity-section"><h3>Algo que hiciste por ti</h3><p>Reconocerlo no lo convierte en una obligación para mañana.</p><PermissionCheck checked={shareCare} onChange={setShareCare} enabled={profile.noraUseCareData} label="Permitir que Nora use los próximos registros que haga aquí"/><div className="activity-grid">{CARE_ACTIVITIES.map(activity => <button type="button" key={activity.value} disabled={saving} onClick={() => recordCare(activity.value)}><i>{activity.icon}</i><span>{activity.label}</span></button>)}</div></div>
        </div>
        <aside className="care-aside">{profile.wellbeingStatsEnabled ? <><div className="month-summary"><span>ESTE MES</span><strong>{stats?.careTotal ?? 0}</strong><p>momentos de autocuidado registrados. Es una observación, no una meta.</p></div>{topActivities.length > 0 && <div className="observations"><h3>Lo que apareció últimamente</h3>{topActivities.map(([activity,count]) => <p key={activity}><span>{ACTIVITY_LABELS[activity] ?? activity}</span><b>{count} {count === 1 ? "vez" : "veces"}</b></p>)}</div>}</> : <div className="stats-off"><span>○</span><p>Elegiste no ver estadísticas. Tus registros siguen bajo tu control.</p></div>}<div className="recent-records"><h3>Registros recientes</h3>{entries.length === 0 ? <p>Aún no registraste nada, y no tienes que hacerlo.</p> : entries.slice(0,8).map(entry => <article key={entry.id}><div><b>{entry.kind === "care" ? ACTIVITY_LABELS[entry.activity] : EMOTION_LABELS[entry.emotion]}</b><small>{formatDate(entry.happenedAt)}{entry.allowNora ? " · visible para Nora" : ""}</small></div><button type="button" onClick={() => deleteEntry(entry.id)} aria-label="Eliminar registro">×</button></article>)}</div></aside>
      </section>}

      {tab === "album" && <section className="album-layout"><div className="section-heading"><span>ÁLBUM DE MOMENTOS</span><h2>Algo que quieras conservar</h2><p>No tiene que ser extraordinario. Un día tranquilo también puede tener un lugar.</p></div><form className="moment-form" onSubmit={saveMoment}><label>¿Qué ocurrió?<textarea value={momentText} onChange={event => setMomentText(event.target.value)} maxLength={600} rows={4} placeholder="Hoy pude salir aunque no tenía ganas…" required/></label><div className="moment-row"><label>Emoción <small>Opcional</small><select value={momentEmotion} onChange={event => setMomentEmotion(event.target.value)}><option value="">Sin etiqueta</option>{EMOTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Foto <small>Opcional · se guarda en Nora</small><span className="file-control"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto}/>{photoLoading ? "Comprimiendo…" : momentPhoto ? "Cambiar foto" : "Elegir foto"}</span></label></div>{momentPhoto && <div className="photo-preview"><img src={momentPhoto} alt="Vista previa del momento"/><button type="button" onClick={() => setMomentPhoto(null)}>Quitar</button></div>}<label>Una nota para mi yo futuro <small>Opcional</small><textarea value={momentNote} onChange={event => setMomentNote(event.target.value)} maxLength={500} rows={2}/></label><PermissionCheck checked={shareMoment} onChange={setShareMoment} enabled={profile.noraUseAlbumMoments} label="Permitir que Nora recuerde este momento cuando pueda ayudar"/><button type="submit" className="primary-action" disabled={saving || photoLoading || !momentText.trim()}>Guardar en mi álbum</button></form><div className="moment-grid">{moments.length === 0 ? <div className="empty-album"><span>◇</span><h3>Tu álbum está listo</h3><p>Solo guarda lo que tú decidas. No hay una cantidad que completar.</p></div> : moments.map(moment => <article className="moment-card" key={moment.id}>{moment.photoData && <img src={moment.photoData} alt="Recuerdo guardado por el usuario"/>}<div><span>{formatDate(moment.happenedAt)}{moment.emotion ? ` · ${EMOTION_LABELS[moment.emotion]}` : ""}</span><p>{moment.text}</p>{moment.personalNote && <blockquote>{moment.personalNote}</blockquote>}<small>{moment.petReaction}</small><footer><button type="button" className={moment.allowNora ? "allowed" : ""} onClick={() => toggleMomentPermission(moment)}>{moment.allowNora ? "Nora puede recordarlo" : "Solo para mí"}</button><button type="button" onClick={() => deleteMoment(moment.id)} aria-label="Eliminar momento">Eliminar</button></footer></div></article>)}</div></section>}

      {tab === "privacy" && <section className="privacy-layout"><div className="section-heading"><span>PRIVACIDAD Y AUTONOMÍA</span><h2>Tú decides qué se conecta</h2><p>Guardar algo no significa automáticamente compartirlo con Nora o con tu compañero.</p></div><div className="privacy-options"><PrivacyToggle label="Usar el compañero emocional" help="Puedes desactivarlo completamente sin borrar sus datos." checked={profile.companionEnabled} onChange={value => savePreference("companionEnabled", value)}/><PrivacyToggle label={`${companion.name} puede usar mis registros`} help="Permite reacciones y cambios sutiles en la habitación. Nunca produce castigos ni pérdidas." checked={profile.companionUseWellbeing} onChange={value => savePreference("companionUseWellbeing", value)}/><PrivacyToggle label="Nora puede consultar autocuidado" help="Aun activado, Nora solo recibe registros que marques individualmente y nunca las fotos." checked={profile.noraUseCareData} onChange={value => savePreference("noraUseCareData", value)}/><PrivacyToggle label="Nora puede consultar mi álbum" help="Solo se comparten los momentos que autorices individualmente. No se comparte ninguna foto." checked={profile.noraUseAlbumMoments} onChange={value => savePreference("noraUseAlbumMoments", value)}/><PrivacyToggle label="Mostrar observaciones del mes" help="Muestra cantidades descriptivas, nunca metas, puntuaciones o rachas." checked={profile.wellbeingStatsEnabled} onChange={value => savePreference("wellbeingStatsEnabled", value)}/></div><div className="privacy-explainer"><h3>Qué ocurre con tus datos</h3><p>Los registros, preferencias y fotos comprimidas se guardan en la base privada de Nora para que aparezcan al iniciar sesión en otro dispositivo. Las fotos no se envían al proveedor de inteligencia artificial. Puedes eliminar cada registro o momento por separado, descargar todos tus datos desde Configuración y borrar tu cuenta completa cuando quieras.</p><Link href="/chat">Abrir configuración de la cuenta <span>→</span></Link></div></section>}
    </main>

    {(!companion.setupComplete || customizing) && <div className="pet-setup-backdrop"><section className="pet-setup" role="dialog" aria-modal="true" aria-labelledby="pet-setup-title"><header><div><span>{companion.setupComplete ? "PERSONALIZAR" : "PRIMER ENCUENTRO"}</span><h2 id="pet-setup-title">Crea un compañero que se sienta tuyo</h2><p>No necesita cuidados diarios y nunca te hará sentir culpable por ausentarte.</p></div>{companion.setupComplete && <button type="button" onClick={() => setCustomizing(false)} aria-label="Cerrar personalización">×</button>}</header><div className="setup-preview"><PetVisual companion={draft} state="idle"/><label>Nombre<input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} maxLength={24}/></label></div><SetupChoice title="Tipo" options={PET_TYPES} value={draft.petType} onChange={value => setDraft(current => ({ ...current, petType: value }))}/><SetupChoice title="Apariencia" options={APPEARANCES} value={draft.appearance} onChange={value => setDraft(current => ({ ...current, appearance: value }))}/><SetupChoice title="Accesorio" options={ACCESSORIES} value={draft.accessory} onChange={value => setDraft(current => ({ ...current, accessory: value }))}/><SetupChoice title="Personalidad" options={PERSONALITIES} value={draft.personality} onChange={value => setDraft(current => ({ ...current, personality: value }))}/><SetupChoice title="Cómo se comunica" options={COMMUNICATION_STYLES} value={draft.communicationStyle} onChange={value => setDraft(current => ({ ...current, communicationStyle: value }))}/><footer><p>Podrás cambiar todo esto después. Nada se pierde.</p><button type="button" disabled={saving || draft.name.trim().length < 2} onClick={() => saveCompanion(!companion.setupComplete)}>{saving ? "Guardando…" : companion.setupComplete ? "Guardar cambios" : "Preparar su espacio"}</button></footer></section></div>}
    {showGoogleWelcome && <div className="google-welcome-backdrop" role="presentation"><section className="google-welcome-card" role="dialog" aria-modal="true" aria-labelledby="google-welcome-title"><button type="button" className="google-welcome-close" onClick={dismissGoogleWelcome} aria-label="Cerrar bienvenida">×</button><div className="google-welcome-orbit" aria-hidden="true"><span>✦</span><span>♡</span><span>✧</span></div><span className="google-welcome-kicker">PRIMER ENCUENTRO CON NORA</span><div className="google-welcome-logo" aria-hidden="true"><span className="logo-mark large">n</span><span className="google-welcome-spark">✦</span></div><h2 id="google-welcome-title">Qué bueno verte, {profile.displayName.split(" ")[0] || user.name.split(" ")[0] || "amigo"}.</h2><p>Gracias por confiar en Nora. Este rincón está aquí para acompañarte a tu ritmo, sin exigencias y sin tener que explicarlo todo.</p><button type="button" className="google-welcome-cta" onClick={dismissGoogleWelcome}>Explorar mi espacio <span>→</span></button><small>Tu espacio sigue siendo tuyo. Tú decides qué recordar y qué dejar solo para ti.</small></section></div>}
  </div>;
}

function PetVisual({ companion, state }: { companion: Companion; state: PetState }) {
  const palette = APPEARANCES.find(item => item.value === companion.appearance) ?? APPEARANCES[0];
  const faceY = companion.petType === "rabbit" ? 94 : 91;
  const eyeY = state === "rest" ? faceY + 3 : faceY;
  const isDog = companion.petType === "dog";
  const isRabbit = companion.petType === "rabbit";
  const isFox = companion.petType === "fox";
  return <svg className={`pet-visual pet-${companion.petType} pet-${state}`} viewBox="0 0 280 270" role="img" aria-label={`${companion.name}, tu compañero ${PET_TYPES.find(item => item.value === companion.petType)?.label.toLowerCase() ?? "virtual"}`}>
    <title>{companion.name} está acompañándote</title>
    <defs><linearGradient id={`pet-shine-${companion.appearance}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".22"/><stop offset=".6" stopColor="#ffffff" stopOpacity="0"/></linearGradient></defs>
    <g className="pet-tail" fill="none" stroke={palette.color} strokeWidth={isDog ? 25 : isFox ? 30 : 22} strokeLinecap="round"><path d={isDog ? "M205 191 Q263 174 235 132" : isRabbit ? "M205 188 Q256 204 239 155" : isFox ? "M205 188 Q271 211 245 132" : "M205 188 Q267 206 245 143"}/>{isFox && <path d="M247 140 Q251 127 245 115" stroke={palette.accent} strokeWidth="13"/>}</g>
    <g className="pet-body">
      <ellipse className="pet-torso" cx="140" cy="184" rx="77" ry="58" fill={palette.color}/>
      {isFox ? <><path className="pet-head pet-fox-head" d="M73 91 Q76 48 91 32 L108 58 Q140 43 172 58 L189 32 Q204 48 207 91 Q204 129 179 151 Q140 177 101 151 Q76 129 73 91Z" fill={palette.color}/><path className="pet-ear" d="M82 68 L85 3 L126 54 Q101 54 82 68Z" fill={palette.color}/><path className="pet-ear-inner" d="M91 52 L92 20 L113 52Z" fill={palette.accent}/><path className="pet-ear" d="M154 54 L195 3 L198 68 Q179 54 154 54Z" fill={palette.color}/><path className="pet-ear-inner" d="M167 52 L190 20 L189 52Z" fill={palette.accent}/></> : <><circle className="pet-head" cx="140" cy={faceY} r="70" fill={palette.color}/>{isRabbit ? <><path className="pet-ear" d="M99 53 Q77 -35 111 3 L130 48Z" fill={palette.color}/><path className="pet-ear-inner" d="M102 42 Q92 -8 108 14 L119 42Z" fill={palette.accent}/><path className="pet-ear" d="M151 47 Q157 -34 181 8 L168 58Z" fill={palette.color}/><path className="pet-ear-inner" d="M158 42 Q164 -7 174 14 L166 45Z" fill={palette.accent}/></> : isDog ? <><path className="pet-ear" d="M94 63 Q44 47 57 124 L100 108Z" fill={palette.color}/><path className="pet-ear-inner" d="M82 72 Q59 67 68 108 L91 99Z" fill={palette.accent}/><path className="pet-ear" d="M186 62 Q237 45 222 123 L180 107Z" fill={palette.color}/><path className="pet-ear-inner" d="M198 72 Q220 66 211 108 L188 98Z" fill={palette.accent}/></> : <><path className="pet-ear" d="M89 53 L93 5 L131 38Z" fill={palette.color}/><path className="pet-ear-inner" d="M99 39 L101 19 L117 37Z" fill={palette.accent}/><path className="pet-ear" d="M149 37 L190 4 L187 65Z" fill={palette.color}/><path className="pet-ear-inner" d="M161 37 L179 20 L178 49Z" fill={palette.accent}/></>}</>}
      <path className="pet-highlight" d="M92 72 Q116 42 143 41 Q114 60 109 97 Q99 91 92 72Z" fill={`url(#pet-shine-${companion.appearance})`}/>
    </g>
    {isFox && <path className="pet-chest" d="M108 151 Q140 177 172 151 L163 223 Q140 241 117 223Z" fill={palette.accent} opacity=".9"/>}
    <g className="pet-face" fill={palette.accent} transform={`translate(0 ${isRabbit ? 5 : 0})`}>
      <ellipse className="pet-eye" cx="116" cy={eyeY} rx="7" ry={state === "rest" ? 2 : 9}/><ellipse className="pet-eye" cx="164" cy={eyeY} rx="7" ry={state === "rest" ? 2 : 9}/>
      {state !== "rest" && <><circle cx="118" cy={eyeY - 3} r="2.5" fill={palette.color}/><circle cx="166" cy={eyeY - 3} r="2.5" fill={palette.color}/></>}
      {isFox ? <path className="pet-muzzle" d="M116 108 Q140 94 164 108 L155 139 Q140 153 125 139Z" fill={palette.accent} opacity=".9"/> : <ellipse className="pet-muzzle" cx="140" cy="111" rx={isDog ? 23 : 17} ry="14" fill={palette.accent} opacity=".78"/>}
      <path className="pet-nose" d={isFox ? "M130 108 Q140 99 150 108 L140 120Z" : "M134 108 Q140 103 146 108 Q140 115 134 108Z"} fill={palette.color}/>
      <path className="pet-mouth" d={state === "bright" ? "M132 116 Q140 128 148 116" : "M134 117 Q140 122 146 117"} fill="none" stroke={palette.color} strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="103" cy="112" r="6" opacity=".18"/><circle cx="177" cy="112" r="6" opacity=".18"/>
    </g>
    <g className="pet-paws" fill={palette.color}><ellipse cx="100" cy="230" rx="33" ry="17"/><ellipse cx="180" cy="230" rx="33" ry="17"/><path d="M91 224v8M101 222v10M111 224v8M171 224v8M181 222v10M191 224v8" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" opacity=".7"/></g>
    {companion.accessory === "scarf" && <g className="pet-accessory"><path d="M75 143 Q140 166 205 143 L193 168 Q139 185 87 168Z" fill="#f1f0ec" stroke="#161616" strokeWidth="3"/><path d="M179 164 L204 202 L181 193Z" fill="#d3cdc2" stroke="#161616" strokeWidth="3"/></g>}
    {companion.accessory === "bandana" && <path className="pet-accessory" d="M96 145 L184 145 L164 185 L140 162 L116 185Z" fill="#b8b2a7" stroke="#161616" strokeWidth="3"/>}
    {companion.accessory === "flower" && <g className="pet-accessory" transform="translate(188 51)" fill="#f4f1e9" stroke="#222" strokeWidth="2"><circle cx="0" cy="-12" r="11"/><circle cx="12" cy="0" r="11"/><circle cx="0" cy="12" r="11"/><circle cx="-12" cy="0" r="11"/><circle fill="#222" r="6"/></g>}
  </svg>;
}

function RoomItems({ items }: { items: string[] }) { const has = (item: string) => items.includes(item); return <div className="room-items" aria-hidden="true"><div className="room-floor"/><div className="room-cushion"/>{has("rug") && <div className="room-rug"/>}{has("plant") && <div className="room-plant"><i/><span>⌇</span></div>}{has("notebook") && <div className="room-notebook">≡</div>}{has("blanket") && <div className="room-blanket"/>}{has("symbolic-photo") && <div className="room-photo">○</div>}{has("cup") && <div className="room-cup"/>}{has("memory-shelf") && <div className="room-shelf"><i/><i/><i/></div>}{has("lamp") && <div className="room-lamp"><i/><span/></div>}{has("window-light") && <div className="room-window"><i/></div>}</div>; }

function SetupChoice({ title, options, value, onChange }: { title: string; options: ReadonlyArray<{ value: string; label: string; description?: string }>; value: string; onChange: (value: string) => void }) { return <fieldset className="setup-choice"><legend>{title}</legend><div>{options.map(option => <button type="button" key={option.value} className={value === option.value ? "selected" : ""} onClick={() => onChange(option.value)}><b>{option.label}</b>{option.description && <small>{option.description}</small>}</button>)}</div></fieldset>; }
function PermissionCheck({ checked, onChange, enabled, label }: { checked: boolean; onChange: (value: boolean) => void; enabled: boolean; label: string }) { return <label className={`permission-check${enabled ? "" : " disabled"}`}><input type="checkbox" checked={checked} disabled={!enabled} onChange={event => onChange(event.target.checked)}/><span>{label}<small>{enabled ? "Este registro seguirá sujeto al permiso general." : "Activa primero el permiso general en Privacidad."}</small></span></label>; }
function PrivacyToggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="privacy-toggle"><span><b>{label}</b><small>{help}</small></span><input type="checkbox" aria-label={label} checked={checked} onChange={event => onChange(event.target.checked)}/></label>; }

async function requestJson(url: string, options?: RequestInit): Promise<ApiData> {
  let response: Response;
  try { response = await fetch(url, { ...options, credentials: "same-origin", headers: { Accept: "application/json", ...(options?.headers ?? {}) } }); }
  catch { throw new Error("No pudimos conectar con Nora. Revisa tu conexión e inténtalo otra vez."); }
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  const raw = await response.text();
  let data: ApiData = {};
  try { data = raw ? JSON.parse(raw) as ApiData : {}; } catch { /* Algunos errores del Worker no incluyen JSON. */ }
  if (!response.ok) throw new Error(data.error || `No pudimos completar esta acción (${response.status}).`);
  return data;
}
function formatDate(timestamp: number) { return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric" }).format(new Date(timestamp)); }

async function compressImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8_000_000) throw new Error("Elige una imagen JPG, PNG o WebP de menos de 8 MB.");
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d"); if (!context) throw new Error("Tu navegador no pudo preparar la foto.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let result = canvas.toDataURL("image/webp", 0.72);
  if (!result.startsWith("data:image/webp")) result = canvas.toDataURL("image/jpeg", 0.72);
  if (result.length > 350_000) { const smaller = document.createElement("canvas"); const shrink = Math.min(1, 650 / Math.max(canvas.width, canvas.height)); smaller.width = Math.round(canvas.width * shrink); smaller.height = Math.round(canvas.height * shrink); smaller.getContext("2d")?.drawImage(canvas, 0, 0, smaller.width, smaller.height); result = smaller.toDataURL("image/jpeg", 0.58); }
  if (result.length > 350_000) throw new Error("No pudimos comprimir la foto lo suficiente. Prueba con una imagen más pequeña.");
  return result;
}
function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("No pudimos leer la foto.")); reader.readAsDataURL(file); }); }
function loadImage(source: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("No pudimos abrir la foto.")); image.src = source; }); }
