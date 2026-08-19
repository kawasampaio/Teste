import {
  createHash,
  randomUUID,
} from 'node:crypto';

import { MikroORM } from '@mikro-orm/postgresql';

import mikroOrmConfig from '../src/mikro-orm.config';

import { Money } from '../src/domain/money/money';

import { Wallet } from '../src/domain/wallet/wallet';

import {
  WagerTransaction,
  WagerTransactionKind,
} from '../src/domain/wager/wager-transaction';

import {
  WalletLedgerEntry,
} from '../src/domain/ledger/wallet-ledger-entry';

import {
  MikroOrmWalletRepository,
} from '../src/infrastructure/persistence/repositories/mikro-orm-wallet.repository';

import {
  MikroOrmWagerTransactionRepository,
} from '../src/infrastructure/persistence/repositories/mikro-orm-wager-transaction.repository';

import {
  MikroOrmDailyLedgerRepository,
} from '../src/infrastructure/persistence/repositories/mikro-orm-daily-ledger.repository';

import {
  MikroOrmWalletLedgerRepository,
} from '../src/infrastructure/persistence/repositories/mikro-orm-wallet-ledger.repository';

const DEMO_WALLET_ID =
  '22222222-2222-4222-8222-222222222222';

const DEMO_PLAYER_ID =
  'player-demo';

function hash(
  value: string,
): string {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

async function main(): Promise<void> {
  const orm =
    await MikroORM.init({
      ...mikroOrmConfig,
      debug: false,
    });

  const em = orm.em;

  const wallets =
    new MikroOrmWalletRepository(em);

  const wagers =
    new MikroOrmWagerTransactionRepository(
      em,
    );

  const dailyLedgers =
    new MikroOrmDailyLedgerRepository(
      em,
    );

  const ledger =
    new MikroOrmWalletLedgerRepository(
      em,
    );

  try {
    await em.transactional(
      async () => {
        /*
         * Se já criamos anteriormente,
         * não cria outra.
         */
        const existing =
          await wallets.findById(
            DEMO_WALLET_ID,
          );

        if (existing) {
          console.log(
            '\nWallet demo já existe ✅',
          );

          console.log(
            `Wallet ID: ${existing.id}`,
          );

          console.log(
            `Player: ${existing.playerId}`,
          );

          console.log(
            `Saldo atual: R$ ${existing.balance.toJSON().amount}`,
          );

          return;
        }

        const now =
          new Date();

        const initialBalance =
          Money.from({
            amount: '100.00',
            currency: 'BRL',
          });

        /*
         * Cria wallet com R$100.
         */
        const wallet =
          Wallet.open({
            id:
              DEMO_WALLET_ID,

            playerId:
              DEMO_PLAYER_ID,

            initialBalance,
          });

        await wallets.persist(
          wallet,
        );

        /*
         * OPENING justificando o saldo inicial.
         *
         * IMPORTANTE:
         * providerId precisa ser "internal"
         * por causa da constraint
         * ck_wager_opening_internal.
         */
        const opening =
          WagerTransaction.create({
            id:
              randomUUID(),

            providerId:
              'internal',

            externalTransactionId:
              `opening:${DEMO_WALLET_ID}`,

            idempotencyKey:
              `opening:${DEMO_WALLET_ID}`,

            payloadHash:
              hash(
                `opening:${DEMO_WALLET_ID}`,
              ),

            walletId:
              DEMO_WALLET_ID,

            playerId:
              DEMO_PLAYER_ID,

            roundId:
              'opening',

            gameId:
              'dados-da-sorte',

            kind:
              WagerTransactionKind.Opening,

            money:
              initialBalance,

            internal:
              true,

            createdAt:
              now,
          });

        opening.markProcessed(
          undefined,
          now,
        );

        await wagers.persist(
          opening,
        );

        /*
         * Ledger diário.
         */
        const ledgerDate =
          now
            .toISOString()
            .slice(0, 10);

        const dailyLedger =
          await dailyLedgers
            .getOrCreate({
              id:
                randomUUID(),

              walletId:
                DEMO_WALLET_ID,

              playerId:
                DEMO_PLAYER_ID,

              ledgerDate,

              currency:
                'BRL',

              createdAt:
                now,
            });

        /*
         * Lançamento:
         *
         * R$ 0 -> R$ 100
         * wallet version = 1
         */
        const openingEntry =
          WalletLedgerEntry.create({
            id:
              randomUUID(),

            walletId:
              DEMO_WALLET_ID,

            transactionId:
              opening.id,

            direction:
              opening
                .ledgerDirectionFor(),

            money:
              initialBalance,

            balanceBefore:
              Money.zero('BRL'),

            balanceAfter:
              initialBalance,

            createdAt:
              now,
          });

        await ledger.append({
          entry:
            openingEntry,

          dailyLedgerId:
            dailyLedger.id,

          walletVersion:
            wallet.version,
        });

        console.log(
          '\n================================',
        );

        console.log(
          ' WALLET DEMO CRIADA',
        );

        console.log(
          '================================',
        );

        console.log(
          `Wallet ID: ${DEMO_WALLET_ID}`,
        );

        console.log(
          `Player: ${DEMO_PLAYER_ID}`,
        );

        console.log(
          'Saldo: R$ 100,00',
        );

        console.log(
          '================================\n',
        );
      },
      {
        clear: true,
      },
    );
  } finally {
    await orm.close(true);
  }
}

void main();