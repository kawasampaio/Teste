import {
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

import {
  Bet,
  BetResult,
} from '../../domain/bet/bet';

import { Money } from '../../domain/money/money';

import {
  FailureCode,
  WagerTransaction,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../domain/wager/wager-transaction';

import { WalletLedgerEntry } from '../../domain/ledger/wallet-ledger-entry';

import { OutboxMessage } from '../../domain/messaging/outbox-message';

import {
  WALLET_REPOSITORY,
  type WalletRepositoryPort,
} from '../ports/wallet-repository.port';

import {
  WAGER_TRANSACTION_REPOSITORY,
  type WagerTransactionRepositoryPort,
} from '../ports/wager-transaction-repository.port';

import {
  DAILY_LEDGER_REPOSITORY,
  type DailyLedgerRepositoryPort,
} from '../ports/daily-ledger-repository.port';

import {
  WALLET_LEDGER_REPOSITORY,
  type WalletLedgerRepositoryPort,
} from '../ports/wallet-ledger-repository.port';

import {
  OUTBOX_REPOSITORY,
  type OutboxRepositoryPort,
} from '../ports/outbox-repository.port';

import {
  BET_REPOSITORY,
  type BetRepositoryPort,
} from '../ports/bet-repository.port';

import {
  TRANSACTION_RUNNER,
  type TransactionRunnerPort,
} from '../ports/transaction-runner.port';

import {
  NUMBER_DRAWER,
  type NumberDrawerPort,
} from '../ports/number-drawer.port';

export class IdempotencyConflictError extends Error {
  constructor() {
    super(
      'Same idempotency key was used with a different payload',
    );

    this.name = 'IdempotencyConflictError';
  }
}

export interface ProcessBetInput {
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;

  walletId: string;
  playerId: string;

  roundId: string;
  gameId: string;

  chosenNumber: number;

  /**
   * Exemplo: "10.00"
   */
  stake: string;
}

export type ProcessBetResult =
  | {
      status: 'REJECTED';
      reason: FailureCode.InsufficientBalance;
      replayed: boolean;
    }
  | {
      status: 'PROCESSED';

      betId: string;
      wagerTransactionId: string;

      chosenNumber: number;
      drawnNumber: number;

      result: BetResult;

      won: boolean;
      draw: boolean;

      stake: {
        amount: string;
        currency: string;
      };

      payout: {
        amount: string;
        currency: string;
      };

      profit: {
        amount: string;
        currency: string;
      };

      balanceAfter: {
        amount: string;
        currency: string;
      };

      replayed: boolean;
    };

@Injectable()
export class ProcessBetUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets:
      WalletRepositoryPort,

    @Inject(WAGER_TRANSACTION_REPOSITORY)
    private readonly wagers:
      WagerTransactionRepositoryPort,

    @Inject(DAILY_LEDGER_REPOSITORY)
    private readonly dailyLedgers:
      DailyLedgerRepositoryPort,

    @Inject(WALLET_LEDGER_REPOSITORY)
    private readonly ledger:
      WalletLedgerRepositoryPort,

    @Inject(OUTBOX_REPOSITORY)
    private readonly outbox:
      OutboxRepositoryPort,

    @Inject(BET_REPOSITORY)
    private readonly bets:
      BetRepositoryPort,

    @Inject(TRANSACTION_RUNNER)
    private readonly transactions:
      TransactionRunnerPort,

    @Inject(NUMBER_DRAWER)
    private readonly numberDrawer:
      NumberDrawerPort,
  ) {}

  async execute(
    input: ProcessBetInput,
  ): Promise<ProcessBetResult> {
    this.assertChosenNumber(
      input.chosenNumber,
    );

    const stake = Money.from({
      amount: input.stake,
      currency: 'BRL',
    });

    if (!stake.isPositive()) {
      throw new Error(
        'Bet stake must be positive',
      );
    }

    const payloadHash =
      this.createPayloadHash(
        input,
        stake,
      );

    const proposedTransaction =
      WagerTransaction.create({
        id: randomUUID(),

        providerId:
          input.providerId,

        externalTransactionId:
          input.externalTransactionId,

        idempotencyKey:
          input.idempotencyKey,

        payloadHash,

        walletId:
          input.walletId,

        playerId:
          input.playerId,

        roundId:
          input.roundId,

        gameId:
          input.gameId,

        kind:
          WagerTransactionKind.Bet,

        money:
          stake,
      });

    return this.transactions.run(
      async () => {
        const claim =
          await this.wagers.claim(
            proposedTransaction,
          );

        /*
         * Retry da mesma aposta.
         */
        if (!claim.created) {
          return this.handleReplay(
            claim.transaction,
            payloadHash,
          );
        }

        const transaction =
          claim.transaction;

        /*
         * Bloqueia somente a wallet desse jogador.
         */
        const wallet =
          await this.wallets
            .findByIdForUpdate(
              input.walletId,
            );

        if (!wallet) {
          throw new Error(
            `Wallet ${input.walletId} not found`,
          );
        }

        if (
          wallet.playerId !==
          input.playerId
        ) {
          throw new Error(
            'Wallet belongs to another player',
          );
        }

        /*
         * Saldo insuficiente.
         */
        if (
          wallet.balance.isLessThan(
            stake,
          )
        ) {
          transaction.reject(
            FailureCode.InsufficientBalance,
          );

          await this.wagers.persist(
            transaction,
          );

          return {
            status: 'REJECTED',
            reason:
              FailureCode
                .InsufficientBalance,
            replayed: false,
          };
        }

        const now = new Date();

        /*
         * Sorteio feito pelo servidor.
         */
        const drawnNumber =
          this.numberDrawer.draw(
            1,
            9,
          );

        /*
         * Toda aposta primeiro debita a stake.
         */
        const betMovement =
          wallet.debit(
            stake,
            now,
          );

        transaction.markProcessed(
          undefined,
          now,
        );

        await this.wagers.persist(
          transaction,
        );

        await this.wallets.persist(
          wallet,
        );

        const ledgerDate =
          now
            .toISOString()
            .slice(0, 10);

        const dailyLedger =
          await this.dailyLedgers
            .getOrCreate({
              id: randomUUID(),

              walletId:
                wallet.id,

              playerId:
                wallet.playerId,

              ledgerDate,

              currency:
                wallet.currency,

              createdAt:
                now,
            });

        /*
         * Ledger do débito da aposta.
         */
        const betLedgerEntry =
          WalletLedgerEntry.create({
            id: randomUUID(),

            walletId:
              wallet.id,

            transactionId:
              transaction.id,

            direction:
              transaction
                .ledgerDirectionFor(),

            money:
              stake,

            balanceBefore:
              betMovement
                .balanceBefore,

            balanceAfter:
              betMovement
                .balanceAfter,

            createdAt:
              now,
          });

        await this.ledger.append({
          entry:
            betLedgerEntry,

          dailyLedgerId:
            dailyLedger.id,

          walletVersion:
            betMovement
              .walletVersion,
        });

        /*
         * REGRA DO JOGO
         *
         * escolhido > sorteado = WIN
         * escolhido = sorteado = DRAW
         * escolhido < sorteado = LOSS
         */
        const result =
          input.chosenNumber > drawnNumber
            ? BetResult.Win
            : input.chosenNumber === drawnNumber
              ? BetResult.Draw
              : BetResult.Loss;

        let payout =
          Money.zero('BRL');

        /*
         * =========================
         * WIN
         * =========================
         *
         * Apostou R$10:
         *
         * -10 BET
         * +20 WIN
         *
         * lucro real = +R$10
         */
        if (result === BetResult.Win) {
          payout =
            stake.add(stake);

          const winTransaction =
            WagerTransaction.create({
              id: randomUUID(),

              providerId:
                'internal',

              externalTransactionId:
                `${transaction.id}:win`,

              idempotencyKey:
                `${transaction.id}:win`,

              payloadHash:
                this.hash(
                  `win:${transaction.id}`,
                ),

              walletId:
                wallet.id,

              playerId:
                wallet.playerId,

              roundId:
                input.roundId,

              gameId:
                input.gameId,

              kind:
                WagerTransactionKind.Win,

              money:
                payout,
            });

          winTransaction.markProcessed(
            undefined,
            now,
          );

          await this.wagers.persist(
            winTransaction,
          );

          const winMovement =
            wallet.credit(
              payout,
              now,
            );

          await this.wallets.persist(
            wallet,
          );

          const winLedgerEntry =
            WalletLedgerEntry.create({
              id: randomUUID(),

              walletId:
                wallet.id,

              transactionId:
                winTransaction.id,

              direction:
                winTransaction
                  .ledgerDirectionFor(),

              money:
                payout,

              balanceBefore:
                winMovement
                  .balanceBefore,

              balanceAfter:
                winMovement
                  .balanceAfter,

              createdAt:
                now,
            });

          await this.ledger.append({
            entry:
              winLedgerEntry,

            dailyLedgerId:
              dailyLedger.id,

            walletVersion:
              winMovement
                .walletVersion,
          });
        }

        /*
         * =========================
         * DRAW / EMPATE
         * =========================
         *
         * Apostou R$10:
         *
         * -10 BET
         * +10 REFUND
         *
         * saldo volta ao que era.
         */
        else if (
          result === BetResult.Draw
        ) {
          payout = stake;

          const refundTransaction =
            WagerTransaction.create({
              id: randomUUID(),

              providerId:
                'internal',

              externalTransactionId:
                `${transaction.id}:refund`,

              idempotencyKey:
                `${transaction.id}:refund`,

              payloadHash:
                this.hash(
                  `refund:${transaction.id}`,
                ),

              walletId:
                wallet.id,

              playerId:
                wallet.playerId,

              roundId:
                input.roundId,

              gameId:
                input.gameId,

              kind:
                WagerTransactionKind.Refund,

              money:
                stake,

              referenceExternalTransactionId:
                transaction
                  .externalTransactionId,
            });

          /*
           * REFUND aponta para a BET original.
           */
          refundTransaction.markProcessed(
            transaction.id,
            now,
          );

          await this.wagers.persist(
            refundTransaction,
          );

          /*
           * Devolve exatamente a stake.
           */
          const refundMovement =
            wallet.credit(
              stake,
              now,
            );

          await this.wallets.persist(
            wallet,
          );

          const refundLedgerEntry =
            WalletLedgerEntry.create({
              id: randomUUID(),

              walletId:
                wallet.id,

              transactionId:
                refundTransaction.id,

              direction:
                refundTransaction
                  .ledgerDirectionFor(
                    transaction,
                  ),

              money:
                stake,

              balanceBefore:
                refundMovement
                  .balanceBefore,

              balanceAfter:
                refundMovement
                  .balanceAfter,

              createdAt:
                now,
            });

          await this.ledger.append({
            entry:
              refundLedgerEntry,

            dailyLedgerId:
              dailyLedger.id,

            walletVersion:
              refundMovement
                .walletVersion,
          });
        }

        /*
         * =========================
         * LOSS
         * =========================
         *
         * Não existe crédito adicional.
         */
        else {
          const lossTransaction =
            WagerTransaction.create({
              id: randomUUID(),

              providerId:
                'internal',

              externalTransactionId:
                `${transaction.id}:loss`,

              idempotencyKey:
                `${transaction.id}:loss`,

              payloadHash:
                this.hash(
                  `loss:${transaction.id}`,
                ),

              walletId:
                wallet.id,

              playerId:
                wallet.playerId,

              roundId:
                input.roundId,

              gameId:
                input.gameId,

              kind:
                WagerTransactionKind.Loss,

              money:
                stake,
            });

          lossTransaction.markProcessed(
            undefined,
            now,
          );

          await this.wagers.persist(
            lossTransaction,
          );
        }

        /*
         * Persiste o resultado final da aposta.
         */
        const bet =
          Bet.settle({
            id: randomUUID(),

            wagerTransactionId:
              transaction.id,

            walletId:
              wallet.id,

            playerId:
              wallet.playerId,

            chosenNumber:
              input.chosenNumber,

            drawnNumber,

            stake,

            payout,

            balanceAfter:
              wallet.balance,

            createdAt:
              now,
          });

        await this.bets.save(
          bet,
        );

        /*
         * Evento para Outbox.
         */
        const event =
          OutboxMessage.enqueue({
            id: randomUUID(),

            aggregateId:
              wallet.id,

            type:
              'BetSettled',

            payload: {
              betId:
                bet.id,

              wagerTransactionId:
                transaction.id,

              playerId:
                wallet.playerId,

              chosenNumber:
                bet.chosenNumber,

              drawnNumber:
                bet.drawnNumber,

              result:
                bet.result,

              won:
                bet.won,

              draw:
                bet.draw,

              stake:
                bet.stake.toJSON(),

              payout:
                bet.payout.toJSON(),

              balanceAfter:
                bet.balanceAfter
                  .toJSON(),
            },

            occurredAt:
              now,
          });

        await this.outbox.enqueue(
          event,
        );

        return this.toResult(
          bet,
          false,
        );
      },
    );
  }

  private async handleReplay(
    transaction: WagerTransaction,
    payloadHash: string,
  ): Promise<ProcessBetResult> {
    if (
      !transaction.matchesPayload(
        payloadHash,
      )
    ) {
      throw new IdempotencyConflictError();
    }

    if (
      transaction.status ===
        WagerTransactionStatus.Rejected &&
      transaction.failureCode ===
        FailureCode.InsufficientBalance
    ) {
      return {
        status: 'REJECTED',

        reason:
          FailureCode
            .InsufficientBalance,

        replayed: true,
      };
    }

    if (
      transaction.status !==
      WagerTransactionStatus.Processed
    ) {
      throw new Error(
        `Cannot replay transaction in status ${transaction.status}`,
      );
    }

    const bet =
      await this.bets
        .findByWagerTransactionId(
          transaction.id,
        );

    if (!bet) {
      throw new Error(
        'Processed bet has no persisted result',
      );
    }

    return this.toResult(
      bet,
      true,
    );
  }

  private toResult(
    bet: Bet,
    replayed: boolean,
  ): ProcessBetResult {
    let profit: Money;

    /*
     * WIN:
     *
     * payout = 2x stake.
     * Como 1x foi a própria aposta,
     * o lucro real é 1x stake.
     */
    if (
      bet.result === BetResult.Win
    ) {
      profit = bet.stake;
    } else {
      profit =
        Money.zero(
          bet.stake.currency,
        );
    }

    return {
      status: 'PROCESSED',

      betId:
        bet.id,

      wagerTransactionId:
        bet.wagerTransactionId,

      chosenNumber:
        bet.chosenNumber,

      drawnNumber:
        bet.drawnNumber,

      result:
        bet.result,

      won:
        bet.won,

      draw:
        bet.draw,

      stake:
        bet.stake.toJSON(),

      payout:
        bet.payout.toJSON(),

      profit:
        profit.toJSON(),

      balanceAfter:
        bet.balanceAfter.toJSON(),

      replayed,
    };
  }

  private assertChosenNumber(
    number: number,
  ): void {
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 9
    ) {
      throw new Error(
        'chosenNumber must be an integer between 1 and 9',
      );
    }
  }

  private createPayloadHash(
    input: ProcessBetInput,
    stake: Money,
  ): string {
    return this.hash(
      JSON.stringify({
        providerId:
          input.providerId,

        externalTransactionId:
          input.externalTransactionId,

        walletId:
          input.walletId,

        playerId:
          input.playerId,

        roundId:
          input.roundId,

        gameId:
          input.gameId,

        chosenNumber:
          input.chosenNumber,

        stake:
          stake.toJSON(),
      }),
    );
  }

  private hash(
    value: string,
  ): string {
    return createHash(
      'sha256',
    )
      .update(value)
      .digest('hex');
  }
}