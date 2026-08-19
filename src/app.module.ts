import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { TRANSACTION_RUNNER } from './application/ports/transaction-runner.port';
import { MikroOrmTransactionRunner } from './infrastructure/persistence/mikro-orm-transaction-runner';

import mikroOrmConfig from './mikro-orm.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WALLET_REPOSITORY } from './application/ports/wallet-repository.port';
import { MikroOrmWalletRepository } from './infrastructure/persistence/repositories/mikro-orm-wallet.repository';

import { DAILY_LEDGER_REPOSITORY } from './application/ports/daily-ledger-repository.port';
import { WALLET_LEDGER_REPOSITORY } from './application/ports/wallet-ledger-repository.port';
import { OUTBOX_REPOSITORY } from './application/ports/outbox-repository.port';

import { MikroOrmDailyLedgerRepository } from './infrastructure/persistence/repositories/mikro-orm-daily-ledger.repository';
import { MikroOrmWalletLedgerRepository } from './infrastructure/persistence/repositories/mikro-orm-wallet-ledger.repository';
import { MikroOrmOutboxRepository } from './infrastructure/persistence/repositories/mikro-orm-outbox.repository';

import { BET_REPOSITORY } from './application/ports/bet-repository.port';
import { NUMBER_DRAWER } from './application/ports/number-drawer.port';

import { MikroOrmBetRepository } from './infrastructure/persistence/repositories/mikro-orm-bet.repository';

import { CryptoNumberDrawer } from './infrastructure/random/crypto-number-drawer';

import { ProcessBetUseCase } from './application/use-cases/process-bet.use-case';

import {
  WAGER_TRANSACTION_REPOSITORY,
} from './application/ports/wager-transaction-repository.port';

import {
  MikroOrmWagerTransactionRepository,
} from './infrastructure/persistence/repositories/mikro-orm-wager-transaction.repository';

import { BetsController } from './presentation/controllers/bets.controller';
import { WalletsController } from './presentation/controllers/wallets.controller';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
  ],

controllers: [
  AppController,
  BetsController,
  WalletsController,
],

  providers: [
    AppService,

    MikroOrmWalletRepository,
    {
      provide: WALLET_REPOSITORY,
      useExisting: MikroOrmWalletRepository,
    },

    MikroOrmTransactionRunner,
    {
      provide: TRANSACTION_RUNNER,
      useExisting: MikroOrmTransactionRunner,
    },
    MikroOrmDailyLedgerRepository,
    {
      provide: DAILY_LEDGER_REPOSITORY,
      useExisting: MikroOrmDailyLedgerRepository,
    },

    MikroOrmWalletLedgerRepository,
    {
      provide: WALLET_LEDGER_REPOSITORY,
      useExisting: MikroOrmWalletLedgerRepository,
    },

    MikroOrmOutboxRepository,
    {
      provide: OUTBOX_REPOSITORY,
      useExisting: MikroOrmOutboxRepository,
    },
    MikroOrmBetRepository,
    {
      provide: BET_REPOSITORY,
      useExisting: MikroOrmBetRepository,
    },

    CryptoNumberDrawer,
    {
      provide: NUMBER_DRAWER,
      useExisting: CryptoNumberDrawer,
    },
    MikroOrmWagerTransactionRepository,
    {
      provide: WAGER_TRANSACTION_REPOSITORY,
      useExisting: MikroOrmWagerTransactionRepository,
    },

    ProcessBetUseCase,
  ],

  exports: [
    WALLET_REPOSITORY,
    TRANSACTION_RUNNER,
    DAILY_LEDGER_REPOSITORY,
    WALLET_LEDGER_REPOSITORY,
    OUTBOX_REPOSITORY,
    WAGER_TRANSACTION_REPOSITORY,
  ],
})
export class AppModule {}