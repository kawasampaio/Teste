"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
class Money {
    value;
    currency;
    constructor(value, currency) {
        this.value = value;
        this.currency = currency;
    }
    static from(props) {
        Money.assertValidCurrency(props.currency);
        Money.assertValidAmount(props.amount);
        const value = new decimal_js_1.default(props.amount);
        if (!value.isFinite()) {
            throw new Error('o valor do dinheiro deve ser finito');
        }
        if (value.decimalPlaces() > 2) {
            throw new Error('o dinheiro suporta no maximo 2 casas decimais');
        }
        return new Money(value, props.currency);
    }
    static zero(currency) {
        return Money.from({
            amount: '0.00',
            currency,
        });
    }
    add(other) {
        this.assertSameCurrency(other);
        return Money.from({
            amount: this.value.plus(other.value).toFixed(2),
            currency: this.currency,
        });
    }
    subtract(other) {
        this.assertSameCurrency(other);
        return Money.from({
            amount: this.value.minus(other.value).toFixed(2),
            currency: this.currency,
        });
    }
    negate() {
        return Money.from({
            amount: this.value.negated().toFixed(2),
            currency: this.currency,
        });
    }
    isZero() {
        return this.value.isZero();
    }
    isPositive() {
        return this.value.isPositive() && !this.value.isZero();
    }
    isNegative() {
        return this.value.isNegative() && !this.value.isZero();
    }
    isLessThan(other) {
        this.assertSameCurrency(other);
        return this.value.lessThan(other.value);
    }
    equals(other) {
        return (this.currency === other.currency &&
            this.value.equals(other.value));
    }
    toJSON() {
        return {
            amount: this.value.toFixed(2),
            currency: this.currency,
        };
    }
    toString() {
        return `${this.currency} ${this.value.toFixed(2)}`;
    }
    assertSameCurrency(other) {
        if (this.currency !== other.currency) {
            throw new Error(`Currency mismatch: ${this.currency} != ${other.currency}`);
        }
    }
    static assertValidCurrency(currency) {
        if (currency !== 'BRL') {
            throw new Error('apenas a moeda BRL e aceita');
        }
    }
    static assertValidAmount(amount) {
        if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) {
            throw new Error('valor monetario invalido');
        }
    }
}
exports.Money = Money;
//# sourceMappingURL=money.js.map