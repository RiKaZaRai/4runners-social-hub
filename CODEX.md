# Instructions Codex – 4Runners Social Hub

## Objectif produit
Outil interne agence : simple, rapide, orienté production.
Ce n’est PAS un ClickUp / Notion / Slack bis.
Inbox event-driven = cœur du produit.

## Process obligatoire pour toute nouvelle feature
1) Lire / créer la PRD dans /PRD/<feature>.md
2) Proposer un plan technique dans /PRD/<feature>.tech.md
3) Attendre validation avant implémentation
4) Implémenter sans refacto global
5) Vérifier AVANT de conclure :
   - pnpm test
   - pnpm build

⚠️ Ne jamais dire “OK prod” si pnpm build échoue.

## Périmètre de modification
- Modifier UNIQUEMENT les fichiers nécessaires à la feature.
- Pas de refacto global sans demande explicite.
- Toute incohérence hors scope doit être signalée, pas corrigée.

## Règles techniques
- Multi-tenant strict (tenantId / spaceId)
- RBAC côté serveur (jamais uniquement UI)
- Module gating : ensureModuleEnabled en haut de chaque page/API
- Prisma : migrations backward compatible uniquement
- Ne jamais logguer de secrets ou tokens

## Validation UX minimale
Avant de conclure :
- Le flux principal est-il faisable en < 3 clics ?
- L’action principale est-elle immédiatement visible ?
- L’utilisateur comprend-il quoi faire sans documentation ?

## Déploiement
- Ne jamais conclure “OK prod” sans pnpm build OK
- Signaler explicitement toute migration DB nécessaire

## Sortie attendue
Toute réponse finale DOIT contenir :
- Résumé clair (OK / bloquant)
- Liste des fichiers modifiés
- Checklist smoke-test (5 étapes max)

## Commandes utiles
- pnpm test
- pnpm build
- pnpm verify
