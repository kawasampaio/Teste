import { Money, type MoneyProps } from '../money/money';
export declare enum LedgerDirection {
    Debit = "DEBIT",
    Credit = "CREDIT"
}
export interface CreateLedgerEntryProps {
    id: string;
    walletId: string;
    transactionId: string;
    direction: LedgerDirection;
    money: Money;
    balanceBefore: Money;
    balanceAfter: Money;
    createdAt?: Date;
}
export interface LedgerEntryState {
    id: string;
    walletId: string;
    transactionId: string;
    direction: LedgerDirection;
    money: MoneyProps;
    balanceBefore: MoneyProps;
    balanceAfter: MoneyProps;
    createdAt: Date;
}
export declare class WalletLedgerEntry {
    readonly id: string;
    readonly walletId: string;
    readonly transactionId: string;
    readonly direction: LedgerDirection;
    readonly money: Money;
    readonly balanceBefore: Money;
    readonly balanceAfter: Money;
    readonly createdAt: Date;
    private constructor();
    static create(props: CreateLedgerEntryProps): WalletLedgerEntry;
    static rehydrate(state: LedgerEntryState): WalletLedgerEntry;
    isBalanced(): boolean;
    private static assertCurrencies;
}
