# Reglas del Proyecto Mixtape

- **Commit automático:** Tras cualquier cambio de código verificado con `npm run build`, haz siempre `git add` y `git commit` automáticamente (y `git push origin main` si no requiere inicio de sesión interactivo). Respeta las excepciones cuando el usuario pida explícitamente "solo investiga" o "no cambies nada".
- **Control e informe de versión:** Con cada cambio en la app, incrementa la versión en `package.json` y `src/version.ts` (incluido `APP_BUILD`) e informa claramente del nuevo número de versión al responder al usuario.
