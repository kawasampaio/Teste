import { Bet } from '../../domain/bet/bet';

export const BET_REPOSITORY =
  Symbol('BET_REPOSITORY');

export interface BetRepositoryPort {
  findByWagerTransactionId(
    wagerTransactionId: string,
  ): Promise<Bet | null>;

  save(bet: Bet): Promise<void>;
}