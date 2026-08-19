import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import type {
  ClaimWagerTransactionResult,
  WagerTransactionRepositoryPort,
} from '../../../application/ports/wager-transaction-repository.port';

import { WagerTransaction } from '../../../domain/wager/wager-transaction';

import { WagerTransactionEntity } from '../entities/wager-transaction.entity';

import { WagerTransactionMapper } from '../mappers/wager-transaction.mapper';

import { MoneyPersistenceMapper } from '../mappers/money-persistence.mapper';

@Injectable()
export class MikroOrmWagerTransactionRepository
  implements WagerTransactionRepositoryPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async findById(
    id: string,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(
      WagerTransactionEntity,
      { id },
    );

    return entity
      ? WagerTransactionMapper.toDomain(entity)
      : null;
  }

  async findByProviderAndIdempotencyKey(
    providerId: string,
    idempotencyKey: string,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(
      WagerTransactionEntity,
      {
        providerId,
        idempotencyKey,
      },
    );

    return entity
      ? WagerTransactionMapper.toDomain(entity)
      : null;
  }

  async findByProviderAndExternalTransactionId(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(
      WagerTransactionEntity,
      {
        providerId,
        externalTransactionId,
      },
    );

    return entity
      ? WagerTransactionMapper.toDomain(entity)
      : null;
  }

  async claim(
    transaction: WagerTransaction,
  ): Promise<ClaimWagerTransactionResult> {
    /*
     * INSERT atômico.
     *
     * A UNIQUE(provider_id, idempotency_key)
     * no PostgreSQL é a garantia real contra
     * duas requisições criarem a mesma operação.
     */
    const inserted =
      await this.em.execute<
        Array<{ id: string }>
      >(
        `
          insert into wager_transactions (
            id,
            provider_id,
            external_transaction_id,
            idempotency_key,
            payload_hash,

            wallet_id,
            player_id,

            round_id,
            game_id,

            kind,

            amount_minor,
            currency,

            reference_external_transaction_id,
            reference_transaction_id,

            status,
            failure_code,

            created_at,
            processed_at
          )
          values (
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?
          )

          on conflict (
            provider_id,
            idempotency_key
          )
          do nothing

          returning id
        `,
        [
          transaction.id,

          transaction.providerId,

          transaction.externalTransactionId,

          transaction.idempotencyKey,

          transaction.payloadHash,

          transaction.walletId,

          transaction.playerId,

          transaction.roundId,

          transaction.gameId,

          transaction.kind,

          MoneyPersistenceMapper
            .toMinor(transaction.money)
            .toString(),

          transaction.money.currency,

          transaction
            .referenceExternalTransactionId ??
            null,

          transaction
            .referenceTransactionId ??
            null,

          transaction.status,

          transaction.failureCode ??
            null,

          transaction.createdAt,

          transaction.processedAt ??
            null,
        ],
      );

    if (inserted.length > 0) {
      return {
        created: true,
        transaction,
      };
    }

    /*
     * Não inseriu porque outra chamada já
     * utilizou essa chave de idempotência.
     */
    const existing =
      await this
        .findByProviderAndIdempotencyKey(
          transaction.providerId,
          transaction.idempotencyKey,
        );

    if (!existing) {
      throw new Error(
        'Idempotency conflict occurred but existing transaction was not found',
      );
    }

    return {
      created: false,
      transaction: existing,
    };
  }

  async persist(
    transaction: WagerTransaction,
  ): Promise<void> {
    const entity =
      await this.em.findOne(
        WagerTransactionEntity,
        {
          id: transaction.id,
        },
      );

    /*
     * WIN, LOSS, REFUND etc. entram aqui
     * quando ainda não existem.
     */
    if (!entity) {
      const newEntity =
        WagerTransactionMapper.toEntity(
          transaction,
        );

      this.em.persist(newEntity);

      await this.em.flush();

      return;
    }

    /*
     * BET criada pelo claim() já existe.
     * Aqui atualizamos status, failureCode,
     * processedAt etc.
     */
    WagerTransactionMapper.applyToEntity(
      transaction,
      entity,
    );

    await this.em.flush();
  }
}