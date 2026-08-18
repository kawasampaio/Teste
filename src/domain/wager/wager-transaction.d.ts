import { Money, type MoneyProps } from '../money/money';
import { LedgerDirection } from '../ledger/wallet-ledger-entry';
export declare enum WagerTransactionKind {
    Opening = "OPENING",
    Bet = "BET",
    Win = "WIN",
    Loss = "LOSS",
    Refund = "REFUND",
    Rollback = "ROLLBACK"
}
export declare enum WagerTransactionStatus {
    Pending = "PENDING",
    PendingReference = "PENDING_REFERENCE",
    Processed = "PROCESSED",
    Rejected = "REJECTED",
    Failed = "FAILED"
}
export declare enum FailureCode {
    InsufficientBalance = "INSUFFICIENT_BALANCE",
    InvalidReference = "INVALID_REFERENCE",
    CurrencyMismatch = "CURRENCY_MISMATCH",
    InvalidAmount = "INVALID_AMOUNT",
    IdempotencyConflict = "IDEMPOTENCY_CONFLICT",
    PermanentInfrastructureError = "PERMANENT_INFRASTRUCTURE_ERROR"
}
export declare class InvalidTransactionStateError extends Error {
    constructor(current: WagerTransactionStatus, target: WagerTransactionStatus);
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
export declare class WagerTransaction {
    readonly id: string;
    readonly providerId: string;
    readonly externalTransactionId: string;
    readonly idempotencyKey: string;
    readonly payloadHash: string;
    readonly walletId: string;
    readonly playerId: string;
    readonly roundId: string;
    readonly gameId: string;
    readonly kind: WagerTransactionKind;
    readonly money: Money;
    readonly referenceExternalTransactionId: string | undefined;
    readonly createdAt: Date;
    private _status;
    private _referenceTransactionId?;
    private _failureCode?;
    private _processedAt?;
    private constructor();
    static create(props: CreateWagerTransactionProps): WagerTransaction;
    static rehydrate(state: WagerTransactionState): WagerTransaction;
    get status(): WagerTransactionStatus;
    get referenceTransactionId(): string | undefined;
    get failureCode(): FailureCode | undefined;
    get processedAt(): Date | undefined;
    markProcessed(referenceTransactionId: string | undefined, at: Date): void;
    markPendingReference(): void;
    reject(code: FailureCode): void;
    fail(code: FailureCode): void;
    isTerminal(): boolean;
    affectsBalance(): boolean;
    requiresReference(): boolean;
    matchesPayload(payloadHash: string): boolean;
    ledgerDirectionFor(reference?: WagerTransaction): LedgerDirection;
    private assertNotTerminal;
    private static inverseDirection;
}
