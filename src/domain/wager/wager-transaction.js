"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WagerTransaction = exports.InvalidTransactionStateError = exports.FailureCode = exports.WagerTransactionStatus = exports.WagerTransactionKind = void 0;
const money_1 = require("../money/money");
const wallet_ledger_entry_1 = require("../ledger/wallet-ledger-entry");
var WagerTransactionKind;
(function (WagerTransactionKind) {
    WagerTransactionKind["Opening"] = "OPENING";
    WagerTransactionKind["Bet"] = "BET";
    WagerTransactionKind["Win"] = "WIN";
    WagerTransactionKind["Loss"] = "LOSS";
    WagerTransactionKind["Refund"] = "REFUND";
    WagerTransactionKind["Rollback"] = "ROLLBACK";
})(WagerTransactionKind || (exports.WagerTransactionKind = WagerTransactionKind = {}));
var WagerTransactionStatus;
(function (WagerTransactionStatus) {
    WagerTransactionStatus["Pending"] = "PENDING";
    WagerTransactionStatus["PendingReference"] = "PENDING_REFERENCE";
    WagerTransactionStatus["Processed"] = "PROCESSED";
    WagerTransactionStatus["Rejected"] = "REJECTED";
    WagerTransactionStatus["Failed"] = "FAILED";
})(WagerTransactionStatus || (exports.WagerTransactionStatus = WagerTransactionStatus = {}));
var FailureCode;
(function (FailureCode) {
    FailureCode["InsufficientBalance"] = "INSUFFICIENT_BALANCE";
    FailureCode["InvalidReference"] = "INVALID_REFERENCE";
    FailureCode["CurrencyMismatch"] = "CURRENCY_MISMATCH";
    FailureCode["InvalidAmount"] = "INVALID_AMOUNT";
    FailureCode["IdempotencyConflict"] = "IDEMPOTENCY_CONFLICT";
    FailureCode["PermanentInfrastructureError"] = "PERMANENT_INFRASTRUCTURE_ERROR";
})(FailureCode || (exports.FailureCode = FailureCode = {}));
class InvalidTransactionStateError extends Error {
    constructor(current, target) {
        super(`Invalid transaction state transition: ${current} -> ${target}`);
        this.name = 'InvalidTransactionStateError';
    }
}
exports.InvalidTransactionStateError = InvalidTransactionStateError;
class WagerTransaction {
    id;
    providerId;
    externalTransactionId;
    idempotencyKey;
    payloadHash;
    walletId;
    playerId;
    roundId;
    gameId;
    kind;
    money;
    referenceExternalTransactionId;
    createdAt;
    _status;
    _referenceTransactionId;
    _failureCode;
    _processedAt;
    constructor(id, providerId, externalTransactionId, idempotencyKey, payloadHash, walletId, playerId, roundId, gameId, kind, money, referenceExternalTransactionId, createdAt, _status, _referenceTransactionId, _failureCode, _processedAt) {
        this.id = id;
        this.providerId = providerId;
        this.externalTransactionId = externalTransactionId;
        this.idempotencyKey = idempotencyKey;
        this.payloadHash = payloadHash;
        this.walletId = walletId;
        this.playerId = playerId;
        this.roundId = roundId;
        this.gameId = gameId;
        this.kind = kind;
        this.money = money;
        this.referenceExternalTransactionId = referenceExternalTransactionId;
        this.createdAt = createdAt;
        this._status = _status;
        this._referenceTransactionId = _referenceTransactionId;
        this._failureCode = _failureCode;
        this._processedAt = _processedAt;
    }
    static create(props) {
        if (!props.money.isPositive()) {
            throw new Error('Transaction amount must be positive');
        }
        if (props.kind === WagerTransactionKind.Opening &&
            props.internal !== true) {
            throw new Error('OPENING transaction can only be created internally');
        }
        const requiresReference = props.kind === WagerTransactionKind.Refund ||
            props.kind === WagerTransactionKind.Rollback;
        if (requiresReference &&
            !props.referenceExternalTransactionId) {
            throw new Error(`${props.kind} transaction requires a reference transaction`);
        }
        if (!requiresReference &&
            props.referenceExternalTransactionId) {
            throw new Error(`${props.kind} transaction cannot have a reference transaction`);
        }
        return new WagerTransaction(props.id, props.providerId, props.externalTransactionId, props.idempotencyKey, props.payloadHash, props.walletId, props.playerId, props.roundId, props.gameId, props.kind, props.money, props.referenceExternalTransactionId, props.createdAt ?? new Date(), WagerTransactionStatus.Pending);
    }
    static rehydrate(state) {
        return new WagerTransaction(state.id, state.providerId, state.externalTransactionId, state.idempotencyKey, state.payloadHash, state.walletId, state.playerId, state.roundId, state.gameId, state.kind, money_1.Money.from(state.money), state.referenceExternalTransactionId, state.createdAt, state.status, state.referenceTransactionId, state.failureCode, state.processedAt);
    }
    get status() {
        return this._status;
    }
    get referenceTransactionId() {
        return this._referenceTransactionId;
    }
    get failureCode() {
        return this._failureCode;
    }
    get processedAt() {
        return this._processedAt;
    }
    markProcessed(referenceTransactionId, at) {
        this.assertNotTerminal(WagerTransactionStatus.Processed);
        if (this.requiresReference() &&
            referenceTransactionId === undefined) {
            throw new Error(`${this.kind} requires a resolved reference transaction`);
        }
        this._referenceTransactionId = referenceTransactionId;
        this._processedAt = at;
        this._status = WagerTransactionStatus.Processed;
    }
    markPendingReference() {
        this.assertNotTerminal(WagerTransactionStatus.PendingReference);
        if (!this.requiresReference()) {
            throw new Error(`${this.kind} cannot wait for a reference transaction`);
        }
        this._status = WagerTransactionStatus.PendingReference;
    }
    reject(code) {
        this.assertNotTerminal(WagerTransactionStatus.Rejected);
        this._failureCode = code;
        this._status = WagerTransactionStatus.Rejected;
    }
    fail(code) {
        this.assertNotTerminal(WagerTransactionStatus.Failed);
        this._failureCode = code;
        this._status = WagerTransactionStatus.Failed;
    }
    isTerminal() {
        return (this._status === WagerTransactionStatus.Processed ||
            this._status === WagerTransactionStatus.Rejected ||
            this._status === WagerTransactionStatus.Failed);
    }
    affectsBalance() {
        return this.kind !== WagerTransactionKind.Loss;
    }
    requiresReference() {
        return (this.kind === WagerTransactionKind.Refund ||
            this.kind === WagerTransactionKind.Rollback);
    }
    matchesPayload(payloadHash) {
        return this.payloadHash === payloadHash;
    }
    ledgerDirectionFor(reference) {
        switch (this.kind) {
            case WagerTransactionKind.Opening:
            case WagerTransactionKind.Win:
                return wallet_ledger_entry_1.LedgerDirection.Credit;
            case WagerTransactionKind.Bet:
                return wallet_ledger_entry_1.LedgerDirection.Debit;
            case WagerTransactionKind.Loss:
                throw new Error('LOSS does not generate a ledger entry');
            case WagerTransactionKind.Refund:
            case WagerTransactionKind.Rollback:
                if (!reference) {
                    throw new Error(`${this.kind} requires the referenced transaction`);
                }
                return WagerTransaction.inverseDirection(reference.ledgerDirectionFor());
        }
    }
    assertNotTerminal(target) {
        if (this.isTerminal()) {
            throw new InvalidTransactionStateError(this._status, target);
        }
    }
    static inverseDirection(direction) {
        return direction === wallet_ledger_entry_1.LedgerDirection.Debit
            ? wallet_ledger_entry_1.LedgerDirection.Credit
            : wallet_ledger_entry_1.LedgerDirection.Debit;
    }
}
exports.WagerTransaction = WagerTransaction;
//# sourceMappingURL=wager-transaction.js.map