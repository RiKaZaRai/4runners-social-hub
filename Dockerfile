FROM node:24-bookworm-slim AS base

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fourunners"
ENV DATABASE_URL=${DATABASE_URL}

WORKDIR /app

RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
