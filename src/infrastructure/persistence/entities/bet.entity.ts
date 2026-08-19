import {
  Check,
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';

import { WalletEntity } from './wallet.entity';
import { WagerTransactionEntity } from './wager-transaction.entity';

@Entity({ tableName: 'bets' })
@Unique({
  name: 'uq_bet_wager_transaction',
  properties: ['wagerTransactionId'],
})
@Check({
  name: 'ck_bet_chosen_number',
  expression: 'chosen_number between 1 and 9',
})
@Check({
  name: 'ck_bet_drawn_number',
  expression: 'drawn_number between 1 and 9',
})
@Check({
  name: 'ck_bet_stake_positive',
  expression: 'stake_minor > 0',
})
@Check({
  name: 'ck_bet_payout_non_negative',
  expression: 'payout_minor >= 0',
})
@Check({
  name: 'ck_bet_balance_non_negative',
  expression: 'balance_after_minor >= 0',
})
@Check({
  name: 'ck_bet_currency_brl',
  expression: "currency = 'BRL'",
})
@Check({
  name: 'ck_bet_result_consistency',
  expression: `
    (
      result = 'WIN'
      and chosen_number > drawn_number
      and payout_minor = stake_minor * 2
    )
    or
    (
      result = 'DRAW'
      and chosen_number = drawn_number
      and payout_minor = stake_minor
    )
    or
    (
      result = 'LOSS'
      and chosen_number < drawn_number
      and payout_minor = 0
    )
  `,
})
export class BetEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => WagerTransactionEntity, {
    fieldName: 'wager_transaction_id',
    mapToPk: true,
    deleteRule: 'restrict',
  })
  wagerTransactionId!: string;

  @ManyToOne(() => WalletEntity, {
    fieldName: 'wallet_id',
    mapToPk: true,
    deleteRule: 'restrict',
  })
  walletId!: string;

  @Property({
    fieldName: 'player_id',
    length: 255,
  })
  playerId!: string;

  @Property({
    fieldName: 'chosen_number',
    columnType: 'smallint',
  })
  chosenNumber!: number;

  @Property({
    fieldName: 'drawn_number',
    columnType: 'smallint',
  })
  drawnNumber!: number;

  @Property({
    fieldName: 'stake_minor',
    columnType: 'bigint',
  })
  stakeMinor!: bigint;

  @Property({
    fieldName: 'payout_minor',
    columnType: 'bigint',
  })
  payoutMinor!: bigint;

  @Property({
    fieldName: 'balance_after_minor',
    columnType: 'bigint',
  })
  balanceAfterMinor!: bigint;

  @Property({
    length: 3,
  })
  currency!: string;

 @Property({
  length: 10,
})
result!: string;

  @Property({
    fieldName: 'created_at',
    columnType: 'timestamptz',
  })
  createdAt!: Date;
}