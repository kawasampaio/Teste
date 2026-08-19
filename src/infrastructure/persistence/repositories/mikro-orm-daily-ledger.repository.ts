import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import type {
  DailyLedgerRecord,
  DailyLedgerRepositoryPort,
  GetOrCreateDailyLedgerInput,
} from '../../../application/ports/daily-ledger-repository.port';

interface DailyLedgerRow {
  id: string;
  wallet_id: string;
  player_id: string;
  ledger_date: string;
  currency: string;
  created_at: Date;
}

@Injectable()
export class MikroOrmDailyLedgerRepository
  implements DailyLedgerRepositoryPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async getOrCreate(
    input: GetOrCreateDailyLedgerInput,
  ): Promise<DailyLedgerRecord> {
    /*
     * A UNIQUE(player_id, ledger_date) do PostgreSQL
     * continua sendo a garantia final contra duplicação.
     */
    await this.em.execute(
      `
        insert into daily_ledgers (
          id,
          wallet_id,
          player_id,
          ledger_date,
          currency,
          created_at
        )
        values (?, ?, ?, ?, ?, ?)
        on conflict (player_id, ledger_date)
        do nothing
      `,
      [
        input.id,
        input.walletId,
        input.playerId,
        input.ledgerDate,
        input.currency,
        input.createdAt,
      ],
    );

    const rows = await this.em.execute<DailyLedgerRow[]>(
      `
        select
          id,
          wallet_id,
          player_id,
          ledger_date,
          currency,
          created_at
        from daily_ledgers
        where player_id = ?
          and ledger_date = ?
        limit 1
      `,
      [
        input.playerId,
        input.ledgerDate,
      ],
    );

    const row = rows[0];

    if (!row) {
      throw new Error(
        'Daily ledger could not be created or loaded',
      );
    }

    /*
     * Proteção extra caso algum código tente reutilizar
     * o ledger diário com uma wallet diferente.
     */
    if (row.wallet_id !== input.walletId) {
      throw new Error(
        'Daily ledger belongs to a different wallet',
      );
    }

    if (row.currency !== input.currency) {
      throw new Error(
        'Daily ledger currency mismatch',
      );
    }

    return {
      id: row.id,
      walletId: row.wallet_id,
      playerId: row.player_id,
      ledgerDate: row.ledger_date,
      currency: row.currency,
      createdAt: row.created_at,
    };
  }
}