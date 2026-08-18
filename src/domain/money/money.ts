import Decimal from 'decimal.js';

export interface MoneyProps {
  amount: string;
  currency: string;
}

export class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {}

  static from(props: MoneyProps): Money {
    Money.assertValidCurrency(props.currency);
    Money.assertValidAmount(props.amount);

    const value = new Decimal(props.amount);

    if (!value.isFinite()) {
      throw new Error('o valor do dinheiro deve ser finito');
    }

    if (value.decimalPlaces() > 2) {
      throw new Error('o dinheiro suporta no maximo 2 casas decimais');
    }

    return new Money(value, props.currency);
  }

  static zero(currency: string): Money {
    return Money.from({
      amount: '0.00',
      currency,
    });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);

    return Money.from({
      amount: this.value.plus(other.value).toFixed(2),
      currency: this.currency,
    });
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);

    return Money.from({
      amount: this.value.minus(other.value).toFixed(2),
      currency: this.currency,
    });
  }

  negate(): Money {
    return Money.from({
      amount: this.value.negated().toFixed(2),
      currency: this.currency,
    });
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative() && !this.value.isZero();
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);

    return this.value.lessThan(other.value);
  }

  equals(other: Money): boolean {
    return (
      this.currency === other.currency &&
      this.value.equals(other.value)
    );
  }

  toJSON(): MoneyProps {
    return {
      amount: this.value.toFixed(2),
      currency: this.currency,
    };
  }

  toString(): string {
    return `${this.currency} ${this.value.toFixed(2)}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Currency mismatch: ${this.currency} != ${other.currency}`,
      );
    }
  }

  private static assertValidCurrency(currency: string): void {
    if (currency !== 'BRL') {
      throw new Error('apenas a moeda BRL e aceita');
    }
  }

  private static assertValidAmount(amount: string): void {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) {
      throw new Error('valor monetario invalido');
    }
  }
}