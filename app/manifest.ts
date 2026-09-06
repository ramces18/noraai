import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nora — Apoyo emocional",
    short_name: "Nora",
    description: "Un espacio de acompañamiento emocional con inteligencia artificial.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#f8f8f6",
    theme_color: "#111111",
    lang: "es",
    orientation: "portrait-primary",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
