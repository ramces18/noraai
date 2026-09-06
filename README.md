# Nora

Nora es una aplicación de acompañamiento emocional con inteligencia artificial creada por Gerard Ramces Bollard Gonzalez por el Mes de la Prevención del Suicidio.

La aplicación ofrece conversaciones persistentes, memoria controlada por el usuario, personalización visual y de respuesta, acceso con Google o correo, exportación de datos y una interfaz adaptable a celular y computadora. Nora no es un servicio clínico ni de emergencias.

## Tecnología

- React 19 y vinext
- Cloudflare Workers
- Cloudflare D1 con Drizzle ORM
- OpenRouter para las respuestas de IA
- OAuth 2.0 de Google y acceso con correo/contraseña

## Desarrollo

Requiere Node.js 22.13 o posterior.

```bash
pnpm install
pnpm run dev
```

Las variables locales viven en `.env` y nunca deben guardarse en Git:

```dotenv
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENROUTER_API_KEY=
```

## Verificación

```bash
pnpm run lint
pnpm test
```

## Base de datos y despliegue

Antes de publicar código que dependa de columnas nuevas, aplica las migraciones en producción:

```bash
pnpm exec wrangler d1 migrations apply nora-db --remote
pnpm run deploy
```

Los secretos de producción se configuran con `wrangler secret put`. El dominio público actual es `https://noraai.qzz.io` y el callback autorizado de Google es:

```text
https://noraai.qzz.io/api/auth/callback/google
```

## Memoria y privacidad

Nora utiliza el contexto reciente de cada conversación. La memoria entre conversaciones solo se activa con recuerdos añadidos por el usuario, frases explícitas como “recuerda que…” o mensajes marcados con una estrella. Todo puede revisarse, desactivarse, exportarse o eliminarse desde Configuración.
