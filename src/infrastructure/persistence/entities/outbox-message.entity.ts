import {
  Check,
  Entity,
  PrimaryKey,
  Property,
} from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'outbox_messages' })
@Check({
  name: 'ck_outbox_attempts_non_negative',
  expression: 'attempts >= 0',
})
export class OutboxMessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({
    fieldName: 'aggregate_id',
    length: 255,
  })
  aggregateId!: string;

  @Property({
    fieldName: 'event_type',
    length: 255,
  })
  eventType!: string;

  @Property({
    columnType: 'jsonb',
  })
  payload!: Record<string, unknown>;

  @Property({
    fieldName: 'occurred_at',
    columnType: 'timestamptz',
  })
  occurredAt!: Date;

  @Property({
    default: 0,
  })
  attempts!: number;

  @Property({
    fieldName: 'next_attempt_at',
    columnType: 'timestamptz',
    nullable: true,
  })
  nextAttemptAt: Date | null = null;

  @Property({
    fieldName: 'published_at',
    columnType: 'timestamptz',
    nullable: true,
  })
 publishedAt: Date | null = null;
}