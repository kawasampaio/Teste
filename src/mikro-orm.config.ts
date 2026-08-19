import 'dotenv/config';
import 'reflect-metadata';

import {
  defineConfig,
} from '@mikro-orm/postgresql';

import {
  Migrator,
} from '@mikro-orm/migrations';

import {
  ReflectMetadataProvider,
} from '@mikro-orm/decorators/legacy';

import {
  WalletEntity,
} from './infrastructure/persistence/entities/wallet.entity';

import {
  DailyLedgerEntity,
} from './infrastructure/persistence/entities/daily-ledger.entity';

import {
  WagerTransactionEntity,
} from './infrastructure/persistence/entities/wager-transaction.entity';

import {
  WalletLedgerEntryEntity,
} from './infrastructure/persistence/entities/wallet-ledger-entry.entity';

import {
  InboxMessageEntity,
} from './infrastructure/persistence/entities/inbox-message.entity';

import {
  OutboxMessageEntity,
} from './infrastructure/persistence/entities/outbox-message.entity';

import {
  BetEntity,
} from './infrastructure/persistence/entities/bet.entity';

export default defineConfig({
  host:
    process.env.DATABASE_HOST ??
    'localhost',

  port:
    Number(
      process.env.DATABASE_PORT ??
        5432,
    ),

  dbName:
    process.env.DATABASE_NAME ??
    'app',

  user:
    process.env.DATABASE_USER ??
    'app',

  password:
    process.env.DATABASE_PASSWORD ??
    'app',

  entities: [
    WalletEntity,
    DailyLedgerEntity,
    WagerTransactionEntity,
    WalletLedgerEntryEntity,
    InboxMessageEntity,
    OutboxMessageEntity,
    BetEntity,
  ],

  metadataProvider:
    ReflectMetadataProvider,

  extensions: [
    Migrator,
  ],

  migrations: {
    path:
      './dist/database/migrations',

    pathTs:
      './src/database/migrations',

    transactional:
      true,

    allOrNothing:
      true,
  },

  debug:
    process.env.NODE_ENV ===
    'development',
});