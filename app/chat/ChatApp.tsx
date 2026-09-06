"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Conversation = { id: string; title: string; updatedAt: number };
type Message = { id?: string; role: "user" | "assistant"; content: string; important?: boolean; createdAt?: number; failed?: boolean };
type Memory = { id: string; content: string; category: string; createdAt: number; updatedAt: number };
type Profile = {
  displayName: string; email: string; theme: string; tone: string; fontSize: string; reduceMotion: boolean;
  responseLength: string; memoryEnabled: boolean; enterToSend: boolean; highContrast: boolean; chatWidth: string;
  pronouns: string; aboutMe: string;
};
type Props = { user: { name: string; email: string } };
type SettingsTab = "profile" | "nora" | "appearance" | "memory" | "privacy";
type ApiData = { conversations?: Conversation[]; profile?: Profile; conversation?: Conversation; messages?: Message[]; userMessage?: Message; message?: Message; title?: string; remembered?: boolean; memories?: Memory[]; memory?: Memory; error?: string; ok?: boolean };

const DEFAULT_PROFILE: Profile = { displayName: "", email: "", theme: "system", tone: "warm", fontSize: "medium", reduceMotion: false, responseLength: "balanced", memoryEnabled: true, enterToSend: true, highContrast: false, chatWidth: "comfortable", pronouns: "", aboutMe: "" };
const MEMORY_LABELS: Record<string, string> = { personal: "Sobre mí", support: "Me ayuda", goal: "Objetivo", boundary: "Evitar" };

export default function ChatApp({ user }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE, displayName: user.name, email: user.email });
  const [profileDraft, setProfileDraft] = useState({ displayName: user.name, pronouns: "", aboutMe: "" });
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [settings, setSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryText, setMemoryText] = useState("");
  const [memoryCategory, setMemoryCategory] = useState("personal");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([requestJson("/api/conversations"), requestJson("/api/profile")]).then(([conversationData, profileData]) => {
      if (cancelled) return;
      setConversations(conversationData.conversations ?? []);
      if (profileData.profile) {
        const next = { ...DEFAULT_PROFILE, ...profileData.profile } as Profile;
        setProfile(next);
        setProfileDraft({ displayName: next.displayName, pronouns: next.pronouns, aboutMe: next.aboutMe });
      }
    }).catch(handleRequestError);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (profile.theme === "system") delete root.dataset.theme; else root.dataset.theme = profile.theme;
    root.dataset.font = profile.fontSize;
    root.dataset.motion = profile.reduceMotion ? "reduced" : "full";
    root.dataset.contrast = profile.highContrast ? "high" : "normal";
    root.dataset.chatWidth = profile.chatWidth;
  }, [profile]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: profile.reduceMotion ? "auto" : "smooth" }); }, [messages, loading, profile.reduceMotion]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!settings) return;
    const close = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setSettings(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [settings]);

  const filteredConversations = useMemo(() => conversations.filter(item => item.title.toLowerCase().includes(search.trim().toLowerCase())), [conversations, search]);
  const activeConversation = conversations.find(item => item.id === active);

  async function openConversation(id: string) {
    setActive(id); setSidebar(false); setError(""); setLoadingChat(true);
    try {
      const data = await requestJson(`/api/conversations/${id}`);
      setMessages(data.messages ?? []);
    } catch (requestError) { handleRequestError(requestError); }
    finally { setLoadingChat(false); }
  }

  async function createConversation() {
    try {
      const data = await requestJson("/api/conversations", { method: "POST" });
      if (!data.conversation) throw new Error("No pudimos iniciar una conversación.");
      const conversation = data.conversation;
      setConversations(current => [conversation, ...current]);
      setActive(conversation.id); setMessages([]); setSidebar(false); setError("");
      window.setTimeout(() => textareaRef.current?.focus(), 50);
      return conversation.id;
    } catch (requestError) { handleRequestError(requestError); return null; }
  }

  async function removeConversation(id: string) {
    if (!window.confirm("¿Eliminar esta conversación de forma permanente? Esta acción no se puede deshacer.")) return;
    try {
      await requestJson(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations(current => current.filter(item => item.id !== id));
      if (active === id) { setActive(null); setMessages([]); }
      setNotice("Conversación eliminada");
    } catch (requestError) { handleRequestError(requestError); }
  }

  async function renameConversation(item: Conversation) {
    const title = window.prompt("Nuevo nombre de la conversación", item.title)?.trim();
    if (!title || title === item.title) return;
    try {
      await requestJson(`/api/conversations/${item.id}`, { method: "PATCH", body: JSON.stringify({ title }) });
      setConversations(current => current.map(conversation => conversation.id === item.id ? { ...conversation, title: title.slice(0, 80) } : conversation));
      setNotice("Nombre actualizado");
    } catch (requestError) { handleRequestError(requestError); }
  }

  async function send(event?: FormEvent, retry?: Message) {
    event?.preventDefault();
    const text = (retry?.content ?? input).trim();
    if (!text || loading) return;
    let conversationId = active;
    if (!conversationId) conversationId = await createConversation();
    if (!conversationId) return;
    const temporaryId = retry?.id ?? `temp-${crypto.randomUUID()}`;
    if (retry) setMessages(current => current.map(item => item.id === temporaryId ? { ...item, failed: false } : item));
    else { setInput(""); setMessages(current => [...current, { id: temporaryId, role: "user", content: text, important: false }]); }
    resizeComposer(); setError(""); setLoading(true);
    try {
      const clientMessageId = temporaryId.startsWith("temp-") ? temporaryId.slice(5) : temporaryId;
      const data = await requestJson("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId, message: text, clientMessageId }) });
      if (!data.userMessage || !data.message || !data.title) throw new Error("Nora no devolvió una respuesta completa. Inténtalo otra vez.");
      const savedUserMessage = data.userMessage, answer = data.message, title = data.title;
      setMessages(current => [...current.map(item => item.id === temporaryId ? savedUserMessage : item), answer]);
      setConversations(current => current.map(item => item.id === conversationId ? { ...item, title, updatedAt: Date.now() } : item).sort((a, b) => b.updatedAt - a.updatedAt));
      if (data.remembered) setNotice("Lo guardé en tus recuerdos. Puedes revisarlo en Configuración.");
    } catch (requestError) {
      setMessages(current => current.map(item => item.id === temporaryId ? { ...item, failed: true } : item));
      handleRequestError(requestError);
    } finally { setLoading(false); }
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && profile.enterToSend && !event.nativeEvent.isComposing) {
      event.preventDefault(); event.currentTarget.form?.requestSubmit();
    }
  }

  function resizeComposer() {
    window.requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
    });
  }

  async function saveSetting<K extends keyof Profile>(key: K, value: Profile[K]) {
    const previous = profile[key];
    setProfile(current => ({ ...current, [key]: value }));
    try { await requestJson("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) }); }
    catch (requestError) { setProfile(current => ({ ...current, [key]: previous })); handleRequestError(requestError); }
  }

  async function saveProfile() {
    try {
      const data = await requestJson("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileDraft) });
      if (data.profile) setProfile(current => ({ ...current, ...data.profile }));
      setNotice("Perfil guardado");
    } catch (requestError) { handleRequestError(requestError); }
  }

  async function toggleImportant(message: Message) {
    if (!message.id || message.id.startsWith("temp-")) return;
    const important = !message.important;
    setMessages(current => current.map(item => item.id === message.id ? { ...item, important } : item));
    try {
      await requestJson(`/api/messages/${message.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ important }) });
      setNotice(important ? "Momento guardado para dar continuidad" : "Momento retirado");
    } catch (requestError) {
      setMessages(current => current.map(item => item.id === message.id ? { ...item, important: !important } : item));
      handleRequestError(requestError);
    }
  }

  async function showSettings(tab: SettingsTab = "profile") {
    setSettingsTab(tab); setSettings(true); setSidebar(false);
    if (tab === "memory" && memories.length === 0) {
      try { const data = await requestJson("/api/memories"); setMemories(data.memories ?? []); }
      catch (requestError) { handleRequestError(requestError); }
    }
  }

  async function addMemory(event: FormEvent) {
    event.preventDefault();
    if (!memoryText.trim()) return;
    try {
      const data = await requestJson("/api/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: memoryText, category: memoryCategory }) });
      if (!data.memory) throw new Error("No pudimos guardar el recuerdo.");
      const memory = data.memory;
      setMemories(current => [memory, ...current]); setMemoryText(""); setNotice("Recuerdo añadido");
    } catch (requestError) { handleRequestError(requestError); }
  }

  async function deleteMemory(id: string) {
    try { await requestJson(`/api/memories/${id}`, { method: "DELETE" }); setMemories(current => current.filter(item => item.id !== id)); setNotice("Recuerdo eliminado"); }
    catch (requestError) { handleRequestError(requestError); }
  }

  async function copyMessage(content: string) {
    try { await navigator.clipboard.writeText(content); setNotice("Mensaje copiado"); }
    catch { setError("Tu navegador no permitió copiar el mensaje."); }
  }

  function exportConversation() {
    if (!messages.length) return;
    const text = messages.map(item => `${item.role === "assistant" ? "Nora" : "Tú"}:\n${item.content}`).join("\n\n");
    downloadText(`${safeFileName(activeConversation?.title || "conversacion-nora")}.txt`, text);
  }

  async function deleteAccount() {
    if (!window.confirm("Esto eliminará para siempre tu perfil, recuerdos y todas las conversaciones. ¿Deseas continuar?")) return;
    if (!window.confirm("Última confirmación: esta acción no se puede deshacer.")) return;
    try { await requestJson("/api/account", { method: "DELETE" }); window.location.href = "/"; }
    catch (requestError) { handleRequestError(requestError); }
  }

  function handleRequestError(requestError: unknown) {
    const message = requestError instanceof Error ? requestError.message : "Algo no salió bien. Inténtalo nuevamente.";
    if (message === "AUTH_REQUIRED") { window.location.href = "/login?returnTo=/chat"; return; }
    setError(message);
  }

  return <div className="chat-shell">
    <button className={sidebar ? "sidebar-scrim visible" : "sidebar-scrim"} onClick={() => setSidebar(false)} aria-label="Cerrar menú"/>
    <aside className={sidebar ? "sidebar open" : "sidebar"} aria-label="Historial de conversaciones">
      <div className="side-brand"><Link href="/"><span className="logo-mark">n</span><b>nora</b></Link><button onClick={() => setSidebar(false)} aria-label="Cerrar menú">×</button></div>
      <button className="new-chat" onClick={createConversation}><span>＋</span> Nueva conversación</button>
      <label className="chat-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar conversaciones" aria-label="Buscar conversaciones"/></label>
      <div className="history"><small>CONVERSACIONES</small>{filteredConversations.length === 0 ? <p className="empty-history">{search ? "No encontramos coincidencias." : "Aquí aparecerán tus conversaciones."}</p> : filteredConversations.map(item => <div className={active === item.id ? "history-item active" : "history-item"} key={item.id}><button className="history-open" onClick={() => openConversation(item.id)} title={item.title}>{item.title}</button><button className="history-action" onClick={() => renameConversation(item)} aria-label={`Cambiar nombre de ${item.title}`}>✎</button><button className="history-action delete" onClick={() => removeConversation(item.id)} aria-label={`Eliminar ${item.title}`}>×</button></div>)}</div>
      <div className="side-links"><Link href="/companion"><span>♡</span> Mi compañero</Link><button onClick={() => showSettings("memory")}><span>◇</span> Recuerdos</button><button onClick={() => showSettings("privacy")}><span>⌁</span> Privacidad</button></div>
      <div className="account"><button onClick={() => showSettings()}><span>{profile.displayName.charAt(0).toUpperCase()}</span><div><b>{profile.displayName}</b><small>Perfil y configuración</small></div><i>•••</i></button></div>
    </aside>

    <main className="chat-main">
      <header className="chat-top"><button className="mobile-menu" onClick={() => setSidebar(true)} aria-label="Abrir menú">☰</button><span><b>{activeConversation?.title || "Nora"}</b><small><i/> apoyo emocional con IA</small></span><div className="top-actions">{messages.length > 0 && <button onClick={exportConversation} title="Exportar conversación" aria-label="Exportar conversación">⇩</button>}<button className="profile-button" onClick={() => showSettings()} aria-label="Abrir configuración">{profile.displayName.charAt(0).toUpperCase()}</button></div></header>
      <section className="conversation" aria-live="polite">
        {loadingChat ? <div className="chat-loading"><span className="logo-mark large">n</span><p>Abriendo tu conversación…</p></div> : messages.length === 0 ? <div className="welcome"><span className="welcome-kicker">UN LUGAR PARA HABLAR SIN JUICIOS</span><span className="logo-mark large">n</span><h1>Hola, {profile.displayName.split(" ")[0]}.</h1><p>No hace falta ordenar todo antes de empezar. Cuéntame qué está pasando y lo vemos a tu ritmo.</p><div className="suggestions">{["Necesito desahogarme", "Hoy me pasó algo", "Quiero entender lo que siento", "Solo necesito compañía un rato"].map(suggestion => <button key={suggestion} onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}>{suggestion}<span>→</span></button>)}</div><button className="memory-status" onClick={() => showSettings("memory")}><span>{profile.memoryEnabled ? "●" : "○"}</span>{profile.memoryEnabled ? "Memoria bajo tu control" : "Memoria desactivada"}</button></div> : <div className="message-list">{messages.map((message, index) => <article className={`app-message ${message.role}${message.failed ? " failed" : ""}`} key={message.id ?? index}>{message.role === "assistant" && <span className="logo-mark small">n</span>}<div><div className="message-head"><b>{message.role === "assistant" ? "Nora" : "Tú"}</b>{message.createdAt && <time>{formatTime(message.createdAt)}</time>}</div><p>{message.content}</p><div className="message-actions"><button onClick={() => copyMessage(message.content)} aria-label="Copiar mensaje" title="Copiar">□</button><button className={message.important ? "saved" : ""} onClick={() => toggleImportant(message)} aria-label={message.important ? "Quitar de momentos importantes" : "Guardar como momento importante"} title={message.important ? "Quitar de recuerdos" : "Recordar"}>{message.important ? "★" : "☆"}</button>{message.failed && <button className="retry" onClick={() => send(undefined, message)}>Reintentar</button>}</div></div></article>)}{loading && <article className="app-message assistant thinking-message"><span className="logo-mark small">n</span><div><b>Nora</b><p className="dots"><i/><i/><i/><span>Estoy leyendo con atención…</span></p></div></article>}<div ref={endRef}/></div>}
      </section>
      <div className="composer-wrap">{error && <div className="app-error" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Cerrar mensaje">×</button></div>}{notice && <div className="app-notice" role="status">{notice}</div>}<form className="composer" onSubmit={event => send(event)}><textarea ref={textareaRef} value={input} onChange={event => { setInput(event.target.value); resizeComposer(); }} onKeyDown={handleComposerKey} maxLength={4000} placeholder="Escribe lo que estás sintiendo…" rows={1} aria-label="Mensaje para Nora"/><div className="composer-side">{input.length > 3500 && <small>{4000 - input.length}</small>}<button disabled={!input.trim() || loading} aria-label="Enviar mensaje">↑</button></div></form><small>Nora puede equivocarse y no sustituye atención profesional. Si estás en peligro inmediato, contacta los servicios de emergencia de tu país.</small></div>
    </main>

    {settings && <div className="modal-backdrop"><button className="modal-dismiss-layer" onClick={() => setSettings(false)} aria-label="Cerrar configuración"/><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header><div><span>CONFIGURACIÓN</span><h2 id="settings-title">Tu espacio</h2><p>Tú decides cómo se ve, responde y recuerda Nora.</p></div><button onClick={() => setSettings(false)} aria-label="Cerrar configuración">×</button></header><nav className="settings-tabs" aria-label="Secciones de configuración">{([['profile','Perfil'],['nora','Nora'],['appearance','Apariencia'],['memory','Memoria'],['privacy','Privacidad']] as [SettingsTab,string][]).map(([tab,label]) => <button key={tab} className={settingsTab === tab ? "active" : ""} onClick={() => showSettings(tab)}>{label}</button>)}</nav><div className="settings-content">
      {settingsTab === "profile" && <section className="settings-pane"><div className="profile-card"><span>{profile.displayName.charAt(0).toUpperCase()}</span><div><b>{profile.displayName}</b><small>{profile.email}</small></div></div><label>Nombre que verá Nora<input value={profileDraft.displayName} onChange={event => setProfileDraft(current => ({ ...current, displayName: event.target.value }))} maxLength={60}/></label><label>Pronombres o forma de trato <small>Opcional</small><input value={profileDraft.pronouns} onChange={event => setProfileDraft(current => ({ ...current, pronouns: event.target.value }))} maxLength={40} placeholder="Por ejemplo: ella, él, elle o mi nombre"/></label><label>Algo que quieras que Nora sepa <small>Opcional · máximo 500 caracteres</small><textarea value={profileDraft.aboutMe} onChange={event => setProfileDraft(current => ({ ...current, aboutMe: event.target.value }))} maxLength={500} rows={4} placeholder="Contexto general que pueda ayudarte a no repetirlo cada vez"/></label><button className="settings-primary" onClick={saveProfile}>Guardar perfil</button></section>}
      {settingsTab === "nora" && <section className="settings-pane"><label>Cómo quieres que te acompañe<select value={profile.tone} onChange={event => saveSetting("tone", event.target.value)}><option value="warm">Cercana y natural</option><option value="reflective">Reflexiva y pausada</option><option value="gentle">Especialmente tierna</option><option value="direct">Clara y directa</option></select></label><label>Profundidad de las respuestas<select value={profile.responseLength} onChange={event => saveSetting("responseLength", event.target.value)}><option value="brief">Breves</option><option value="balanced">Equilibradas</option><option value="deep">Más profundas</option></select></label><Toggle label="Usar recuerdos" help="Nora podrá usar solo los recuerdos y momentos que tú hayas elegido." checked={profile.memoryEnabled} onChange={value => saveSetting("memoryEnabled", value)}/><div className="settings-note"><span>♡</span><p><b>Primero escuchar</b>Nora está configurada para comprender antes de proponer ejercicios o consejos. Puedes decirle “solo escúchame” en cualquier momento.</p></div></section>}
      {settingsTab === "appearance" && <section className="settings-pane settings-grid"><label>Apariencia<select value={profile.theme} onChange={event => saveSetting("theme", event.target.value)}><option value="system">La del dispositivo</option><option value="light">Modo claro</option><option value="dark">Modo oscuro</option></select></label><label>Tamaño del texto<select value={profile.fontSize} onChange={event => saveSetting("fontSize", event.target.value)}><option value="small">Pequeño</option><option value="medium">Mediano</option><option value="large">Grande</option></select></label><label>Ancho de conversación<select value={profile.chatWidth} onChange={event => saveSetting("chatWidth", event.target.value)}><option value="compact">Compacto</option><option value="comfortable">Cómodo</option><option value="wide">Amplio</option></select></label><Toggle label="Alto contraste" help="Bordes y textos más definidos." checked={profile.highContrast} onChange={value => saveSetting("highContrast", value)}/><Toggle label="Reducir animaciones" help="Una experiencia visual más tranquila." checked={profile.reduceMotion} onChange={value => saveSetting("reduceMotion", value)}/><Toggle label="Enter para enviar" help="Desactívalo si prefieres usar siempre el botón." checked={profile.enterToSend} onChange={value => saveSetting("enterToSend", value)}/></section>}
      {settingsTab === "memory" && <section className="settings-pane"><div className="memory-intro"><span>◇</span><div><h3>Recuerdos transparentes</h3><p>Nora solo usa esta lista y los mensajes que marques con ☆. Puedes apagar la memoria sin borrar nada.</p></div></div><form className="memory-form" onSubmit={addMemory}><select value={memoryCategory} onChange={event => setMemoryCategory(event.target.value)} aria-label="Tipo de recuerdo"><option value="personal">Sobre mí</option><option value="support">Algo que me ayuda</option><option value="goal">Un objetivo</option><option value="boundary">Algo que prefiero evitar</option></select><div><input value={memoryText} onChange={event => setMemoryText(event.target.value)} maxLength={240} placeholder="Ej.: Cuando estoy ansioso prefiero preguntas cortas"/><button disabled={!memoryText.trim()} aria-label="Añadir recuerdo">＋</button></div></form><p className="memory-hint">También puedes escribir en el chat “recuerda que…” y Nora lo añadirá aquí.</p><div className="memory-list">{memories.length === 0 ? <div className="empty-memory"><span>○</span><p>Aún no hay recuerdos. Nora seguirá usando únicamente el contexto de la conversación actual.</p></div> : memories.map(memory => <article key={memory.id}><span>{MEMORY_LABELS[memory.category] ?? "Recuerdo"}</span><p>{memory.content}</p><button onClick={() => deleteMemory(memory.id)} aria-label="Eliminar recuerdo">×</button></article>)}</div></section>}
      {settingsTab === "privacy" && <section className="settings-pane"><div className="privacy-card"><h3>Tu información, bajo tu control</h3><p>Guardamos tu perfil, preferencias, recuerdos y chats para mantener continuidad. Cuando Nora responde, enviamos al proveedor de IA el mensaje, el contexto reciente y los recuerdos activados. No compartas contraseñas, documentos, direcciones ni información que no quieras procesar.</p></div><Link className="data-action" href="/companion"><span>♡</span><div><b>Privacidad de mi compañero</b><small>Decide qué puede usar Nora, la mascota y las observaciones mensuales.</small></div></Link><a className="data-action" href="/api/account" download><span>⇩</span><div><b>Descargar mis datos</b><small>Recibe perfil, mascota, álbum, autocuidado, recuerdos y conversaciones en JSON.</small></div></a><button className="data-action" onClick={exportConversation} disabled={!messages.length}><span>□</span><div><b>Exportar conversación actual</b><small>Guárdala como un archivo de texto.</small></div></button><a className="signout" href="/api/auth/logout?returnTo=/">Cerrar sesión</a><div className="danger-zone"><h3>Zona de cuidado</h3><p>Eliminar tu cuenta borra permanentemente el perfil, recuerdos, mascota, álbum, autocuidado y chats de Nora.</p><button onClick={deleteAccount}>Eliminar mi cuenta y mis datos</button></div></section>}
    </div></section></div>}
  </div>;
}

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-label"><span><b>{label}</b><small>{help}</small></span><input type="checkbox" aria-label={label} checked={checked} onChange={event => onChange(event.target.checked)}/></label>;
}

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({})) as ApiData;
  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Algo no salió bien. Inténtalo nuevamente.");
  return data;
}

function formatTime(timestamp: number) { return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }
function safeFileName(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "conversacion-nora"; }
function downloadText(filename: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
