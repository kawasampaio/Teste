"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletLedgerEntry = exports.LedgerDirection = void 0;
const money_1 = require("../money/money");
var LedgerDirection;
(function (LedgerDirection) {
    LedgerDirection["Debit"] = "DEBIT";
    LedgerDirection["Credit"] = "CREDIT";
})(LedgerDirection || (exports.LedgerDirection = LedgerDirection = {}));
class WalletLedgerEntry {
    id;
    walletId;
    transactionId;
    direction;
    money;
    balanceBefore;
    balanceAfter;
    createdAt;
    constructor(id, walletId, transactionId, direction, money, balanceBefore, balanceAfter, createdAt) {
        this.id = id;
        this.walletId = walletId;
        this.transactionId = transactionId;
        this.direction = direction;
        this.money = money;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = balanceAfter;
        this.createdAt = createdAt;
    }
    static create(props) {
        if (!props.money.isPositive()) {
            throw new Error('O valor do lancamento deve ser positivo');
        }
        WalletLedgerEntry.assertCurrencies(props);
        const entry = new WalletLedgerEntry(props.id, props.walletId, props.transactionId, props.direction, props.money, props.balanceBefore, props.balanceAfter, props.createdAt ?? new Date());
        if (!entry.isBalanced()) {
            throw new Error('Lancamento do ledger inconsistente');
        }
        if (props.balanceBefore.isNegative() ||
            props.balanceAfter.isNegative()) {
            throw new Error('Saldo do ledger nao pode ser negativo');
        }
        return entry;
    }
    static rehydrate(state) {
        return new WalletLedgerEntry(state.id, state.walletId, state.transactionId, state.direction, money_1.Money.from(state.money), money_1.Money.from(state.balanceBefore), money_1.Money.from(state.balanceAfter), state.createdAt);
    }
    isBalanced() {
        if (this.direction === LedgerDirection.Credit) {
            return this.balanceBefore
                .add(this.money)
                .equals(this.balanceAfter);
        }
        return this.balanceBefore
            .subtract(this.money)
            .equals(this.balanceAfter);
    }
    static assertCurrencies(props) {
        const currency = props.money.currency;
        if (props.balanceBefore.currency !== currency ||
            props.balanceAfter.currency !== currency) {
            throw new Error('A moeda do lancamento deve ser igual a moeda dos saldos');
        }
    }
}
exports.WalletLedgerEntry = WalletLedgerEntry;
//# sourceMappingURL=wallet-ledger-entry.js.map