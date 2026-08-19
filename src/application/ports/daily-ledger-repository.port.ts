export const DAILY_LEDGER_REPOSITORY =
  Symbol('DAILY_LEDGER_REPOSITORY');

export interface DailyLedgerRecord {
  id: string;
  walletId: string;
  playerId: string;
  ledgerDate: string;
  currency: string;
  createdAt: Date;
}

export interface GetOrCreateDailyLedgerInput {
  id: string;
  walletId: string;
  playerId: string;
  ledgerDate: string;
  currency: string;
  createdAt: Date;
}

export interface DailyLedgerRepositoryPort {
  getOrCreate(
    input: GetOrCreateDailyLedgerInput,
  ): Promise<DailyLedgerRecord>;
}