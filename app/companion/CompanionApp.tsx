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

export default function CompanionApp({ user }: { user: { name: string; email: string } }) {
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

  if (loading) return <div className="companion-loading"><span className="logo-mark large">n</span><p>Preparando un espacio tranquilo…</p></div>;

  if (!profile.companionEnabled) return <div className="companion-disabled"><div><span className="logo-mark large">n</span><p>COMPAÑERO EMOCIONAL</p><h1>Este espacio está desactivado.</h1><p>Está bien. Nora funciona completamente sin mascota y puedes volver a activarla cuando quieras.</p><button onClick={() => savePreference("companionEnabled", true)}>Activar mi compañero</button><Link href="/chat">Volver al chat</Link></div></div>;

  return <div className="companion-shell">
    <header className="companion-topbar"><Link className="companion-brand" href="/"><span className="logo-mark">n</span><b>nora</b></Link><nav aria-label="Navegación principal"><Link href="/chat">Conversaciones</Link><span aria-current="page">Mi compañero</span></nav><div className="companion-user" title={user.email}>{profile.displayName.charAt(0).toUpperCase()}</div></header>
    <main>
      <section className="companion-hero"><div><span>UN ESPACIO QUE NO CUENTA DÍAS PERFECTOS</span><h1>{companion.setupComplete ? `El rincón de ${companion.name}` : "Tu compañero, a tu manera"}</h1><p>Lo que hiciste sigue contando aunque mañana sea difícil. Aquí se reconoce el cuidado; nunca se castiga una pausa.</p></div>{companion.setupComplete && <button onClick={() => { setDraft(companion); setCustomizing(true); }}>Personalizar</button>}</section>
      <nav className="companion-tabs" aria-label="Secciones de mi compañero">{([['space','Espacio'],['care','Cuidarme'],['album','Álbum'],['privacy','Privacidad']] as [Tab,string][]).map(([value,label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>)}</nav>
      {error && <div className="companion-alert" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Cerrar error">×</button></div>}
      {notice && <div className="companion-notice" role="status">{notice}</div>}

      {tab === "space" && <section className="space-layout">
        <div className={`room-scene state-${petState}`}>
          <RoomItems items={companion.unlockedItems}/>
          <div className="pet-position"><PetVisual companion={companion} state={petState}/><div className="pet-shadow"/></div>
          {companion.communicationStyle !== "silent" && <div className="pet-bubble" aria-live="polite">{companionCopy}</div>}
          <div className="room-caption"><span>Tiempo compartido · etapa {companion.bondStage}</span><small>Esta habitación solo suma. Nunca pierde objetos por una pausa.</small></div>
        </div>
        <aside className="space-panel"><span>HOY</span><h2>¿Qué te vendría bien?</h2><p>No hace falta completar nada. Puedes registrar algo, hablar con Nora o simplemente mirar el espacio.</p><button onClick={() => setTab("care")}>Registrar cómo estuvo mi día <i>→</i></button><button onClick={() => setTab("album")}>Guardar un buen momento <i>→</i></button><Link href="/chat">Hablar con Nora <i>→</i></Link><div className="no-streak-card"><b>Progreso sin perfección</b><p>Si pasan varios días, {companion.name} seguirá aquí. Continuarás desde donde quedaste, nunca desde cero.</p></div></aside>
      </section>}

      {tab === "care" && <section className="care-layout">
        <div className="care-main"><div className="section-heading"><span>CUIDARME</span><h2>Reconocer un día real</h2><p>Esto es voluntario. No hay objetivos diarios, puntos ni rachas.</p></div>
          <form className="checkin-card" onSubmit={recordCheckin}><h3>¿Cómo quieres describir hoy?</h3><div className="emotion-grid">{EMOTIONS.slice(0, 8).map(item => <button type="button" key={item.value} className={checkinEmotion === item.value ? "selected" : ""} onClick={() => setCheckinEmotion(item.value)}>{item.label}</button>)}</div><label>Si quieres añadir algo <small>Opcional</small><textarea value={checkinNote} onChange={event => setCheckinNote(event.target.value)} maxLength={500} rows={3} placeholder="Solo lo que quieras dejar escrito…"/></label><PermissionCheck checked={shareCare} onChange={setShareCare} enabled={profile.noraUseCareData} label="Permitir que Nora use este registro si resulta pertinente"/><button className="primary-action" disabled={saving}>Guardar sin calificar mi día</button></form>
          {showGentleActions && <div className="gentle-actions"><div><span>ALGO PEQUEÑO, SOLO SI QUIERES</span><h3>{companionCopy}</h3></div><div>{GENTLE_ACTIONS.map(action => <button key={action.value} onClick={() => chooseGentleAction(action.value)}><i>{action.icon}</i>{action.label}</button>)}</div></div>}
          <div className="activity-section"><h3>Algo que hiciste por ti</h3><p>Reconocerlo no lo convierte en una obligación para mañana.</p><PermissionCheck checked={shareCare} onChange={setShareCare} enabled={profile.noraUseCareData} label="Permitir que Nora use los próximos registros que haga aquí"/><div className="activity-grid">{CARE_ACTIVITIES.map(activity => <button key={activity.value} disabled={saving} onClick={() => recordCare(activity.value)}><i>{activity.icon}</i><span>{activity.label}</span></button>)}</div></div>
        </div>
        <aside className="care-aside">{profile.wellbeingStatsEnabled ? <><div className="month-summary"><span>ESTE MES</span><strong>{stats?.careTotal ?? 0}</strong><p>momentos de autocuidado registrados. Es una observación, no una meta.</p></div>{topActivities.length > 0 && <div className="observations"><h3>Lo que apareció últimamente</h3>{topActivities.map(([activity,count]) => <p key={activity}><span>{ACTIVITY_LABELS[activity] ?? activity}</span><b>{count} {count === 1 ? "vez" : "veces"}</b></p>)}</div>}</> : <div className="stats-off"><span>○</span><p>Elegiste no ver estadísticas. Tus registros siguen bajo tu control.</p></div>}<div className="recent-records"><h3>Registros recientes</h3>{entries.length === 0 ? <p>Aún no registraste nada, y no tienes que hacerlo.</p> : entries.slice(0,8).map(entry => <article key={entry.id}><div><b>{entry.kind === "care" ? ACTIVITY_LABELS[entry.activity] : EMOTION_LABELS[entry.emotion]}</b><small>{formatDate(entry.happenedAt)}{entry.allowNora ? " · visible para Nora" : ""}</small></div><button onClick={() => deleteEntry(entry.id)} aria-label="Eliminar registro">×</button></article>)}</div></aside>
      </section>}

      {tab === "album" && <section className="album-layout"><div className="section-heading"><span>ÁLBUM DE MOMENTOS</span><h2>Algo que quieras conservar</h2><p>No tiene que ser extraordinario. Un día tranquilo también puede tener un lugar.</p></div><form className="moment-form" onSubmit={saveMoment}><label>¿Qué ocurrió?<textarea value={momentText} onChange={event => setMomentText(event.target.value)} maxLength={600} rows={4} placeholder="Hoy pude salir aunque no tenía ganas…" required/></label><div className="moment-row"><label>Emoción <small>Opcional</small><select value={momentEmotion} onChange={event => setMomentEmotion(event.target.value)}><option value="">Sin etiqueta</option>{EMOTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Foto <small>Opcional · se guarda en Nora</small><span className="file-control"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto}/>{photoLoading ? "Comprimiendo…" : momentPhoto ? "Cambiar foto" : "Elegir foto"}</span></label></div>{momentPhoto && <div className="photo-preview"><img src={momentPhoto} alt="Vista previa del momento"/><button type="button" onClick={() => setMomentPhoto(null)}>Quitar</button></div>}<label>Una nota para mi yo futuro <small>Opcional</small><textarea value={momentNote} onChange={event => setMomentNote(event.target.value)} maxLength={500} rows={2}/></label><PermissionCheck checked={shareMoment} onChange={setShareMoment} enabled={profile.noraUseAlbumMoments} label="Permitir que Nora recuerde este momento cuando pueda ayudar"/><button className="primary-action" disabled={saving || photoLoading || !momentText.trim()}>Guardar en mi álbum</button></form><div className="moment-grid">{moments.length === 0 ? <div className="empty-album"><span>◇</span><h3>Tu álbum está listo</h3><p>Solo guarda lo que tú decidas. No hay una cantidad que completar.</p></div> : moments.map(moment => <article className="moment-card" key={moment.id}>{moment.photoData && <img src={moment.photoData} alt="Recuerdo guardado por el usuario"/>}<div><span>{formatDate(moment.happenedAt)}{moment.emotion ? ` · ${EMOTION_LABELS[moment.emotion]}` : ""}</span><p>{moment.text}</p>{moment.personalNote && <blockquote>{moment.personalNote}</blockquote>}<small>{moment.petReaction}</small><footer><button className={moment.allowNora ? "allowed" : ""} onClick={() => toggleMomentPermission(moment)}>{moment.allowNora ? "Nora puede recordarlo" : "Solo para mí"}</button><button onClick={() => deleteMoment(moment.id)} aria-label="Eliminar momento">Eliminar</button></footer></div></article>)}</div></section>}

      {tab === "privacy" && <section className="privacy-layout"><div className="section-heading"><span>PRIVACIDAD Y AUTONOMÍA</span><h2>Tú decides qué se conecta</h2><p>Guardar algo no significa automáticamente compartirlo con Nora o con tu compañero.</p></div><div className="privacy-options"><PrivacyToggle label="Usar el compañero emocional" help="Puedes desactivarlo completamente sin borrar sus datos." checked={profile.companionEnabled} onChange={value => savePreference("companionEnabled", value)}/><PrivacyToggle label={`${companion.name} puede usar mis registros`} help="Permite reacciones y cambios sutiles en la habitación. Nunca produce castigos ni pérdidas." checked={profile.companionUseWellbeing} onChange={value => savePreference("companionUseWellbeing", value)}/><PrivacyToggle label="Nora puede consultar autocuidado" help="Aun activado, Nora solo recibe registros que marques individualmente y nunca las fotos." checked={profile.noraUseCareData} onChange={value => savePreference("noraUseCareData", value)}/><PrivacyToggle label="Nora puede consultar mi álbum" help="Solo se comparten los momentos que autorices individualmente. No se comparte ninguna foto." checked={profile.noraUseAlbumMoments} onChange={value => savePreference("noraUseAlbumMoments", value)}/><PrivacyToggle label="Mostrar observaciones del mes" help="Muestra cantidades descriptivas, nunca metas, puntuaciones o rachas." checked={profile.wellbeingStatsEnabled} onChange={value => savePreference("wellbeingStatsEnabled", value)}/></div><div className="privacy-explainer"><h3>Qué ocurre con tus datos</h3><p>Los registros, preferencias y fotos comprimidas se guardan en la base privada de Nora para que aparezcan al iniciar sesión en otro dispositivo. Las fotos no se envían al proveedor de inteligencia artificial. Puedes eliminar cada registro o momento por separado, descargar todos tus datos desde Configuración y borrar tu cuenta completa cuando quieras.</p><Link href="/chat">Abrir configuración de la cuenta <span>→</span></Link></div></section>}
    </main>

    {(!companion.setupComplete || customizing) && <div className="pet-setup-backdrop"><section className="pet-setup" role="dialog" aria-modal="true" aria-labelledby="pet-setup-title"><header><div><span>{companion.setupComplete ? "PERSONALIZAR" : "PRIMER ENCUENTRO"}</span><h2 id="pet-setup-title">Crea un compañero que se sienta tuyo</h2><p>No necesita cuidados diarios y nunca te hará sentir culpable por ausentarte.</p></div>{companion.setupComplete && <button onClick={() => setCustomizing(false)} aria-label="Cerrar personalización">×</button>}</header><div className="setup-preview"><PetVisual companion={draft} state="idle"/><label>Nombre<input value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} maxLength={24}/></label></div><SetupChoice title="Tipo" options={PET_TYPES} value={draft.petType} onChange={value => setDraft(current => ({ ...current, petType: value }))}/><SetupChoice title="Apariencia" options={APPEARANCES} value={draft.appearance} onChange={value => setDraft(current => ({ ...current, appearance: value }))}/><SetupChoice title="Accesorio" options={ACCESSORIES} value={draft.accessory} onChange={value => setDraft(current => ({ ...current, accessory: value }))}/><SetupChoice title="Personalidad" options={PERSONALITIES} value={draft.personality} onChange={value => setDraft(current => ({ ...current, personality: value }))}/><SetupChoice title="Cómo se comunica" options={COMMUNICATION_STYLES} value={draft.communicationStyle} onChange={value => setDraft(current => ({ ...current, communicationStyle: value }))}/><footer><p>Podrás cambiar todo esto después. Nada se pierde.</p><button disabled={saving || draft.name.trim().length < 2} onClick={() => saveCompanion(!companion.setupComplete)}>{saving ? "Guardando…" : companion.setupComplete ? "Guardar cambios" : "Preparar su espacio"}</button></footer></section></div>}
  </div>;
}

function PetVisual({ companion, state }: { companion: Companion; state: PetState }) {
  const palette = APPEARANCES.find(item => item.value === companion.appearance) ?? APPEARANCES[0];
  return <svg className={`pet-visual pet-${companion.petType} pet-${state}`} viewBox="0 0 260 250" role="img" aria-label={`${companion.name}, tu compañero ${PET_TYPES.find(item => item.value === companion.petType)?.label.toLowerCase() ?? "virtual"}`}><title>{companion.name} está acompañándote</title><g className="pet-tail" fill="none" stroke={palette.color} strokeWidth="28" strokeLinecap="round"><path d={companion.petType === "dog" ? "M194 177 Q245 161 220 126" : "M190 180 Q241 198 226 144"}/></g><g className="pet-body" fill={palette.color}><ellipse cx="129" cy="173" rx="72" ry="55"/><circle cx="130" cy="91" r="67"/>{companion.petType === "rabbit" ? <><path d="M91 49 Q76 -25 108 8 L121 42Z"/><path d="M143 42 Q153 -25 174 12 L163 52Z"/></> : companion.petType === "dog" ? <><path d="M80 62 Q42 53 56 111 L90 106Z"/><path d="M177 61 Q217 51 201 111 L170 105Z"/></> : <><path d="M79 49 L83 4 L118 34Z"/><path d="M144 34 L181 3 L180 57Z"/></>}</g><g className="pet-face" fill={palette.accent}><ellipse cx="108" cy="87" rx="6" ry={state === "rest" ? 2 : 8}/><ellipse cx="153" cy="87" rx="6" ry={state === "rest" ? 2 : 8}/><path d="M125 105 Q131 111 137 105" fill="none" stroke={palette.accent} strokeWidth="4" strokeLinecap="round"/></g><g className="pet-paws" fill={palette.color}><ellipse cx="92" cy="217" rx="29" ry="14"/><ellipse cx="166" cy="217" rx="29" ry="14"/></g>{companion.accessory === "scarf" && <path d="M76 129 Q130 149 184 129 L174 151 Q129 166 84 151Z" fill="#f1f0ec" stroke="#161616" strokeWidth="3"/>}{companion.accessory === "bandana" && <path d="M91 136 L169 136 L153 170 L128 151 L106 171Z" fill="#b8b2a7" stroke="#161616" strokeWidth="3"/>}{companion.accessory === "flower" && <g transform="translate(174 44)" fill="#f4f1e9" stroke="#222" strokeWidth="2"><circle cx="0" cy="-10" r="10"/><circle cx="10" cy="0" r="10"/><circle cx="0" cy="10" r="10"/><circle cx="-10" cy="0" r="10"/><circle fill="#222" r="6"/></g>}</svg>;
}

function RoomItems({ items }: { items: string[] }) { const has = (item: string) => items.includes(item); return <div className="room-items" aria-hidden="true"><div className="room-floor"/><div className="room-cushion"/>{has("rug") && <div className="room-rug"/>}{has("plant") && <div className="room-plant"><i/><span>⌇</span></div>}{has("notebook") && <div className="room-notebook">≡</div>}{has("blanket") && <div className="room-blanket"/>}{has("symbolic-photo") && <div className="room-photo">○</div>}{has("cup") && <div className="room-cup"/>}{has("memory-shelf") && <div className="room-shelf"><i/><i/><i/></div>}{has("lamp") && <div className="room-lamp"><i/><span/></div>}{has("window-light") && <div className="room-window"><i/></div>}</div>; }

function SetupChoice({ title, options, value, onChange }: { title: string; options: ReadonlyArray<{ value: string; label: string; description?: string }>; value: string; onChange: (value: string) => void }) { return <fieldset className="setup-choice"><legend>{title}</legend><div>{options.map(option => <button type="button" key={option.value} className={value === option.value ? "selected" : ""} onClick={() => onChange(option.value)}><b>{option.label}</b>{option.description && <small>{option.description}</small>}</button>)}</div></fieldset>; }
function PermissionCheck({ checked, onChange, enabled, label }: { checked: boolean; onChange: (value: boolean) => void; enabled: boolean; label: string }) { return <label className={`permission-check${enabled ? "" : " disabled"}`}><input type="checkbox" checked={checked} disabled={!enabled} onChange={event => onChange(event.target.checked)}/><span>{label}<small>{enabled ? "Este registro seguirá sujeto al permiso general." : "Activa primero el permiso general en Privacidad."}</small></span></label>; }
function PrivacyToggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="privacy-toggle"><span><b>{label}</b><small>{help}</small></span><input type="checkbox" aria-label={label} checked={checked} onChange={event => onChange(event.target.checked)}/></label>; }

async function requestJson(url: string, options?: RequestInit): Promise<ApiData> { const response = await fetch(url, options); if (response.status === 401) throw new Error("AUTH_REQUIRED"); const data = await response.json() as ApiData; if (!response.ok) throw new Error(data.error || "No pudimos completar esta acción."); return data; }
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
