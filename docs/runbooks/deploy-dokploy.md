# Déploiement Dokploy (Runbook)

## Pré-requis
- pnpm build OK en local
- migrations Prisma prêtes (si besoin)

## Étapes standard
1) Push sur la branche de déploiement
2) Dokploy build & deploy
3) Vérifier healthcheck /api/health
4) Vérifier logs app + worker

## Zero downtime
- App replicas >= 2
- Healthcheck actif
- Worker replicas = 1

## Migrations
- À lancer avant ou pendant le deploy
- Toujours backward compatible
- Ne jamais bloquer l’app en prod
