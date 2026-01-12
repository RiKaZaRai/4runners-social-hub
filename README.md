# 4runners-social-hub

Monorepo simple pour l'agence social media (Next.js 14 App Router, Prisma, BullMQ, MinIO).

## Demarrage rapide

```bash
pnpm install
cp .env.example .env

docker compose up -d
pnpm prisma migrate dev
pnpm prisma:seed
pnpm dev
```

Dans un autre terminal pour les jobs:

```bash
pnpm worker
```

## Comptes dev

- Admin agence: `admin@4runners.local` / `admin123`
- Client token: `client-token-123`

## Services locaux

- App: http://localhost:3000
- MinIO: http://localhost:9001 (minioadmin / minioadmin)
  - Creer le bucket `4runners-media` si besoin.

## Scripts utiles

- `pnpm prisma:migrate`
- `pnpm prisma:seed`
- `pnpm worker`
- `pnpm test`

## Notes V1

- Auth simple (password ou token client). Magic link dev via formulaire.
- Jobs BullMQ: publish, delete_remote, sync_comments (placeholder).
- Upload media via API server (MinIO interne). Les assets sont servis via `/api/assets/:id`.

## Deploiement Dokploy (Docker Compose)

- Utiliser `docker-compose.prod.yml` pour un stack tout-in-one.
- Configurer le service `app` avec le domaine `octopus.digital-jungle.fr`.
- Lancer apres deploy: `pnpm prisma migrate deploy` (et `pnpm prisma:seed` une seule fois).
