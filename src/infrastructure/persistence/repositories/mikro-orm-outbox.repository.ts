import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import type { OutboxRepositoryPort } from '../../../application/ports/outbox-repository.port';

import { OutboxMessage } from '../../../domain/messaging/outbox-message';

import { OutboxMessageEntity } from '../entities/outbox-message.entity';

@Injectable()
export class MikroOrmOutboxRepository
  implements OutboxRepositoryPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async enqueue(
    message: OutboxMessage,
  ): Promise<void> {
    const entity = new OutboxMessageEntity();

    entity.id = message.id;
    entity.aggregateId = message.aggregateId;
    entity.eventType = message.eventType;
    entity.payload = {
      ...message.payload,
    };

    entity.occurredAt = message.occurredAt;
    entity.attempts = message.attempts;

    entity.nextAttemptAt =
      message.nextAttemptAt ?? null;

    entity.publishedAt =
      message.publishedAt ?? null;

    this.em.persist(entity);

    await this.em.flush();
  }

  async persist(
    message: OutboxMessage,
  ): Promise<void> {
    const entity = await this.em.findOne(
      OutboxMessageEntity,
      {
        id: message.id,
      },
    );

    if (!entity) {
      throw new Error(
        `Outbox message ${message.id} not found`,
      );
    }

    entity.attempts =
      message.attempts;

    entity.nextAttemptAt =
      message.nextAttemptAt ?? null;

    entity.publishedAt =
      message.publishedAt ?? null;

    await this.em.flush();
  }
}