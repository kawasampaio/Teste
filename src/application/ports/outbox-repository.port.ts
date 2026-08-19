import { OutboxMessage } from '../../domain/messaging/outbox-message';

export const OUTBOX_REPOSITORY =
  Symbol('OUTBOX_REPOSITORY');

export interface OutboxRepositoryPort {
  enqueue(
    message: OutboxMessage,
  ): Promise<void>;

  persist(
    message: OutboxMessage,
  ): Promise<void>;
}