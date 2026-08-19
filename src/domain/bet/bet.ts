import { Money, type MoneyProps } from '../money/money';

export enum BetResult {
  Win = 'WIN',
  Draw = 'DRAW',
  Loss = 'LOSS',
}

export interface BetState {
  id: string;
  wagerTransactionId: string;
  walletId: string;
  playerId: string;

  chosenNumber: number;
  drawnNumber: number;
  result: BetResult;

  stake: MoneyProps;
  payout: MoneyProps;
  balanceAfter: MoneyProps;

  createdAt: Date;
}

export class Bet {
  private constructor(
    public readonly id: string,
    public readonly wagerTransactionId: string,
    public readonly walletId: string,
    public readonly playerId: string,

    public readonly chosenNumber: number,
    public readonly drawnNumber: number,
    public readonly result: BetResult,

    public readonly stake: Money,
    public readonly payout: Money,
    public readonly balanceAfter: Money,

    public readonly createdAt: Date,
  ) {}

  static settle(props: {
    id: string;
    wagerTransactionId: string;
    walletId: string;
    playerId: string;

    chosenNumber: number;
    drawnNumber: number;

    stake: Money;
    payout: Money;
    balanceAfter: Money;

    createdAt?: Date;
  }): Bet {
    Bet.assertNumber(props.chosenNumber);
    Bet.assertNumber(props.drawnNumber);

    if (!props.stake.isPositive()) {
      throw new Error('Bet stake must be positive');
    }

    if (
      props.stake.currency !== props.payout.currency ||
      props.stake.currency !== props.balanceAfter.currency
    ) {
      throw new Error('Bet currency mismatch');
    }

    const result = Bet.calculateResult(
      props.chosenNumber,
      props.drawnNumber,
    );

    let expectedPayout: Money;

    switch (result) {
      case BetResult.Win:
        expectedPayout = props.stake.add(props.stake);
        break;

      case BetResult.Draw:
        expectedPayout = props.stake;
        break;

      case BetResult.Loss:
        expectedPayout = Money.zero(props.stake.currency);
        break;
    }

    if (!props.payout.equals(expectedPayout)) {
      throw new Error(
        'Bet payout is inconsistent with result',
      );
    }

    if (props.balanceAfter.isNegative()) {
      throw new Error(
        'Bet final balance cannot be negative',
      );
    }

    return new Bet(
      props.id,
      props.wagerTransactionId,
      props.walletId,
      props.playerId,
      props.chosenNumber,
      props.drawnNumber,
      result,
      props.stake,
      props.payout,
      props.balanceAfter,
      props.createdAt ?? new Date(),
    );
  }

  static rehydrate(state: BetState): Bet {
    return new Bet(
      state.id,
      state.wagerTransactionId,
      state.walletId,
      state.playerId,
      state.chosenNumber,
      state.drawnNumber,
      state.result,
      Money.from(state.stake),
      Money.from(state.payout),
      Money.from(state.balanceAfter),
      state.createdAt,
    );
  }

  get won(): boolean {
    return this.result === BetResult.Win;
  }

  get draw(): boolean {
    return this.result === BetResult.Draw;
  }

  get lost(): boolean {
    return this.result === BetResult.Loss;
  }

  private static calculateResult(
    chosenNumber: number,
    drawnNumber: number,
  ): BetResult {
    if (chosenNumber > drawnNumber) {
      return BetResult.Win;
    }

    if (chosenNumber === drawnNumber) {
      return BetResult.Draw;
    }

    return BetResult.Loss;
  }

  private static assertNumber(value: number): void {
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 9
    ) {
      throw new Error(
        'Bet number must be an integer between 1 and 9',
      );
    }
  }
}