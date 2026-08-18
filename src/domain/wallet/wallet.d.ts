import { Money, type MoneyProps } from '../money/money';
export interface WalletState {
    id: string;
    playerId: string;
    currency: string;
    balance: MoneyProps;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
export type WalletMovementType = 'CREDIT' | 'DEBIT';
export interface WalletMovement {
    walletId: string;
    playerId: string;
    type: WalletMovementType;
    money: Money;
    balanceBefore: Money;
    balanceAfter: Money;
    walletVersion: number;
    occurredAt: Date;
}
export declare class Wallet {
    readonly id: string;
    readonly playerId: string;
    readonly currency: string;
    private _balance;
    private _version;
    readonly createdAt: Date;
    private _updatedAt;
    private constructor();
    static open(props: {
        id: string;
        playerId: string;
        initialBalance: Money;
    }): Wallet;
    static rehydrate(state: WalletState): Wallet;
    get balance(): Money;
    get version(): number;
    get updatedAt(): Date;
    debit(money: Money, occurredAt?: Date): WalletMovement;
    credit(money: Money, occurredAt?: Date): WalletMovement;
    private assertSameCurrency;
}
