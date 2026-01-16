# 4runners-social-hub

Monorepo simple pour l'agence social media (Next.js 16 App Router, Prisma 7, BullMQ, MinIO).

## Stack

- **Node.js 24 / Next.js 16 + React 19** avec App Router et composants dédiés.
- **Prisma 7** + PostgreSQL 18 (via `DATABASE_URL`) pour les données.
- **Redis 8** et **BullMQ** pour les jobs/queues, couplés à MinIO (AWS SDK S3).
- **Tailwind CSS 3** compilé au build (PostCSS + config `tailwind.config.ts` + `app/globals.css`).

## Demarrage rapide

```bash
npm install
cp .env.example .env

docker compose up -d
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Dans un autre terminal pour les jobs:

```bash
npm run worker
```

## Comptes dev

- Admin agence: `admin@4runners.local` / `admin123`
- Client token: `client-token-123`

## Services locaux

- App: http://localhost:3000
- MinIO: http://localhost:9001 (minioadmin / minioadmin)
  - Creer le bucket `4runners-media` si besoin.

## Scripts utiles

- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run worker`
- `npm run test`

## Notes V1

- Auth simple (password ou token client). Magic link dev via formulaire.
- Jobs BullMQ: publish, delete_remote, sync_comments (placeholder).
- Upload media via API server (MinIO interne). Les assets sont servis via `/api/assets/:id`.
- Option admin d'agence via `ADMIN_LOGIN` / `ADMIN_PASSWORD` (override).

## Deploiement Dokploy (Docker Compose)

- Utiliser `docker-compose.prod.yml` pour un stack tout-in-one.
- Configurer le service `app` avec le domaine `octopus.digital-jungle.fr`.
- Lancer apres deploy: `npm run prisma:seed` une seule fois (les migrations sont lancees au boot de `app`).

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

## Modules & Réseaux (espace client)

- Accessible via `/spaces/[spaceId]/settings` (agency_admin/agency_manager uniquement).
- **Modules** : messages / social / docs / projects / planning.
  - Chaque module peut être activé/désactivé individuellement (mise à jour immédiate).
  - Les routes et menus sont verrouillés côté serveur quand `hasModule(spaceId, module)` retourne `false`.
- **Réseaux (statut)** :
  - Enregistrez les handles Instagram, Facebook et LinkedIn ainsi qu’une note interne.
  - L’état “configured” est dérivé (true si un handle/page est renseigné).
  - Les robots de validation (posts/comments) peuvent se baser sur la présence de ces handles pour autoriser certaines actions.
- **API** : `GET|PATCH /api/spaces/[spaceId]/settings` gère modules + réseaux. Les patchs sont validés par Zod et bloqués pour les rôles clients.

## Workflow Réseaux (validation)

- Le module `social` expose une page dédiée `/spaces/[spaceId]/social` (menu visible uniquement quand `hasModule(spaceId, 'social')` est vrai).
- L’agence utilise l’écran “En validation” pour envoyer un post (statut `draft` ou `changes_requested`) vers le client, via `POST /api/spaces/[spaceId]/social/posts/[postId]/send-for-approval`.
- Le client peut consulter le post, demander une modification (`POST .../request-changes` avec commentaire) ou l’approuver (`POST .../approve`), uniquement quand le statut est `pending_client`.
- Chaque transition crée une notification dans l’Inbox (`type=validation` / `message` / `signal` selon le cas) avec un `entityKey` stable pour éviter les doublons.
- La page détail `/spaces/[spaceId]/social/posts/[postId]` affiche le contenu, le fil de commentaires et les actions autorisées selon le rôle (agence ou client).
