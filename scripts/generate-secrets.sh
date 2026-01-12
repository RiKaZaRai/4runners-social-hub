#!/usr/bin/env bash
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate secrets" >&2
  exit 1
fi

APP_URL="${APP_URL:-https://octopus.digital-jungle.fr}"

POSTGRES_USER="${POSTGRES_USER:-octopus}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 24)}"
POSTGRES_DB="${POSTGRES_DB:-octopus}"

MINIO_ROOT_USER="${MINIO_ROOT_USER:-octopus-minio}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-$(openssl rand -hex 24)}"
MINIO_BUCKET="${MINIO_BUCKET:-octopus-media}"
MINIO_REGION="${MINIO_REGION:-us-east-1}"

ADMIN_LOGIN="${ADMIN_LOGIN:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -hex 16)}"

cat <<EOF
# Paste these into Dokploy Environment (app + worker where relevant)
APP_URL=${APP_URL}

POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

REDIS_URL=redis://redis:6379

MINIO_ROOT_USER=${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_BUCKET=${MINIO_BUCKET}
MINIO_REGION=${MINIO_REGION}

ADMIN_LOGIN=${ADMIN_LOGIN}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
