import { describe, expect, test } from 'bun:test';

import {
  InboxAlreadyProcessedError,
  InboxMessage,
} from './inbox-message';

describe('InboxMessage', () => {
  test('recebe uma nova mensagem ainda nao processada', () => {
    const inbox = InboxMessage.receive({
      messageId: 'message-1',
      consumerName: 'wager-consumer',
      payloadHash: 'hash-1',
    });

    expect(inbox.messageId).toBe('message-1');
    expect(inbox.consumerName).toBe('wager-consumer');
    expect(inbox.isProcessed()).toBe(false);
    expect(inbox.processedAt).toBeUndefined();
  });

  test('marca mensagem como processada', () => {
    const inbox = InboxMessage.receive({
      messageId: 'message-1',
      consumerName: 'wager-consumer',
      payloadHash: 'hash-1',
    });

    const processedAt = new Date();

    inbox.markProcessed(processedAt);

    expect(inbox.isProcessed()).toBe(true);
    expect(inbox.processedAt).toEqual(processedAt);
  });

  test('nao permite processar a mesma instancia duas vezes', () => {
    const inbox = InboxMessage.receive({
      messageId: 'message-1',
      consumerName: 'wager-consumer',
      payloadHash: 'hash-1',
    });

    inbox.markProcessed(new Date());

    expect(() => {
      inbox.markProcessed(new Date());
    }).toThrow(InboxAlreadyProcessedError);
  });

  test('reconstroi uma mensagem processada', () => {
    const receivedAt = new Date('2026-08-19T10:00:00Z');
    const processedAt = new Date('2026-08-19T10:00:05Z');

    const inbox = InboxMessage.rehydrate({
      messageId: 'message-1',
      consumerName: 'wager-consumer',
      payloadHash: 'hash-1',
      receivedAt,
      processedAt,
    });

    expect(inbox.isProcessed()).toBe(true);
    expect(inbox.receivedAt).toEqual(receivedAt);
    expect(inbox.processedAt).toEqual(processedAt);
  });

  test('exige messageId', () => {
    expect(() =>
      InboxMessage.receive({
        messageId: '',
        consumerName: 'wager-consumer',
        payloadHash: 'hash-1',
      }),
    ).toThrow();
  });
});