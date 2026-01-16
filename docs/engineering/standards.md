# Standards Engineering

## Architecture
- Next.js App Router
- API routes server-side only
- BullMQ pour jobs async

## RBAC
- Toujours vérifié côté serveur
- Aucun accès basé uniquement sur l’UI

## Modules
- Module OFF = menu caché + routes bloquées + API bloquée
- ensureModuleEnabled obligatoire dans chaque handler

## Inbox
- Event-driven
- entityKey stable
- Déduplication obligatoire
