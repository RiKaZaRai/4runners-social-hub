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
- Option admin d'agence via `ADMIN_LOGIN` / `ADMIN_PASSWORD` (override).

## Deploiement Dokploy (Docker Compose)

- Utiliser `docker-compose.prod.yml` pour un stack tout-in-one.
- Configurer le service `app` avec le domaine `octopus.digital-jungle.fr`.
- Lancer apres deploy: `pnpm prisma:seed` une seule fois (les migrations sont lancees au boot de `app`).

Generer des secrets (recommande):

```bash
./scripts/generate-secrets.sh
```

Variables recommandees (Dokploy secrets):

```
APP_URL=https://octopus.digital-jungle.fr
POSTGRES_USER=octopus
POSTGRES_PASSWORD=change-me-very-long
POSTGRES_DB=octopus
MINIO_ROOT_USER=octopus-minio
MINIO_ROOT_PASSWORD=change-me-very-long
MINIO_BUCKET=octopus-media
MINIO_REGION=us-east-1
```

## Email (SMTP)

- **Variables requises** (voir `.env.example` pour les valeurs exemples) :  
  `MAIL_PROVIDER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`,  
  `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`, `MAIL_REPLY_TO`.
- **Ne jamais exposer `MAIL_PASS`** dans l’UI ou les logs (seuls `provider`, `host`, `port`, `secure` et `from` sont affichés).
- **Tester la configuration** depuis l’espace admin :
  1. Aller dans `/settings`, cliquer sur la carte “Email (SMTP)”.
 2. Vérifier la carte de statut (provider, host, from, reply-to, domaine).
 3. Saisir une adresse de test et lancer “Envoyer un email de test”.
 4. L’envoi est limité à 3 essais par 10 minutes pour chaque admin.
- **Endpoint API** :
  - `POST /api/admin/email/test` `{ to: string }`
  - 403 si l’utilisateur n’est pas admin agence.
  - 400 si l’email est invalide.
  - 500 / `MAIL_NOT_CONFIGURED` si la configuration manque.
  - Retour JSON `{ ok: true }` sur succès.
