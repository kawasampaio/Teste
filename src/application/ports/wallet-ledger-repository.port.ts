import { WalletLedgerEntry } from '../../domain/ledger/wallet-ledger-entry';

export const WALLET_LEDGER_REPOSITORY =
  Symbol('WALLET_LEDGER_REPOSITORY');

export interface AppendWalletLedgerInput {
  entry: WalletLedgerEntry;
  dailyLedgerId: string;
  walletVersion: number;
}

export interface WalletLedgerRepositoryPort {
  append(
    input: AppendWalletLedgerInput,
  ): Promise<void>;
}