import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import type {
  AppendWalletLedgerInput,
  WalletLedgerRepositoryPort,
} from '../../../application/ports/wallet-ledger-repository.port';

import { MoneyPersistenceMapper } from '../mappers/money-persistence.mapper';

@Injectable()
export class MikroOrmWalletLedgerRepository
  implements WalletLedgerRepositoryPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async append(
    input: AppendWalletLedgerInput,
  ): Promise<void> {
    const { entry } = input;

    await this.em.execute(
      `
        insert into wallet_ledger_entries (
          id,
          daily_ledger_id,
          wallet_id,
          transaction_id,
          wallet_version,
          direction,
          amount_minor,
          currency,
          balance_before_minor,
          balance_after_minor,
          created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        entry.id,
        input.dailyLedgerId,
        entry.walletId,
        entry.transactionId,
        input.walletVersion,
        entry.direction,

        MoneyPersistenceMapper
          .toMinor(entry.money)
          .toString(),

        entry.money.currency,

        MoneyPersistenceMapper
          .toMinor(entry.balanceBefore)
          .toString(),

        MoneyPersistenceMapper
          .toMinor(entry.balanceAfter)
          .toString(),

        entry.createdAt,
      ],
    );
  }
}