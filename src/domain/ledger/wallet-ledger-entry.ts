import { Money, type MoneyProps } from '../money/money';

export enum LedgerDirection {
  Debit = 'DEBIT',
  Credit = 'CREDIT',
}

export interface CreateLedgerEntryProps {
  id: string;
  walletId: string;
  transactionId: string;
  direction: LedgerDirection;
  money: Money;
  balanceBefore: Money;
  balanceAfter: Money;
  createdAt?: Date;
}

export interface LedgerEntryState {
  id: string;
  walletId: string;
  transactionId: string;
  direction: LedgerDirection;
  money: MoneyProps;
  balanceBefore: MoneyProps;
  balanceAfter: MoneyProps;
  createdAt: Date;
}

export class WalletLedgerEntry {
  private constructor(
    public readonly id: string,
    public readonly walletId: string,
    public readonly transactionId: string,
    public readonly direction: LedgerDirection,
    public readonly money: Money,
    public readonly balanceBefore: Money,
    public readonly balanceAfter: Money,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateLedgerEntryProps): WalletLedgerEntry {
    if (!props.money.isPositive()) {
      throw new Error('O valor do lancamento deve ser positivo');
    }

    WalletLedgerEntry.assertCurrencies(props);

    const entry = new WalletLedgerEntry(
      props.id,
      props.walletId,
      props.transactionId,
      props.direction,
      props.money,
      props.balanceBefore,
      props.balanceAfter,
      props.createdAt ?? new Date(),
    );

    if (!entry.isBalanced()) {
      throw new Error('Lancamento do ledger inconsistente');
    }

    if (
      props.balanceBefore.isNegative() ||
      props.balanceAfter.isNegative()
    ) {
      throw new Error('Saldo do ledger nao pode ser negativo');
    }

    return entry;
  }

  /**
   * Reconstrucao de um registro ja persistido.
   * Nao reaplica regras de criacao.
   */
  static rehydrate(state: LedgerEntryState): WalletLedgerEntry {
    return new WalletLedgerEntry(
      state.id,
      state.walletId,
      state.transactionId,
      state.direction,
      Money.from(state.money),
      Money.from(state.balanceBefore),
      Money.from(state.balanceAfter),
      state.createdAt,
    );
  }

  isBalanced(): boolean {
    if (this.direction === LedgerDirection.Credit) {
      return this.balanceBefore
        .add(this.money)
        .equals(this.balanceAfter);
    }

    return this.balanceBefore
      .subtract(this.money)
      .equals(this.balanceAfter);
  }

  private static assertCurrencies(
    props: CreateLedgerEntryProps,
  ): void {
    const currency = props.money.currency;

    if (
      props.balanceBefore.currency !== currency ||
      props.balanceAfter.currency !== currency
    ) {
      throw new Error(
        'A moeda do lancamento deve ser igual a moeda dos saldos',
      );
    }
  }
}