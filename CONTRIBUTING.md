# Contributing – 4Runners Social Hub

## Workflow
- Toute feature significative doit avoir une PRD validée
- Une PR = une feature
- Pas de refacto global non demandé

## Avant chaque push
- pnpm test
- pnpm build

## Base de données (Prisma)
- Migrations backward compatible uniquement
- Toute migration doit être signalée dans la PR
- Pas de suppression de colonne sans plan de rollback

## Sécurité
- RBAC toujours côté serveur
- Aucun secret ou token dans les logs
