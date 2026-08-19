"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const postgresql_1 = require("@mikro-orm/postgresql");
const migrations_1 = require("@mikro-orm/migrations");
const reflection_1 = require("@mikro-orm/reflection");
exports.default = (0, postgresql_1.defineConfig)({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    dbName: process.env.DATABASE_NAME ?? 'app',
    user: process.env.DATABASE_USER ?? 'app',
    password: process.env.DATABASE_PASSWORD ?? 'app',
    entities: ['./dist/**/*.entity.js'],
    entitiesTs: [
        './src/infrastructure/persistence/entities/**/*.entity.ts',
    ],
    metadataProvider: reflection_1.TsMorphMetadataProvider,
    extensions: [migrations_1.Migrator],
    migrations: {
        path: './dist/database/migrations',
        pathTs: './src/database/migrations',
        transactional: true,
        allOrNothing: true,
    },
    debug: process.env.NODE_ENV === 'development',
});
//# sourceMappingURL=mikro-orm.config.js.map