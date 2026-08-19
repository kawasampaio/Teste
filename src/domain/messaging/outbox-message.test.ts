import { describe, expect, test } from 'bun:test';

import {
  OutboxAlreadyPublishedError,
  OutboxMessage,
} from './outbox-message';

function createOutbox(): OutboxMessage {
  return OutboxMessage.enqueue({
    id: 'event-1',
    aggregateId: 'wallet-1',
    type: 'wallet.balance.changed',
    payload: {
      walletId: 'wallet-1',
      balance: '90.00',
      currency: 'BRL',
    },
    occurredAt: new Date('2026-08-19T10:00:00Z'),
  });
}

describe('OutboxMessage', () => {
  test('nova mensagem nasce pendente', () => {
    const outbox = createOutbox();

    expect(outbox.isPending()).toBe(true);
    expect(outbox.attempts).toBe(0);
    expect(outbox.publishedAt).toBeUndefined();
  });

  test('nova mensagem esta pronta para publicacao', () => {
    const outbox = createOutbox();

    expect(outbox.isDue(new Date())).toBe(true);
  });

  test('marca mensagem como publicada', () => {
    const outbox = createOutbox();

    const publishedAt = new Date();

    outbox.markPublished(publishedAt);

    expect(outbox.isPending()).toBe(false);
    expect(outbox.publishedAt).toEqual(publishedAt);
    expect(outbox.nextAttemptAt).toBeUndefined();
  });

  test('mensagem publicada nao fica mais disponivel', () => {
    const outbox = createOutbox();

    outbox.markPublished(new Date());

    expect(outbox.isDue(new Date())).toBe(false);
  });

  test('primeira falha agenda retry em 1 segundo', () => {
    const outbox = createOutbox();

    const now = new Date('2026-08-19T10:00:00Z');

    outbox.scheduleRetry(now);

    expect(outbox.attempts).toBe(1);

    expect(outbox.nextAttemptAt).toEqual(
      new Date('2026-08-19T10:00:01Z'),
    );
  });

  test('segunda falha agenda retry em 2 segundos', () => {
    const outbox = createOutbox();

    const first = new Date('2026-08-19T10:00:00Z');

    outbox.scheduleRetry(first);

    const second = new Date('2026-08-19T10:00:01Z');

    outbox.scheduleRetry(second);

    expect(outbox.attempts).toBe(2);

    expect(outbox.nextAttemptAt).toEqual(
      new Date('2026-08-19T10:00:03Z'),
    );
  });

  test('respeita limite maximo de backoff', () => {
    const outbox = createOutbox();

    let now = new Date('2026-08-19T10:00:00Z');

    for (let i = 0; i < 10; i += 1) {
      outbox.scheduleRetry(now);

      now = outbox.nextAttemptAt!;
    }

    const previous = now.getTime();

    outbox.scheduleRetry(now);

    const delay =
      outbox.nextAttemptAt!.getTime() - previous;

    expect(delay).toBe(30_000);
  });

  test('nao permite retry depois de publicada', () => {
    const outbox = createOutbox();

    outbox.markPublished(new Date());

    expect(() => {
      outbox.scheduleRetry(new Date());
    }).toThrow(OutboxAlreadyPublishedError);
  });

  test('markPublished e idempotente', () => {
    const outbox = createOutbox();

    const firstPublication =
      new Date('2026-08-19T10:00:00Z');

    outbox.markPublished(firstPublication);

    outbox.markPublished(
      new Date('2026-08-19T11:00:00Z'),
    );

    expect(outbox.publishedAt).toEqual(firstPublication);
  });

  test('rehydrate recupera estado pendente', () => {
    const nextAttemptAt =
      new Date('2026-08-19T10:01:00Z');

    const outbox = OutboxMessage.rehydrate({
      id: 'event-1',
      aggregateId: 'wallet-1',
      eventType: 'wallet.balance.changed',
      payload: {
        walletId: 'wallet-1',
      },
      occurredAt: new Date('2026-08-19T10:00:00Z'),
      attempts: 3,
      nextAttemptAt,
    });

    expect(outbox.attempts).toBe(3);
    expect(outbox.nextAttemptAt).toEqual(nextAttemptAt);
    expect(outbox.isPending()).toBe(true);
  });
});