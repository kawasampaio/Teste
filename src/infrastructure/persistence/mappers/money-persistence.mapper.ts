import { Money } from '../../../domain/money/money';

export class MoneyPersistenceMapper {
  private static readonly MINOR_FACTOR = 100n;

  static toMinor(money: Money): bigint {
    const { amount } = money.toJSON();

    const negative = amount.startsWith('-');
    const unsigned = negative ? amount.slice(1) : amount;

    const [wholePart = '0', fractionPart = ''] = unsigned.split('.');

    const paddedFraction = fractionPart.padEnd(2, '0');

    const whole = BigInt(wholePart);
    const fraction = BigInt(paddedFraction || '0');

    const minor =
      whole * MoneyPersistenceMapper.MINOR_FACTOR + fraction;

    return negative ? -minor : minor;
  }

  static fromMinor(
    amountMinor: bigint,
    currency: string,
  ): Money {
    const negative = amountMinor < 0n;

    const absoluteMinor = negative
      ? -amountMinor
      : amountMinor;

    const whole =
      absoluteMinor / MoneyPersistenceMapper.MINOR_FACTOR;

    const fraction =
      absoluteMinor % MoneyPersistenceMapper.MINOR_FACTOR;

    const amount =
      `${negative ? '-' : ''}${whole.toString()}.` +
      fraction.toString().padStart(2, '0');

    return Money.from({
      amount,
      currency,
    });
  }
}