import { Wallet } from '../../domain/wallet/wallet';

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');

export interface WalletRepositoryPort {
  findById(id: string): Promise<Wallet | null>;

  findByPlayerAndCurrency(
    playerId: string,
    currency: string,
  ): Promise<Wallet | null>;

  /**
   * Deve ser chamado somente dentro de uma transação.
   *
   * Na implementação PostgreSQL/MikroORM será:
   * SELECT ... FOR UPDATE
   */
  findByIdForUpdate(id: string): Promise<Wallet | null>;

  persist(wallet: Wallet): Promise<void>;
}