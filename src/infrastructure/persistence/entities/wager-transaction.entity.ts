import {
  Check,
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';

import { WalletEntity } from './wallet.entity';

@Entity({ tableName: 'wager_transactions' })
@Unique({
  name: 'uq_wager_provider_idempotency',
  properties: ['providerId', 'idempotencyKey'],
})
@Unique({
  name: 'uq_wager_provider_external_transaction',
  properties: ['providerId', 'externalTransactionId'],
})
@Index({
  name: 'idx_wager_wallet_created',
  properties: ['walletId', 'createdAt'],
})
@Check({
  name: 'ck_wager_amount_positive',
  expression: 'amount_minor > 0',
})
@Check({
  name: 'ck_wager_currency_brl',
  expression: "currency = 'BRL'",
})
@Check({
  name: 'ck_wager_kind',
  expression: `
    kind IN (
      'OPENING',
      'BET',
      'WIN',
      'LOSS',
      'REFUND',
      'ROLLBACK'
    )
  `,
})
@Check({
  name: 'ck_wager_status',
  expression: `
    status IN (
      'PENDING',
      'PENDING_REFERENCE',
      'PROCESSED',
      'REJECTED',
      'FAILED'
    )
  `,
})
@Check({
  name: 'ck_wager_reference_required',
  expression: `
    (
      kind IN ('REFUND', 'ROLLBACK')
      AND reference_external_transaction_id IS NOT NULL
    )
    OR
    (
      kind NOT IN ('REFUND', 'ROLLBACK')
      AND reference_external_transaction_id IS NULL
    )
  `,
})
@Check({
  name: 'ck_wager_opening_internal',
  expression: `
    kind <> 'OPENING'
    OR provider_id = 'internal'
  `,
})
export class WagerTransactionEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({
    fieldName: 'provider_id',
    length: 100,
  })
  providerId!: string;

  @Property({
    fieldName: 'external_transaction_id',
    length: 255,
  })
  externalTransactionId!: string;

  @Property({
    fieldName: 'idempotency_key',
    length: 255,
  })
  idempotencyKey!: string;

  @Property({
    fieldName: 'payload_hash',
    length: 128,
  })
  payloadHash!: string;

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
    fieldName: 'round_id',
    length: 255,
  })
  roundId!: string;

  @Property({
    fieldName: 'game_id',
    length: 255,
  })
  gameId!: string;

  @Property({
    length: 32,
  })
  kind!: string;

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
    fieldName: 'reference_external_transaction_id',
    length: 255,
    nullable: true,
  })
  referenceExternalTransactionId: string | null = null;

  @ManyToOne(() => WagerTransactionEntity, {
    fieldName: 'reference_transaction_id',
    mapToPk: true,
    nullable: true,
    deleteRule: 'restrict',
  })
  referenceTransactionId: string | null = null;

  @Property({
    length: 32,
  })
  status!: string;

  @Property({
    fieldName: 'failure_code',
    length: 64,
    nullable: true,
  })
  failureCode: string | null = null;

  @Property({
    fieldName: 'created_at',
    columnType: 'timestamptz',
  })
  createdAt!: Date;

  @Property({
    fieldName: 'processed_at',
    columnType: 'timestamptz',
    nullable: true,
  })
  processedAt: Date | null = null;
}