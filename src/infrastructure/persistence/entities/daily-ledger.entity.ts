import {
  Check,
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';

import { WalletEntity } from './wallet.entity';

@Entity({ tableName: 'daily_ledgers' })
@Unique({
  name: 'uq_daily_ledger_player_date',
  properties: ['playerId', 'ledgerDate'],
})
@Check({
  name: 'ck_daily_ledger_currency_brl',
  expression: "currency = 'BRL'",
})
export class DailyLedgerEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

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
    fieldName: 'ledger_date',
    columnType: 'date',
  })
  ledgerDate!: string;

  @Property({
    length: 3,
  })
  currency!: string;

  @Property({
    fieldName: 'created_at',
    columnType: 'timestamptz',
  })
  createdAt!: Date;
}