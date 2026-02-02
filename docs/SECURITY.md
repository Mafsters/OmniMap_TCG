# Security notes

## Environment and secrets

- **API keys and env vars**: Use `.env` or `.env.local` for `GEMINI_API_KEY`, `VITE_GOOGLE_CLIENT_ID`, etc. Never commit these files. See [.env.example](.env.example) for required variables.
- **Build-time injection**: Vite injects `GEMINI_API_KEY` at build time; keep production builds and env files restricted.

## localStorage and integration config

The app stores the following in the browser’s **localStorage** (same origin):

- Google Apps Script Web App URL (sync backend)
- HiBob, Jira, Workable, and Salesforce configuration (tokens, URLs, etc.)

**Implications:**

- Any script running on the same origin (e.g. browser extensions, XSS) can read these values.
- Use the app only on trusted devices and networks.
- Do not rely on localStorage for highly sensitive secrets; treat it as “semi-trusted” configuration storage.

## Logging

- In production, the Google Sheets sync service logs only the **action type** for each request, not the full payload (which may contain tokens or config). Full payloads are logged only in development (`import.meta.env.DEV`).
