import {
  Check,
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';

import { DailyLedgerEntity } from './daily-ledger.entity';
import { WagerTransactionEntity } from './wager-transaction.entity';
import { WalletEntity } from './wallet.entity';

@Entity({ tableName: 'wallet_ledger_entries' })
@Unique({
  name: 'uq_ledger_transaction',
  properties: ['transactionId'],
})
@Unique({
  name: 'uq_ledger_wallet_version',
  properties: ['walletId', 'walletVersion'],
})
@Index({
  name: 'idx_ledger_wallet_created',
  properties: ['walletId', 'createdAt'],
})
@Check({
  name: 'ck_ledger_amount_positive',
  expression: 'amount_minor > 0',
})
@Check({
  name: 'ck_ledger_balance_before',
  expression: 'balance_before_minor >= 0',
})
@Check({
  name: 'ck_ledger_balance_after',
  expression: 'balance_after_minor >= 0',
})
@Check({
  name: 'ck_ledger_currency_brl',
  expression: "currency = 'BRL'",
})
@Check({
  name: 'ck_ledger_version_positive',
  expression: 'wallet_version >= 1',
})
@Check({
  name: 'ck_ledger_direction',
  expression: "direction IN ('DEBIT', 'CREDIT')",
})
@Check({
  name: 'ck_ledger_balanced',
  expression: `
    (
      direction = 'DEBIT'
      AND balance_before_minor - amount_minor = balance_after_minor
    )
    OR
    (
      direction = 'CREDIT'
      AND balance_before_minor + amount_minor = balance_after_minor
    )
  `,
})
export class WalletLedgerEntryEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => DailyLedgerEntity, {
    fieldName: 'daily_ledger_id',
    mapToPk: true,
    deleteRule: 'restrict',
  })
  dailyLedgerId!: string;

  @ManyToOne(() => WalletEntity, {
    fieldName: 'wallet_id',
    mapToPk: true,
    deleteRule: 'restrict',
  })
  walletId!: string;

  @ManyToOne(() => WagerTransactionEntity, {
    fieldName: 'transaction_id',
    mapToPk: true,
    deleteRule: 'restrict',
  })
  transactionId!: string;

  @Property({
    fieldName: 'wallet_version',
  })
  walletVersion!: number;

  @Property({
    length: 10,
  })
  direction!: string;

  @Property({
    fieldName: 'amount_minor',
    columnType: 'bigint',
  })
  amountMinor!: bigint;

  @Property({
    length: 3,
  })
  currency!: string;

  @Property({
    fieldName: 'balance_before_minor',
    columnType: 'bigint',
  })
  balanceBeforeMinor!: bigint;

  @Property({
    fieldName: 'balance_after_minor',
    columnType: 'bigint',
  })
  balanceAfterMinor!: bigint;

  @Property({
    fieldName: 'created_at',
    columnType: 'timestamptz',
  })
  createdAt!: Date;
}