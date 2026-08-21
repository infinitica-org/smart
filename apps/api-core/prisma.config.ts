import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 CLI config. The database URL lives here, not in schema.prisma.
 * Owner: Vishal V.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://smart:smart@127.0.0.1:5432/smart?schema=public',
  },
});
