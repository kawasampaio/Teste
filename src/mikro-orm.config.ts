import 'dotenv/config';

import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

export default defineConfig({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  dbName: process.env.DATABASE_NAME ?? 'app',
  user: process.env.DATABASE_USER ?? 'app',
  password: process.env.DATABASE_PASSWORD ?? 'app',

  entities: ['./dist/**/*.entity.js'],
  entitiesTs: [
    './src/infrastructure/persistence/entities/**/*.entity.ts',
  ],

  metadataProvider: TsMorphMetadataProvider,

  extensions: [Migrator],

  migrations: {
    path: './dist/database/migrations',
    pathTs: './src/database/migrations',
    transactional: true,
    allOrNothing: true,
  },

  debug: process.env.NODE_ENV === 'development',
});