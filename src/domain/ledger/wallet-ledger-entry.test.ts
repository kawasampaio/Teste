import { describe, expect, test } from 'bun:test';

import { Money } from '../money/money';
import {
  LedgerDirection,
  WalletLedgerEntry,
} from './wallet-ledger-entry';

function brl(amount: string): Money {
  return Money.from({
    amount,
    currency: 'BRL',
  });
}

describe('WalletLedgerEntry', () => {
  test('cria um debito balanceado', () => {
    const entry = WalletLedgerEntry.create({
      id: 'entry-1',
      walletId: 'wallet-1',
      transactionId: 'transaction-1',
      direction: LedgerDirection.Debit,
      money: brl('10.00'),
      balanceBefore: brl('100.00'),
      balanceAfter: brl('90.00'),
    });

    expect(entry.isBalanced()).toBe(true);
    expect(entry.direction).toBe(LedgerDirection.Debit);
  });

  test('cria um credito balanceado', () => {
    const entry = WalletLedgerEntry.create({
      id: 'entry-2',
      walletId: 'wallet-1',
      transactionId: 'transaction-2',
      direction: LedgerDirection.Credit,
      money: brl('20.00'),
      balanceBefore: brl('90.00'),
      balanceAfter: brl('110.00'),
    });

    expect(entry.isBalanced()).toBe(true);
    expect(entry.direction).toBe(LedgerDirection.Credit);
  });

  test('rejeita debito com saldo final incorreto', () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: 'entry-3',
        walletId: 'wallet-1',
        transactionId: 'transaction-3',
        direction: LedgerDirection.Debit,
        money: brl('10.00'),
        balanceBefore: brl('100.00'),
        balanceAfter: brl('95.00'),
      }),
    ).toThrow('Lancamento do ledger inconsistente');
  });

  test('rejeita credito com saldo final incorreto', () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: 'entry-4',
        walletId: 'wallet-1',
        transactionId: 'transaction-4',
        direction: LedgerDirection.Credit,
        money: brl('20.00'),
        balanceBefore: brl('100.00'),
        balanceAfter: brl('115.00'),
      }),
    ).toThrow('Lancamento do ledger inconsistente');
  });

  test('rejeita valor zero', () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: 'entry-5',
        walletId: 'wallet-1',
        transactionId: 'transaction-5',
        direction: LedgerDirection.Credit,
        money: brl('0.00'),
        balanceBefore: brl('100.00'),
        balanceAfter: brl('100.00'),
      }),
    ).toThrow('O valor do lancamento deve ser positivo');
  });

  test('rejeita valor monetario negativo', () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: 'entry-6',
        walletId: 'wallet-1',
        transactionId: 'transaction-6',
        direction: LedgerDirection.Credit,
        money: brl('-10.00'),
        balanceBefore: brl('100.00'),
        balanceAfter: brl('90.00'),
      }),
    ).toThrow('O valor do lancamento deve ser positivo');
  });

  test('nao permite saldo final negativo', () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: 'entry-7',
        walletId: 'wallet-1',
        transactionId: 'transaction-7',
        direction: LedgerDirection.Debit,
        money: brl('20.00'),
        balanceBefore: brl('10.00'),
        balanceAfter: brl('-10.00'),
      }),
    ).toThrow();
  });

  test('rehydrate reconstrói um lancamento persistido', () => {
    const createdAt = new Date('2026-08-18T20:00:00Z');

    const entry = WalletLedgerEntry.rehydrate({
      id: 'entry-8',
      walletId: 'wallet-1',
      transactionId: 'transaction-8',
      direction: LedgerDirection.Credit,
      money: {
        amount: '25.00',
        currency: 'BRL',
      },
      balanceBefore: {
        amount: '100.00',
        currency: 'BRL',
      },
      balanceAfter: {
        amount: '125.00',
        currency: 'BRL',
      },
      createdAt,
    });

    expect(entry.id).toBe('entry-8');
    expect(entry.isBalanced()).toBe(true);
    expect(entry.createdAt).toEqual(createdAt);
  });
});