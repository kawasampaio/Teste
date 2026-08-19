import { Money, type MoneyProps } from '../money/money';

export interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: MoneyProps;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WalletMovementType = 'CREDIT' | 'DEBIT';

export interface WalletMovement {
  walletId: string;
  playerId: string;
  type: WalletMovementType;
  money: Money;
  balanceBefore: Money;
  balanceAfter: Money;
  walletVersion: number;
  occurredAt: Date;
}

export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static open(props: {
    id: string;
    playerId: string;
    initialBalance: Money;
  }): Wallet {
    if (props.initialBalance.currency !== 'BRL') {
      throw new Error('Only BRL wallets are supported');
    }

    if (props.initialBalance.isNegative()) {
      throw new Error('Initial balance cannot be negative');
    }

    const now = new Date();

    return new Wallet(
      props.id,
      props.playerId,
      props.initialBalance.currency,
      props.initialBalance,
      1,
      now,
      now,
    );
  }

  /**
   * Reconstroi a Wallet a partir do estado persistido.
   * Não executa novamente transições de negócio.
   */
  static rehydrate(state: WalletState): Wallet {
    return new Wallet(
      state.id,
      state.playerId,
      state.currency,
      Money.from(state.balance),
      state.version,
      state.createdAt,
      state.updatedAt,
    );
  }

  get balance(): Money {
    return this._balance;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  debit(
    money: Money,
    occurredAt: Date = new Date(),
  ): WalletMovement {
    this.assertSameCurrency(money);

    if (!money.isPositive()) {
      throw new Error('Debit amount must be positive');
    }

    if (this._balance.isLessThan(money)) {
      throw new Error('Insufficient balance');
    }

    const balanceBefore = this._balance;
    const balanceAfter = this._balance.subtract(money);

    this._balance = balanceAfter;
    this._version += 1;
    this._updatedAt = occurredAt;

    return {
      walletId: this.id,
      playerId: this.playerId,
      type: 'DEBIT',
      money,
      balanceBefore,
      balanceAfter,
      walletVersion: this._version,
      occurredAt,
    };
  }

  credit(
  money: Money,
  occurredAt: Date = new Date(),
): WalletMovement {
  this.assertSameCurrency(money);

  if (!money.isPositive()) {
    throw new Error('Credit amount must be positive');
  }

  const balanceBefore = this._balance;
  const balanceAfter = this._balance.add(money);

  this._balance = balanceAfter;
  this._version += 1;
  this._updatedAt = occurredAt;

  return {
    walletId: this.id,
    playerId: this.playerId,
    type: 'CREDIT',
    money,
    balanceBefore,
    balanceAfter,
    walletVersion: this._version,
    occurredAt,
  };
}

  private assertSameCurrency(money: Money): void {
    if (money.currency !== this.currency) {
      throw new Error(
        `Currency mismatch: wallet=${this.currency}, money=${money.currency}`,
      );
    }
  }
}