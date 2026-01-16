import { defineConfig, env } from 'prisma/config';

const defaultDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/fourunners';
if (!process.env.DATABASE_URL) {
  // Provide a fallback during builds/tests when the runtime DATABASE_URL is not injected.
  process.env.DATABASE_URL = defaultDatabaseUrl;
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL')
  },
  migrations: {
    path: './prisma/migrations'
  }
});
