import { describe, expect, test } from 'bun:test';

import {
  LedgerDirection,
} from '../ledger/wallet-ledger-entry';
import { Money } from '../money/money';

import {
  FailureCode,
  InvalidTransactionStateError,
  WagerTransaction,
  WagerTransactionKind,
  WagerTransactionStatus,
} from './wager-transaction';

function brl(amount: string): Money {
  return Money.from({
    amount,
    currency: 'BRL',
  });
}

function createBet(): WagerTransaction {
  return WagerTransaction.create({
    id: 'transaction-bet-1',
    providerId: 'provider-1',
    externalTransactionId: 'external-bet-1',
    idempotencyKey: 'idempotency-bet-1',
    payloadHash: 'hash-bet-1',
    walletId: 'wallet-1',
    playerId: 'player-1',
    roundId: 'round-1',
    gameId: 'game-1',
    kind: WagerTransactionKind.Bet,
    money: brl('10.00'),
  });
}

function createRollback(): WagerTransaction {
  return WagerTransaction.create({
    id: 'transaction-rollback-1',
    providerId: 'provider-1',
    externalTransactionId: 'external-rollback-1',
    idempotencyKey: 'idempotency-rollback-1',
    payloadHash: 'hash-rollback-1',
    walletId: 'wallet-1',
    playerId: 'player-1',
    roundId: 'round-1',
    gameId: 'game-1',
    kind: WagerTransactionKind.Rollback,
    money: brl('10.00'),
    referenceExternalTransactionId: 'external-bet-1',
  });
}

describe('WagerTransaction', () => {
  test('nasce como PENDING', () => {
    const transaction = createBet();

    expect(transaction.status).toBe(
      WagerTransactionStatus.Pending,
    );

    expect(transaction.isTerminal()).toBe(false);
  });

  test('BET afeta saldo e gera DEBIT', () => {
    const transaction = createBet();

    expect(transaction.affectsBalance()).toBe(true);

    expect(transaction.ledgerDirectionFor()).toBe(
      LedgerDirection.Debit,
    );
  });

  test('WIN gera CREDIT', () => {
    const transaction = WagerTransaction.create({
      id: 'win-1',
      providerId: 'provider-1',
      externalTransactionId: 'external-win-1',
      idempotencyKey: 'idempotency-win-1',
      payloadHash: 'hash-win-1',
      walletId: 'wallet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      gameId: 'game-1',
      kind: WagerTransactionKind.Win,
      money: brl('20.00'),
    });

    expect(transaction.affectsBalance()).toBe(true);

    expect(transaction.ledgerDirectionFor()).toBe(
      LedgerDirection.Credit,
    );
  });

  test('LOSS nao afeta saldo', () => {
    const transaction = WagerTransaction.create({
      id: 'loss-1',
      providerId: 'provider-1',
      externalTransactionId: 'external-loss-1',
      idempotencyKey: 'idempotency-loss-1',
      payloadHash: 'hash-loss-1',
      walletId: 'wallet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      gameId: 'game-1',
      kind: WagerTransactionKind.Loss,
      money: brl('10.00'),
    });

    expect(transaction.affectsBalance()).toBe(false);

    expect(() => {
      transaction.ledgerDirectionFor();
    }).toThrow('LOSS does not generate a ledger entry');
  });

  test('OPENING nao pode ser criado externamente', () => {
    expect(() =>
      WagerTransaction.create({
        id: 'opening-1',
        providerId: 'internal',
        externalTransactionId: 'opening-1',
        idempotencyKey: 'opening-key',
        payloadHash: 'opening-hash',
        walletId: 'wallet-1',
        playerId: 'player-1',
        roundId: 'opening',
        gameId: 'opening',
        kind: WagerTransactionKind.Opening,
        money: brl('100.00'),
      }),
    ).toThrow(
      'OPENING transaction can only be created internally',
    );
  });

  test('OPENING interno gera CREDIT', () => {
    const transaction = WagerTransaction.create({
      id: 'opening-1',
      providerId: 'internal',
      externalTransactionId: 'opening-1',
      idempotencyKey: 'opening-key',
      payloadHash: 'opening-hash',
      walletId: 'wallet-1',
      playerId: 'player-1',
      roundId: 'opening',
      gameId: 'opening',
      kind: WagerTransactionKind.Opening,
      money: brl('100.00'),
      internal: true,
    });

    expect(transaction.ledgerDirectionFor()).toBe(
      LedgerDirection.Credit,
    );
  });

  test('ROLLBACK exige referencia', () => {
    expect(() =>
      WagerTransaction.create({
        id: 'rollback-1',
        providerId: 'provider-1',
        externalTransactionId: 'rollback-external',
        idempotencyKey: 'rollback-key',
        payloadHash: 'rollback-hash',
        walletId: 'wallet-1',
        playerId: 'player-1',
        roundId: 'round-1',
        gameId: 'game-1',
        kind: WagerTransactionKind.Rollback,
        money: brl('10.00'),
      }),
    ).toThrow();
  });

  test('REFUND exige referencia', () => {
    expect(() =>
      WagerTransaction.create({
        id: 'refund-1',
        providerId: 'provider-1',
        externalTransactionId: 'refund-external',
        idempotencyKey: 'refund-key',
        payloadHash: 'refund-hash',
        walletId: 'wallet-1',
        playerId: 'player-1',
        roundId: 'round-1',
        gameId: 'game-1',
        kind: WagerTransactionKind.Refund,
        money: brl('10.00'),
      }),
    ).toThrow();
  });

  test('ROLLBACK de BET inverte DEBIT para CREDIT', () => {
    const bet = createBet();
    const rollback = createRollback();

    expect(
      rollback.ledgerDirectionFor(bet),
    ).toBe(LedgerDirection.Credit);
  });

  test('ROLLBACK de WIN inverte CREDIT para DEBIT', () => {
    const win = WagerTransaction.create({
      id: 'win-1',
      providerId: 'provider-1',
      externalTransactionId: 'external-win-1',
      idempotencyKey: 'idempotency-win-1',
      payloadHash: 'hash-win',
      walletId: 'wallet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      gameId: 'game-1',
      kind: WagerTransactionKind.Win,
      money: brl('20.00'),
    });

    const rollback = createRollback();

    expect(
      rollback.ledgerDirectionFor(win),
    ).toBe(LedgerDirection.Debit);
  });

  test('ROLLBACK pode aguardar referencia', () => {
    const rollback = createRollback();

    rollback.markPendingReference();

    expect(rollback.status).toBe(
      WagerTransactionStatus.PendingReference,
    );
  });

  test('ROLLBACK processado guarda referencia interna', () => {
    const rollback = createRollback();

    rollback.markPendingReference();

    const processedAt = new Date();

    rollback.markProcessed(
      'transaction-original-1',
      processedAt,
    );

    expect(rollback.status).toBe(
      WagerTransactionStatus.Processed,
    );

    expect(rollback.referenceTransactionId).toBe(
      'transaction-original-1',
    );

    expect(rollback.processedAt).toEqual(processedAt);
    expect(rollback.isTerminal()).toBe(true);
  });

  test('ROLLBACK nao processa sem referencia resolvida', () => {
    const rollback = createRollback();

    expect(() => {
      rollback.markProcessed(undefined, new Date());
    }).toThrow();
  });

  test('PROCESSED e terminal', () => {
    const transaction = createBet();

    transaction.markProcessed(undefined, new Date());

    expect(transaction.isTerminal()).toBe(true);

    expect(() => {
      transaction.reject(FailureCode.InvalidAmount);
    }).toThrow(InvalidTransactionStateError);
  });

  test('REJECTED e terminal', () => {
    const transaction = createBet();

    transaction.reject(
      FailureCode.InsufficientBalance,
    );

    expect(transaction.status).toBe(
      WagerTransactionStatus.Rejected,
    );

    expect(transaction.failureCode).toBe(
      FailureCode.InsufficientBalance,
    );

    expect(transaction.isTerminal()).toBe(true);

    expect(() => {
      transaction.markProcessed(undefined, new Date());
    }).toThrow(InvalidTransactionStateError);
  });

  test('FAILED e terminal', () => {
    const transaction = createBet();

    transaction.fail(
      FailureCode.PermanentInfrastructureError,
    );

    expect(transaction.status).toBe(
      WagerTransactionStatus.Failed,
    );

    expect(transaction.isTerminal()).toBe(true);

    expect(() => {
      transaction.reject(FailureCode.InvalidAmount);
    }).toThrow(InvalidTransactionStateError);
  });

  test('mesmo payloadHash representa replay compativel', () => {
    const transaction = createBet();

    expect(
      transaction.matchesPayload('hash-bet-1'),
    ).toBe(true);
  });

  test('payloadHash diferente nao e replay compativel', () => {
    const transaction = createBet();

    expect(
      transaction.matchesPayload('hash-diferente'),
    ).toBe(false);
  });

  test('transacao nao aceita valor zero', () => {
    expect(() =>
      WagerTransaction.create({
        id: 'zero-1',
        providerId: 'provider-1',
        externalTransactionId: 'external-zero',
        idempotencyKey: 'zero-key',
        payloadHash: 'zero-hash',
        walletId: 'wallet-1',
        playerId: 'player-1',
        roundId: 'round-1',
        gameId: 'game-1',
        kind: WagerTransactionKind.Bet,
        money: brl('0.00'),
      }),
    ).toThrow();
  });
});