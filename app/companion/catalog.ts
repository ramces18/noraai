export const PET_TYPES = [
  { value: "cat", label: "Gato" },
  { value: "dog", label: "Perro" },
  { value: "rabbit", label: "Conejo" },
  { value: "fox", label: "Zorro" },
] as const;

export const APPEARANCES = [
  { value: "ink", label: "Tinta", color: "#252525", accent: "#f3f0e9" },
  { value: "cream", label: "Crema", color: "#d5c5a6", accent: "#463e34" },
  { value: "mist", label: "Niebla", color: "#9da5aa", accent: "#24282b" },
  { value: "cocoa", label: "Cacao", color: "#745548", accent: "#f7ede4" },
] as const;

export const ACCESSORIES = [
  { value: "none", label: "Sin accesorio" },
  { value: "scarf", label: "Bufanda" },
  { value: "bandana", label: "Pañuelo" },
  { value: "flower", label: "Flor" },
] as const;

export const PERSONALITIES = [
  { value: "calm", label: "Tranquila", description: "Acompaña con calma y espacio." },
  { value: "curious", label: "Curiosa", description: "Hace preguntas suaves de vez en cuando." },
  { value: "gentle", label: "Tierna", description: "Se comunica con especial delicadeza." },
  { value: "playful", label: "Ligera", description: "Añade pequeños gestos alegres, sin quitar seriedad." },
] as const;

export const COMMUNICATION_STYLES = [
  { value: "words", label: "Frases cálidas" },
  { value: "brief", label: "Muy pocas palabras" },
  { value: "silent", label: "Solo gestos" },
] as const;

export const CARE_ACTIVITIES = [
  { value: "sleep", icon: "☾", label: "Dormí bien" },
  { value: "walk", icon: "↗", label: "Salí a caminar" },
  { value: "exercise", icon: "◇", label: "Moví mi cuerpo" },
  { value: "eat", icon: "◒", label: "Comí algo" },
  { value: "water", icon: "◌", label: "Tomé agua" },
  { value: "connect", icon: "◎", label: "Hablé con alguien" },
  { value: "leave_room", icon: "□", label: "Salí de mi habitación" },
  { value: "journal", icon: "✎", label: "Escribí cómo me sentía" },
  { value: "offline", icon: "⊘", label: "Me alejé de las redes" },
  { value: "joy", icon: "✦", label: "Hice algo que me gusta" },
  { value: "ask_help", icon: "♡", label: "Pedí ayuda" },
  { value: "rest", icon: "≈", label: "Descansé cuando lo necesitaba" },
  { value: "regulate_impulse", icon: "△", label: "Logré atravesar un impulso" },
  { value: "reduce_habit", icon: "↘", label: "Reduje una conducta que quiero dejar" },
  { value: "small_goal", icon: "·", label: "Cumplí una pequeña meta" },
] as const;

export const EMOTIONS = [
  { value: "difficult", label: "Día difícil" },
  { value: "sad", label: "Tristeza" },
  { value: "anxious", label: "Ansiedad" },
  { value: "stressed", label: "Estrés" },
  { value: "angry", label: "Enojo" },
  { value: "lonely", label: "Soledad" },
  { value: "tired", label: "Cansancio" },
  { value: "calm", label: "Calma" },
  { value: "hopeful", label: "Esperanza" },
  { value: "proud", label: "Orgullo" },
] as const;

export const GENTLE_ACTIONS = [
  { value: "pause", icon: "○", label: "Hacer una pausa de 2 minutos" },
  { value: "write", icon: "✎", label: "Escribir cómo me siento" },
  { value: "walk", icon: "↗", label: "Caminar un poco" },
  { value: "talk", icon: "◎", label: "Hablar con alguien" },
  { value: "relax", icon: "≈", label: "Probar una relajación breve" },
  { value: "water", icon: "◌", label: "Tomar agua" },
  { value: "music", icon: "♪", label: "Escuchar algo que me guste" },
  { value: "rest", icon: "☾", label: "Prepararme para descansar" },
  { value: "stay", icon: "♡", label: "Solo quedarme aquí un momento" },
  { value: "nothing", icon: "—", label: "Ahora no quiero hacer nada" },
] as const;

export const ACTIVITY_LABELS = Object.fromEntries(CARE_ACTIVITIES.map(item => [item.value, item.label])) as Record<string, string>;
export const EMOTION_LABELS = Object.fromEntries(EMOTIONS.map(item => [item.value, item.label])) as Record<string, string>;

const CHECKIN_OPENERS: Record<string, string[]> = {
  difficult: ["Parece que hoy fue pesado.", "Hoy costó más.", "Este día tuvo una parte difícil.", "Podemos bajar el ritmo por ahora."],
  sad: ["Registraste tristeza hoy.", "Parece que hay tristeza presente.", "Podemos hacerle un poco de espacio a esta tristeza.", "No hace falta apresurar este momento."],
  anxious: ["Registraste ansiedad.", "Parece que hoy hubo inquietud.", "Podemos ir un momento a la vez.", "No tenemos que resolverlo todo de una vez."],
  stressed: ["Registraste estrés hoy.", "Parece que el día exigió bastante.", "Podemos hacer una pausa sin explicar nada.", "Por ahora, algo pequeño puede ser suficiente."],
  angry: ["Registraste enojo.", "Hay algo de este momento que te dio cólera.", "No tienes que quitarte el enojo de encima ahora mismo.", "Podemos dejar que el momento baje un poco de intensidad."],
  lonely: ["Registraste soledad.", "Parece que hoy se sintió solitario.", "Podemos quedarnos aquí un momento.", "No hace falta llenar el silencio enseguida."],
  tired: ["Registraste cansancio.", "Hoy quizá queda poca energía.", "Podemos elegir algo que no pida mucho.", "Descansar también puede ser lo que toca hoy."],
  calm: ["Registraste un momento de calma.", "Hoy hubo un poco de tranquilidad.", "Podemos guardar esta pausa sin exigirle nada más.", "Este momento tranquilo también forma parte del camino."],
  hopeful: ["Registraste esperanza.", "Hoy apareció algo de esperanza.", "Podemos reconocer este momento sin convertirlo en una obligación.", "Vale la pena guardar este pequeño cambio de aire."],
  proud: ["Registraste algo que te dio orgullo.", "Hoy reconociste algo propio.", "Podemos dejar que este momento tenga su lugar.", "Esto merece ser reconocido, sin compararlo con nada."],
};

const AUTONOMY_ENDINGS = [
  "No tenemos que arreglar todo ahora.", "Podemos hacer algo pequeño, si te sirve.", "También es válido no hacer nada por ahora.",
  "Tú decides qué sería amable contigo en este momento.", "Podemos continuar otro día desde aquí, no desde cero.",
  "Esto no borra nada de lo que ya has recorrido.", "No hay una forma perfecta de atravesar el día.",
  "Podemos quedarnos aquí un momento, sin convertirlo en una tarea.", "Descansar no requiere habérselo ganado.",
  "No estoy contando días perfectos; estoy acompañando días reales.", "Hoy no tiene que demostrar nada.",
  "Si quieres, elegimos lo que pida menos energía.", "Reconocerlo ya es suficiente por ahora.",
];

const CARE_ENDINGS = [
  "Queda reconocido, sin puntos ni exigencias.", "Fue una forma de cuidarte y eso cuenta.", "No tiene que repetirse mañana para que importe hoy.",
  "Lo guardamos como parte de un día real.", "Pequeño también cuenta.", "No lo convertiremos en una obligación.",
  "Tu progreso no depende de hacerlo todos los días.", "Esto se suma a tu camino; nada vuelve a cero.",
];

export function companionMessage(input: { kind: "checkin" | "care" | "moment"; emotion?: string; activity?: string; seed: string; style?: string }) {
  if (input.style === "silent") return "";
  const index = stableIndex(input.seed);
  if (input.kind === "care") {
    const label = ACTIVITY_LABELS[input.activity ?? ""] ?? "Hiciste algo para cuidarte";
    const short = `Queda reconocido: «${label.toLocaleLowerCase("es") }».`;
    return input.style === "brief" ? short : `${short} ${CARE_ENDINGS[index % CARE_ENDINGS.length]}`;
  }
  if (input.kind === "moment") {
    const reactions = ["Este momento ya tiene un lugar aquí.", "Lo guardamos con cuidado.", "Tu compañero se acomoda cerca de este recuerdo.", "Este recuerdo pasa a formar parte de la habitación.", "Podrás volver a él cuando tú quieras."];
    return reactions[index % reactions.length];
  }
  const openers = CHECKIN_OPENERS[input.emotion ?? "difficult"] ?? CHECKIN_OPENERS.difficult;
  const opener = openers[index % openers.length];
  return input.style === "brief" ? opener : `${opener} ${AUTONOMY_ENDINGS[Math.floor(index / 3) % AUTONOMY_ENDINGS.length]}`;
}

function stableIndex(seed: string) {
  return [...seed].reduce((total, character, index) => total + character.charCodeAt(0) * (index + 3), 0);
}
