import { describe, expect, test } from 'bun:test';

import { Money } from './money';

describe('Money', () => {
  test('cria moeda BRL a partir de string decimal', () => {
    const money = Money.from({
      amount: '25.00',
      currency: 'BRL',
    });

    expect(money.toJSON()).toEqual({
      amount: '25.00',
      currency: 'BRL',
    });
  });

  test('creates zero money', () => {
    const money = Money.zero('BRL');

    expect(money.isZero()).toBe(true);
    expect(money.toString()).toBe('BRL 0.00');
  });

  test('adiciona dinheiro da mesma moeda', () => {
    const a = Money.from({
      amount: '10.50',
      currency: 'BRL',
    });

    const b = Money.from({
      amount: '4.25',
      currency: 'BRL',
    });

    expect(a.add(b).toJSON()).toEqual({
      amount: '14.75',
      currency: 'BRL',
    });
  });

  test('subtrai o valor exato', () => {
    const a = Money.from({
      amount: '10.00',
      currency: 'BRL',
    });

    const b = Money.from({
      amount: '0.10',
      currency: 'BRL',
    });

    expect(a.subtract(b).toJSON()).toEqual({
      amount: '9.90',
      currency: 'BRL',
    });
  });

  test('suporta valores monetarios negativos', () => {
    const money = Money.from({
      amount: '10.00',
      currency: 'BRL',
    });

    const negative = money.negate();

    expect(negative.isNegative()).toBe(true);
    expect(negative.toJSON()).toEqual({
      amount: '-10.00',
      currency: 'BRL',
    });
  });

  test('compara valores sem conversao numerica', () => {
    const ten = Money.from({
      amount: '10.00',
      currency: 'BRL',
    });

    const twenty = Money.from({
      amount: '20.00',
      currency: 'BRL',
    });

    expect(ten.isLessThan(twenty)).toBe(true);
    expect(twenty.isLessThan(ten)).toBe(false);
  });

  test('rejeita mais de duas casas decimais', () => {
    expect(() =>
      Money.from({
        amount: '10.001',
        currency: 'BRL',
      }),
    ).toThrow();
  });

  test('rejeita moeda nao suportada', () => {
    expect(() =>
      Money.from({
        amount: '10.00',
        currency: 'USD',
      }),
    ).toThrow('apenas a moeda BRL e aceita');
  });

  test('nao aceita notacao de expoente', () => {
    expect(() =>
      Money.from({
        amount: '1e3',
        currency: 'BRL',
      }),
    ).toThrow();
  });

  test('nao altera os valores originais', () => {
    const a = Money.from({
      amount: '10.00',
      currency: 'BRL',
    });

    const b = Money.from({
      amount: '5.00',
      currency: 'BRL',
    });

    const result = a.add(b);

    expect(a.toJSON().amount).toBe('10.00');
    expect(b.toJSON().amount).toBe('5.00');
    expect(result.toJSON().amount).toBe('15.00');
  });
});