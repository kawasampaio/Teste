import {
  createHash,
  randomUUID,
} from 'node:crypto';

import { MikroORM } from '@mikro-orm/postgresql';

import mikroOrmConfig from '../src/mikro-orm.config';

import {
  ProcessBetUseCase,
  type ProcessBetResult,
} from '../src/application/use-cases/process-bet.use-case';

import type { NumberDrawerPort } from '../src/application/ports/number-drawer.port';

import {
  BetResult,
} from '../src/domain/bet/bet';

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

import {
  MikroOrmOutboxRepository,
} from '../src/infrastructure/persistence/repositories/mikro-orm-outbox.repository';

import {
  MikroOrmBetRepository,
} from '../src/infrastructure/persistence/repositories/mikro-orm-bet.repository';

import {
  MikroOrmTransactionRunner,
} from '../src/infrastructure/persistence/mikro-orm-transaction-runner';

/*
 * Sorteio controlado.
 *
 * 1ª aposta -> 3
 * 2ª aposta -> 5
 * 3ª aposta -> 7
 */
class FixedNumberDrawer
  implements NumberDrawerPort
{
  constructor(
    private readonly numbers: number[],
  ) {}

  draw(
    min: number,
    max: number,
  ): number {
    const number =
      this.numbers.shift();

    if (number === undefined) {
      throw new Error(
        'No fixed number available',
      );
    }

    if (
      number < min ||
      number > max
    ) {
      throw new Error(
        `Fixed number ${number} is outside ${min}-${max}`,
      );
    }

    return number;
  }
}

/*
 * Usamos este erro somente para desfazer
 * TODOS os dados do teste no final.
 */
class RollbackTest extends Error {
  constructor() {
    super('ROLLBACK_TEST');
    this.name = 'RollbackTest';
  }
}

function hash(
  value: string,
): string {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

function assertProcessed(
  result: ProcessBetResult,
): asserts result is Extract<
  ProcessBetResult,
  { status: 'PROCESSED' }
> {
  if (
    result.status !== 'PROCESSED'
  ) {
    throw new Error(
      `Expected PROCESSED, received ${result.status}`,
    );
  }
}

function assertMoney(
  actual: string,
  expected: string,
): void {
  const actualMoney =
    Money.from({
      amount: actual,
      currency: 'BRL',
    });

  const expectedMoney =
    Money.from({
      amount: expected,
      currency: 'BRL',
    });

  if (
    !actualMoney.equals(
      expectedMoney,
    )
  ) {
    throw new Error(
      `Expected R$ ${expected}, received R$ ${actual}`,
    );
  }
}

async function main(): Promise<void> {
  const orm =
    await MikroORM.init({
      ...mikroOrmConfig,
      debug: false,
    });

  /*
   * Usamos o EntityManager principal porque
   * transactional() cria o contexto interno
   * que os repositories irão respeitar.
   */
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

  const outbox =
    new MikroOrmOutboxRepository(
      em,
    );

  const bets =
    new MikroOrmBetRepository(
      em,
    );

  const transactions =
    new MikroOrmTransactionRunner(
      em,
    );

  /*
   * Números sorteados:
   *
   * WIN:
   * escolhido 8
   * sorteado 3
   *
   * DRAW:
   * escolhido 5
   * sorteado 5
   *
   * LOSS:
   * escolhido 2
   * sorteado 7
   */
  const numberDrawer =
    new FixedNumberDrawer([
      3,
      5,
      7,
    ]);

  const useCase =
    new ProcessBetUseCase(
      wallets,
      wagers,
      dailyLedgers,
      ledger,
      outbox,
      bets,
      transactions,
      numberDrawer,
    );

  let testFinished = false;

  try {
    /*
     * Essa transaction engloba TODO o teste.
     *
     * O ProcessBetUseCase abrirá transactions
     * internas/savepoints.
     *
     * No final jogamos RollbackTest para
     * desfazer inclusive os dados de setup.
     */
    await em.transactional(
      async () => {
        console.log(
          '\n================================',
        );
        console.log(
          ' TESTE PROCESS BET',
        );
        console.log(
          '================================\n',
        );

        const walletId =
          randomUUID();

        const playerId =
          `player-test-${randomUUID()}`;

        const now =
          new Date();

        const initialBalance =
          Money.from({
            amount: '100.00',
            currency: 'BRL',
          });

        /*
         * ===========================
         * CRIA WALLET R$100
         * ===========================
         */
        const wallet =
          Wallet.open({
            id: walletId,
            playerId,
            initialBalance,
          });

        await wallets.persist(
          wallet,
        );

        /*
         * Cria OPENING transaction
         * para justificar os R$100.
         */
        const openingTransaction =
          WagerTransaction.create({
            id: randomUUID(),

            providerId:
                'internal',

            externalTransactionId:
              `opening:${walletId}`,

            idempotencyKey:
              `opening:${walletId}`,

            payloadHash:
              hash(
                `opening:${walletId}`,
              ),

            walletId,

            playerId,

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

        openingTransaction
          .markProcessed(
            undefined,
            now,
          );

        await wagers.persist(
          openingTransaction,
        );

        const ledgerDate =
          now
            .toISOString()
            .slice(0, 10);

        const dailyLedger =
          await dailyLedgers
            .getOrCreate({
              id:
                randomUUID(),

              walletId,

              playerId,

              ledgerDate,

              currency:
                'BRL',

              createdAt:
                now,
            });

        /*
         * Ledger da abertura:
         *
         * 0 -> 100
         * version 1
         */
        const openingEntry =
          WalletLedgerEntry.create({
            id:
              randomUUID(),

            walletId,

            transactionId:
              openingTransaction.id,

            direction:
              openingTransaction
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
          'Wallet inicial: R$ 100,00 ✅\n',
        );

        /*
         * ===========================
         * TESTE 1 — WIN
         * ===========================
         *
         * usuário = 8
         * sorteio = 3
         *
         * 100 - 10 + 20 = 110
         */
        console.log(
          '--- WIN ---',
        );

        const win =
          await useCase.execute({
            providerId:
              'frontend-test',

            externalTransactionId:
              `bet-win-${randomUUID()}`,

            idempotencyKey:
              `idem-win-${randomUUID()}`,

            walletId,

            playerId,

            roundId:
              `round-win-${randomUUID()}`,

            gameId:
              'dados-da-sorte',

            chosenNumber:
              8,

            stake:
              '10.00',
          });

        assertProcessed(win);

        if (
          win.result !==
          BetResult.Win
        ) {
          throw new Error(
            `Expected WIN, received ${win.result}`,
          );
        }

        if (
          win.drawnNumber !== 3
        ) {
          throw new Error(
            `Expected drawn number 3, received ${win.drawnNumber}`,
          );
        }

        assertMoney(
          win.payout.amount,
          '20.00',
        );

        assertMoney(
          win.profit.amount,
          '10.00',
        );

        assertMoney(
          win.balanceAfter.amount,
          '110.00',
        );

        console.log(
          'Escolhido: 8',
        );

        console.log(
          'Sorteado: 3',
        );

        console.log(
          'Resultado: WIN ✅',
        );

        console.log(
          `Saldo: R$ ${win.balanceAfter.amount}`,
        );

        console.log(
          `Lucro: +R$ ${win.profit.amount}\n`,
        );

        /*
         * ===========================
         * TESTE 2 — DRAW
         * ===========================
         *
         * usuário = 5
         * sorteio = 5
         *
         * 110 - 10 + 10 = 110
         */
        console.log(
          '--- DRAW ---',
        );

        const draw =
          await useCase.execute({
            providerId:
              'frontend-test',

            externalTransactionId:
              `bet-draw-${randomUUID()}`,

            idempotencyKey:
              `idem-draw-${randomUUID()}`,

            walletId,

            playerId,

            roundId:
              `round-draw-${randomUUID()}`,

            gameId:
              'dados-da-sorte',

            chosenNumber:
              5,

            stake:
              '10.00',
          });

        assertProcessed(draw);

        if (
          draw.result !==
          BetResult.Draw
        ) {
          throw new Error(
            `Expected DRAW, received ${draw.result}`,
          );
        }

        if (
          draw.drawnNumber !== 5
        ) {
          throw new Error(
            `Expected drawn number 5, received ${draw.drawnNumber}`,
          );
        }

        assertMoney(
          draw.payout.amount,
          '10.00',
        );

        assertMoney(
          draw.profit.amount,
          '0.00',
        );

        assertMoney(
          draw.balanceAfter.amount,
          '110.00',
        );

        console.log(
          'Escolhido: 5',
        );

        console.log(
          'Sorteado: 5',
        );

        console.log(
          'Resultado: DRAW ✅',
        );

        console.log(
          'Aposta devolvida: R$ 10,00',
        );

        console.log(
          `Saldo: R$ ${draw.balanceAfter.amount}\n`,
        );

        /*
         * ===========================
         * TESTE 3 — LOSS
         * ===========================
         *
         * usuário = 2
         * sorteio = 7
         *
         * 110 - 10 = 100
         */
        console.log(
          '--- LOSS ---',
        );

        const loss =
          await useCase.execute({
            providerId:
              'frontend-test',

            externalTransactionId:
              `bet-loss-${randomUUID()}`,

            idempotencyKey:
              `idem-loss-${randomUUID()}`,

            walletId,

            playerId,

            roundId:
              `round-loss-${randomUUID()}`,

            gameId:
              'dados-da-sorte',

            chosenNumber:
              2,

            stake:
              '10.00',
          });

        assertProcessed(loss);

        if (
          loss.result !==
          BetResult.Loss
        ) {
          throw new Error(
            `Expected LOSS, received ${loss.result}`,
          );
        }

        if (
          loss.drawnNumber !== 7
        ) {
          throw new Error(
            `Expected drawn number 7, received ${loss.drawnNumber}`,
          );
        }

        assertMoney(
          loss.payout.amount,
          '0.00',
        );

        assertMoney(
          loss.balanceAfter.amount,
          '100.00',
        );

        console.log(
          'Escolhido: 2',
        );

        console.log(
          'Sorteado: 7',
        );

        console.log(
          'Resultado: LOSS ✅',
        );

        console.log(
          `Saldo: R$ ${loss.balanceAfter.amount}\n`,
        );

        /*
         * ===========================
         * CONFERE O POSTGRESQL
         * ===========================
         */

        const walletRows =
          await em.execute<
            Array<{
              balance_minor: string;
              version: number;
            }>
          >(
            `
              select
                balance_minor::text,
                version
              from wallets
              where id = ?
            `,
            [
              walletId,
            ],
          );

        const walletRow =
          walletRows[0];

        if (!walletRow) {
          throw new Error(
            'Wallet disappeared',
          );
        }

        if (
          walletRow.balance_minor !==
          '10000'
        ) {
          throw new Error(
            `Expected 10000 minor units, received ${walletRow.balance_minor}`,
          );
        }

        if (
          Number(
            walletRow.version,
          ) !== 6
        ) {
          throw new Error(
            `Expected wallet version 6, received ${walletRow.version}`,
          );
        }

        /*
         * OPENING:
         * version 1
         *
         * WIN:
         * BET version 2
         * WIN version 3
         *
         * DRAW:
         * BET version 4
         * REFUND version 5
         *
         * LOSS:
         * BET version 6
         */

        console.log(
          'Wallet final:',
        );

        console.log(
          `balance_minor = ${walletRow.balance_minor}`,
        );

        console.log(
          `version = ${walletRow.version} ✅\n`,
        );

        const counts =
          await em.execute<
            Array<{
              wagers: number;
              ledger_entries: number;
              bets: number;
              outbox: number;
              daily_ledgers: number;
            }>
          >(
            `
              select
                (
                  select count(*)::int
                  from wager_transactions
                  where wallet_id = ?
                ) as wagers,

                (
                  select count(*)::int
                  from wallet_ledger_entries
                  where wallet_id = ?
                ) as ledger_entries,

                (
                  select count(*)::int
                  from bets
                  where wallet_id = ?
                ) as bets,

                (
                  select count(*)::int
                  from outbox_messages
                  where aggregate_id = ?
                ) as outbox,

                (
                  select count(*)::int
                  from daily_ledgers
                  where wallet_id = ?
                ) as daily_ledgers
            `,
            [
              walletId,
              walletId,
              walletId,
              walletId,
              walletId,
            ],
          );

        const count =
          counts[0];

        if (!count) {
          throw new Error(
            'Could not count test rows',
          );
        }

        console.log(
          'Registros criados:',
        );

        console.table(
          count,
        );

        if (
          Number(count.wagers) !== 7
        ) {
          throw new Error(
            `Expected 7 wagers, received ${count.wagers}`,
          );
        }

        if (
          Number(
            count.ledger_entries,
          ) !== 6
        ) {
          throw new Error(
            `Expected 6 ledger entries, received ${count.ledger_entries}`,
          );
        }

        if (
          Number(count.bets) !== 3
        ) {
          throw new Error(
            `Expected 3 bets, received ${count.bets}`,
          );
        }

        if (
          Number(count.outbox) !== 3
        ) {
          throw new Error(
            `Expected 3 outbox messages, received ${count.outbox}`,
          );
        }

        if (
          Number(
            count.daily_ledgers,
          ) !== 1
        ) {
          throw new Error(
            `Expected 1 daily ledger, received ${count.daily_ledgers}`,
          );
        }

        const ledgerRows =
          await em.execute(
            `
              select
                wallet_version,
                direction,
                amount_minor::text,
                balance_before_minor::text,
                balance_after_minor::text
              from wallet_ledger_entries
              where wallet_id = ?
              order by wallet_version
            `,
            [
              walletId,
            ],
          );

        console.log(
          '\nLedger completo:',
        );

        console.table(
          ledgerRows,
        );

        console.log(
          '\n✅ WIN PASSOU',
        );

        console.log(
          '✅ DRAW PASSOU',
        );

        console.log(
          '✅ LOSS PASSOU',
        );

        console.log(
          '✅ SALDO FINAL PASSOU',
        );

        console.log(
          '✅ WALLET VERSION PASSOU',
        );

        console.log(
          '✅ LEDGER PASSOU',
        );

        console.log(
          '✅ OUTBOX PASSOU',
        );

        console.log(
          '✅ POSTGRESQL PASSOU\n',
        );

        testFinished = true;

        /*
         * Não queremos deixar os registros
         * desse teste no banco.
         */
        throw new RollbackTest();
      },
      {
        clear: true,
      },
    );
  } catch (error) {
    if (
      error instanceof RollbackTest &&
      testFinished
    ) {
      console.log(
        'Dados temporários do teste removidos via ROLLBACK ✅',
      );

      console.log(
        '\n🎉 TESTE COMPLETO PASSOU!\n',
      );

      return;
    }

    console.error(
      '\n❌ TESTE FALHOU\n',
    );

    console.error(
      error,
    );

    process.exitCode = 1;
  } finally {
    await orm.close(true);
  }
}

void main();