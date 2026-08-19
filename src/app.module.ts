import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { TRANSACTION_RUNNER } from './application/ports/transaction-runner.port';
import { MikroOrmTransactionRunner } from './infrastructure/persistence/mikro-orm-transaction-runner';

import mikroOrmConfig from './mikro-orm.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WALLET_REPOSITORY } from './application/ports/wallet-repository.port';
import { MikroOrmWalletRepository } from './infrastructure/persistence/repositories/mikro-orm-wallet.repository';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
  ],

  controllers: [
    AppController,
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
  ],

  exports: [
    WALLET_REPOSITORY,
    TRANSACTION_RUNNER,
  ],
})
export class AppModule {}