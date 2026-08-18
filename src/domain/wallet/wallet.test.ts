import { describe, expect, test } from 'bun:test';

import { Money } from '../money/money';
import { Wallet } from './wallet';

function brl(amount: string): Money {
  return Money.from({
    amount,
    currency: 'BRL',
  });
}

describe('Wallet', () => {
  test('opens with version 1', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('100.00'),
    });

    expect(wallet.version).toBe(1);

    expect(wallet.balance.toJSON()).toEqual({
      amount: '100.00',
      currency: 'BRL',
    });
  });

  test('debits balance and increments version', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('100.00'),
    });

    const movement = wallet.debit(brl('10.00'));

    expect(wallet.balance.equals(brl('90.00'))).toBe(true);
    expect(wallet.version).toBe(2);

    expect(movement.type).toBe('DEBIT');
    expect(movement.balanceBefore.equals(brl('100.00'))).toBe(true);
    expect(movement.balanceAfter.equals(brl('90.00'))).toBe(true);
    expect(movement.walletVersion).toBe(2);
  });

  test('credits balance and increments version', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('100.00'),
    });

    const movement = wallet.credit(brl('20.00'));

    expect(wallet.balance.equals(brl('120.00'))).toBe(true);
    expect(wallet.version).toBe(2);

    expect(movement.type).toBe('CREDIT');
    expect(movement.balanceBefore.equals(brl('100.00'))).toBe(true);
    expect(movement.balanceAfter.equals(brl('120.00'))).toBe(true);
  });

  test('does not allow negative balance', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('10.00'),
    });

    expect(() => {
      wallet.debit(brl('20.00'));
    }).toThrow('Insufficient balance');

    expect(wallet.balance.equals(brl('10.00'))).toBe(true);

    // Falha não altera a versão.
    expect(wallet.version).toBe(1);
  });

  test('allows balance to reach exactly zero', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('10.00'),
    });

    wallet.debit(brl('10.00'));

    expect(wallet.balance.isZero()).toBe(true);
    expect(wallet.version).toBe(2);
  });

  test('does not allow zero debit', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('10.00'),
    });

    expect(() => {
      wallet.debit(brl('0.00'));
    }).toThrow('Debit amount must be positive');

    expect(wallet.version).toBe(1);
  });

  test('does not allow zero credit', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('10.00'),
    });

    expect(() => {
      wallet.credit(brl('0.00'));
    }).toThrow('Credit amount must be positive');

    expect(wallet.version).toBe(1);
  });

  test('does not allow negative initial balance', () => {
    expect(() => {
      Wallet.open({
        id: 'wallet-1',
        playerId: 'player-1',
        initialBalance: brl('-10.00'),
      });
    }).toThrow('Initial balance cannot be negative');
  });

  test('increments version only when balance changes', () => {
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: brl('100.00'),
    });

    expect(wallet.version).toBe(1);

    wallet.debit(brl('10.00'));

    expect(wallet.version).toBe(2);

    wallet.credit(brl('20.00'));

    expect(wallet.version).toBe(3);
  });
});