import { WagerTransaction } from '../../domain/wager/wager-transaction';

export const WAGER_TRANSACTION_REPOSITORY =
  Symbol('WAGER_TRANSACTION_REPOSITORY');

export type ClaimWagerTransactionResult =
  | {
      created: true;
      transaction: WagerTransaction;
    }
  | {
      created: false;
      transaction: WagerTransaction;
    };

export interface WagerTransactionRepositoryPort {
  findById(
    id: string,
  ): Promise<WagerTransaction | null>;

  findByProviderAndIdempotencyKey(
    providerId: string,
    idempotencyKey: string,
  ): Promise<WagerTransaction | null>;

  findByProviderAndExternalTransactionId(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null>;

  /**
   * Tenta registrar a operação de forma atômica.
   *
   * Se provider + idempotencyKey já existir,
   * retorna a operação já existente.
   */
  claim(
    transaction: WagerTransaction,
  ): Promise<ClaimWagerTransactionResult>;

  persist(
    transaction: WagerTransaction,
  ): Promise<void>;
}