import { Money, type MoneyProps } from '../money/money';
import { LedgerDirection } from '../ledger/wallet-ledger-entry';

export enum WagerTransactionKind {
  Opening = 'OPENING',
  Bet = 'BET',
  Win = 'WIN',
  Loss = 'LOSS',
  Refund = 'REFUND',
  Rollback = 'ROLLBACK',
}

export enum WagerTransactionStatus {
  Pending = 'PENDING',
  PendingReference = 'PENDING_REFERENCE',
  Processed = 'PROCESSED',
  Rejected = 'REJECTED',
  Failed = 'FAILED',
}

export enum FailureCode {
  InsufficientBalance = 'INSUFFICIENT_BALANCE',
  InvalidReference = 'INVALID_REFERENCE',
  CurrencyMismatch = 'CURRENCY_MISMATCH',
  InvalidAmount = 'INVALID_AMOUNT',
  IdempotencyConflict = 'IDEMPOTENCY_CONFLICT',
  PermanentInfrastructureError = 'PERMANENT_INFRASTRUCTURE_ERROR',
}

export class InvalidTransactionStateError extends Error {
  constructor(
    current: WagerTransactionStatus,
    target: WagerTransactionStatus,
  ) {
    super(
      `Invalid transaction state transition: ${current} -> ${target}`,
    );

    this.name = 'InvalidTransactionStateError';
  }
}

export interface CreateWagerTransactionProps {
  id: string;
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;

  walletId: string;
  playerId: string;

  roundId: string;
  gameId: string;

  kind: WagerTransactionKind;
  money: Money;

  referenceExternalTransactionId?: string;

  createdAt?: Date;

  /**
   * OPENING nunca deve ser aceito de HTTP/SQS.
   * Somente código interno pode definir true.
   */
  internal?: boolean;
}

export interface WagerTransactionState {
  id: string;
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;

  walletId: string;
  playerId: string;

  roundId: string;
  gameId: string;

  kind: WagerTransactionKind;
  money: MoneyProps;

  referenceExternalTransactionId?: string;

  createdAt: Date;

  status: WagerTransactionStatus;
  referenceTransactionId?: string;
  failureCode?: FailureCode;
  processedAt?: Date;
}

export class WagerTransaction {
  private constructor(
    public readonly id: string,
    public readonly providerId: string,
    public readonly externalTransactionId: string,
    public readonly idempotencyKey: string,
    public readonly payloadHash: string,
    public readonly walletId: string,
    public readonly playerId: string,
    public readonly roundId: string,
    public readonly gameId: string,
    public readonly kind: WagerTransactionKind,
    public readonly money: Money,
    public readonly referenceExternalTransactionId: string | undefined,
    public readonly createdAt: Date,

    private _status: WagerTransactionStatus,
    private _referenceTransactionId?: string,
    private _failureCode?: FailureCode,
    private _processedAt?: Date,
  ) {}

  static create(
    props: CreateWagerTransactionProps,
  ): WagerTransaction {
    if (!props.money.isPositive()) {
      throw new Error('Transaction amount must be positive');
    }

    if (
      props.kind === WagerTransactionKind.Opening &&
      props.internal !== true
    ) {
      throw new Error(
        'OPENING transaction can only be created internally',
      );
    }

    const requiresReference =
      props.kind === WagerTransactionKind.Refund ||
      props.kind === WagerTransactionKind.Rollback;

    if (
      requiresReference &&
      !props.referenceExternalTransactionId
    ) {
      throw new Error(
        `${props.kind} transaction requires a reference transaction`,
      );
    }

    if (
      !requiresReference &&
      props.referenceExternalTransactionId
    ) {
      throw new Error(
        `${props.kind} transaction cannot have a reference transaction`,
      );
    }

    return new WagerTransaction(
      props.id,
      props.providerId,
      props.externalTransactionId,
      props.idempotencyKey,
      props.payloadHash,
      props.walletId,
      props.playerId,
      props.roundId,
      props.gameId,
      props.kind,
      props.money,
      props.referenceExternalTransactionId,
      props.createdAt ?? new Date(),

      WagerTransactionStatus.Pending,
    );
  }

  static rehydrate(
    state: WagerTransactionState,
  ): WagerTransaction {
    return new WagerTransaction(
      state.id,
      state.providerId,
      state.externalTransactionId,
      state.idempotencyKey,
      state.payloadHash,
      state.walletId,
      state.playerId,
      state.roundId,
      state.gameId,
      state.kind,
      Money.from(state.money),
      state.referenceExternalTransactionId,
      state.createdAt,
      state.status,
      state.referenceTransactionId,
      state.failureCode,
      state.processedAt,
    );
  }

  get status(): WagerTransactionStatus {
    return this._status;
  }

  get referenceTransactionId(): string | undefined {
    return this._referenceTransactionId;
  }

  get failureCode(): FailureCode | undefined {
    return this._failureCode;
  }

  get processedAt(): Date | undefined {
    return this._processedAt;
  }

  markProcessed(
    referenceTransactionId: string | undefined,
    at: Date,
  ): void {
    this.assertNotTerminal(WagerTransactionStatus.Processed);

    if (
      this.requiresReference() &&
      referenceTransactionId === undefined
    ) {
      throw new Error(
        `${this.kind} requires a resolved reference transaction`,
      );
    }

    this._referenceTransactionId = referenceTransactionId;
    this._processedAt = at;
    this._status = WagerTransactionStatus.Processed;
  }

  markPendingReference(): void {
    this.assertNotTerminal(
      WagerTransactionStatus.PendingReference,
    );

    if (!this.requiresReference()) {
      throw new Error(
        `${this.kind} cannot wait for a reference transaction`,
      );
    }

    this._status = WagerTransactionStatus.PendingReference;
  }

  reject(code: FailureCode): void {
    this.assertNotTerminal(WagerTransactionStatus.Rejected);

    this._failureCode = code;
    this._status = WagerTransactionStatus.Rejected;
  }

  fail(code: FailureCode): void {
    this.assertNotTerminal(WagerTransactionStatus.Failed);

    this._failureCode = code;
    this._status = WagerTransactionStatus.Failed;
  }

  isTerminal(): boolean {
    return (
      this._status === WagerTransactionStatus.Processed ||
      this._status === WagerTransactionStatus.Rejected ||
      this._status === WagerTransactionStatus.Failed
    );
  }

  affectsBalance(): boolean {
    return this.kind !== WagerTransactionKind.Loss;
  }

  requiresReference(): boolean {
    return (
      this.kind === WagerTransactionKind.Refund ||
      this.kind === WagerTransactionKind.Rollback
    );
  }

  matchesPayload(payloadHash: string): boolean {
    return this.payloadHash === payloadHash;
  }

  ledgerDirectionFor(
    reference?: WagerTransaction,
  ): LedgerDirection {
    switch (this.kind) {
      case WagerTransactionKind.Opening:
      case WagerTransactionKind.Win:
        return LedgerDirection.Credit;

      case WagerTransactionKind.Bet:
        return LedgerDirection.Debit;

      case WagerTransactionKind.Loss:
        throw new Error(
          'LOSS does not generate a ledger entry',
        );

      case WagerTransactionKind.Refund:
      case WagerTransactionKind.Rollback:
        if (!reference) {
          throw new Error(
            `${this.kind} requires the referenced transaction`,
          );
        }

        return WagerTransaction.inverseDirection(
          reference.ledgerDirectionFor(),
        );
    }
  }

  private assertNotTerminal(
    target: WagerTransactionStatus,
  ): void {
    if (this.isTerminal()) {
      throw new InvalidTransactionStateError(
        this._status,
        target,
      );
    }
  }

  private static inverseDirection(
    direction: LedgerDirection,
  ): LedgerDirection {
    return direction === LedgerDirection.Debit
      ? LedgerDirection.Credit
      : LedgerDirection.Debit;
  }
}