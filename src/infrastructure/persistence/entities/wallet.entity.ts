import {
  Check,
  Entity,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wallets' })
@Unique({
  name: 'uq_wallet_player_currency',
  properties: ['playerId', 'currency'],
})
@Check({
  name: 'ck_wallet_balance_non_negative',
  expression: 'balance_minor >= 0',
})
@Check({
  name: 'ck_wallet_currency_brl',
  expression: "currency = 'BRL'",
})
@Check({
  name: 'ck_wallet_version_positive',
  expression: 'version >= 1',
})
export class WalletEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({
    fieldName: 'player_id',
    length: 255,
  })
  playerId!: string;

  @Property({
    length: 3,
  })
  currency!: string;

  @Property({
    fieldName: 'balance_minor',
    columnType: 'bigint',
  })
  balanceMinor!: bigint;

  @Property()
  version!: number;

  @Property({
    fieldName: 'created_at',
    columnType: 'timestamptz',
  })
  createdAt!: Date;

  @Property({
    fieldName: 'updated_at',
    columnType: 'timestamptz',
  })
  updatedAt!: Date;
}