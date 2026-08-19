export interface IntegrationEvent<
  TPayload extends Record<string, unknown>,
> {
  id: string;
  aggregateId: string;
  type: string;
  payload: Readonly<TPayload>;
  occurredAt: Date;
}

export interface OutboxMessageState {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: Date;

  attempts: number;
  nextAttemptAt?: Date;
  publishedAt?: Date;
}

export class OutboxAlreadyPublishedError extends Error {
  constructor() {
    super('Outbox message is already published');
    this.name = 'OutboxAlreadyPublishedError';
  }
}

export class OutboxMessage {
  private static readonly MAX_BACKOFF_SECONDS = 30;

  private constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly eventType: string,
    public readonly payload: Readonly<Record<string, unknown>>,
    public readonly occurredAt: Date,

    private _attempts: number,
    private _nextAttemptAt?: Date,
    private _publishedAt?: Date,
  ) {}

  static enqueue(
    event: IntegrationEvent<Record<string, unknown>>,
  ): OutboxMessage {
    if (!event.id.trim()) {
      throw new Error('Event id is required');
    }

    if (!event.aggregateId.trim()) {
      throw new Error('Aggregate id is required');
    }

    if (!event.type.trim()) {
      throw new Error('Event type is required');
    }

    return new OutboxMessage(
      event.id,
      event.aggregateId,
      event.type,
      Object.freeze({ ...event.payload }),
      event.occurredAt,
      0,
    );
  }

  static rehydrate(state: OutboxMessageState): OutboxMessage {
    return new OutboxMessage(
      state.id,
      state.aggregateId,
      state.eventType,
      Object.freeze({ ...state.payload }),
      state.occurredAt,
      state.attempts,
      state.nextAttemptAt,
      state.publishedAt,
    );
  }

  get attempts(): number {
    return this._attempts;
  }

  get nextAttemptAt(): Date | undefined {
    return this._nextAttemptAt;
  }

  get publishedAt(): Date | undefined {
    return this._publishedAt;
  }

  isPending(): boolean {
    return this._publishedAt === undefined;
  }

  isDue(now: Date): boolean {
    if (!this.isPending()) {
      return false;
    }

    if (this._nextAttemptAt === undefined) {
      return true;
    }

    return this._nextAttemptAt.getTime() <= now.getTime();
  }

  markPublished(at: Date): void {
    if (this._publishedAt !== undefined) {
      return;
    }

    this._publishedAt = at;
    this._nextAttemptAt = undefined;
  }

  scheduleRetry(now: Date): void {
    if (!this.isPending()) {
      throw new OutboxAlreadyPublishedError();
    }

    this._attempts += 1;

    const delaySeconds = Math.min(
      2 ** (this._attempts - 1),
      OutboxMessage.MAX_BACKOFF_SECONDS,
    );

    this._nextAttemptAt = new Date(
      now.getTime() + delaySeconds * 1000,
    );
  }
}