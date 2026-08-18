"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const money_1 = require("../money/money");
class Wallet {
    id;
    playerId;
    currency;
    _balance;
    _version;
    createdAt;
    _updatedAt;
    constructor(id, playerId, currency, _balance, _version, createdAt, _updatedAt) {
        this.id = id;
        this.playerId = playerId;
        this.currency = currency;
        this._balance = _balance;
        this._version = _version;
        this.createdAt = createdAt;
        this._updatedAt = _updatedAt;
    }
    static open(props) {
        if (props.initialBalance.currency !== 'BRL') {
            throw new Error('Only BRL wallets are supported');
        }
        if (props.initialBalance.isNegative()) {
            throw new Error('Initial balance cannot be negative');
        }
        const now = new Date();
        return new Wallet(props.id, props.playerId, props.initialBalance.currency, props.initialBalance, 1, now, now);
    }
    static rehydrate(state) {
        return new Wallet(state.id, state.playerId, state.currency, money_1.Money.from(state.balance), state.version, state.createdAt, state.updatedAt);
    }
    get balance() {
        return this._balance;
    }
    get version() {
        return this._version;
    }
    get updatedAt() {
        return this._updatedAt;
    }
    debit(money, occurredAt = new Date()) {
        this.assertSameCurrency(money);
        if (!money.isPositive()) {
            throw new Error('Debit amount must be positive');
        }
        if (this._balance.isLessThan(money)) {
            throw new Error('Insufficient balance');
        }
        const balanceBefore = this._balance;
        const balanceAfter = this._balance.subtract(money);
        this._balance = balanceAfter;
        this._version += 1;
        this._updatedAt = occurredAt;
        return {
            walletId: this.id,
            playerId: this.playerId,
            type: 'DEBIT',
            money,
            balanceBefore,
            balanceAfter,
            walletVersion: this._version,
            occurredAt,
        };
    }
    credit(money, occurredAt = new Date()) {
        this.assertSameCurrency(money);
        if (!money.isPositive()) {
            throw new Error('Credit amount must be positive');
        }
        const balanceBefore = this._balance;
        const balanceAfter = this._balance.add(money);
        this._balance = balanceAfter;
        this._version += 1;
        this._updatedAt = occurredAt;
        return {
            walletId: this.id,
            playerId: this.playerId,
            type: 'CREDIT',
            money,
            balanceBefore,
            balanceAfter,
            walletVersion: this._version,
            occurredAt,
        };
    }
    assertSameCurrency(money) {
        if (money.currency !== this.currency) {
            throw new Error(`Currency mismatch: wallet=${this.currency}, money=${money.currency}`);
        }
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map