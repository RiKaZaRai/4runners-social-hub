FROM node:24-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-bookworm-slim AS builder
ARG PRISMA_ALLOW_FALLBACK=true
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN PRISMA_ALLOW_FALLBACK=${PRISMA_ALLOW_FALLBACK} pnpm prisma generate
RUN PRISMA_ALLOW_FALLBACK=${PRISMA_ALLOW_FALLBACK} pnpm build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema/runtime artifacts (if needed by migrations/seed logic)
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
