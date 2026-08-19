import {
  FailureCode,
  WagerTransaction,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../../domain/wager/wager-transaction';

import { WagerTransactionEntity } from '../entities/wager-transaction.entity';
import { MoneyPersistenceMapper } from './money-persistence.mapper';

export class WagerTransactionMapper {
  static toDomain(
    entity: WagerTransactionEntity,
  ): WagerTransaction {
    const money = MoneyPersistenceMapper.fromMinor(
      entity.amountMinor,
      entity.currency,
    );

    return WagerTransaction.rehydrate({
      id: entity.id,
      providerId: entity.providerId,
      externalTransactionId:
        entity.externalTransactionId,
      idempotencyKey: entity.idempotencyKey,
      payloadHash: entity.payloadHash,

      walletId: entity.walletId,
      playerId: entity.playerId,

      roundId: entity.roundId,
      gameId: entity.gameId,

      kind:
        entity.kind as WagerTransactionKind,

      money: money.toJSON(),

      referenceExternalTransactionId:
        entity.referenceExternalTransactionId ??
        undefined,

      createdAt: entity.createdAt,

      status:
        entity.status as WagerTransactionStatus,

      referenceTransactionId:
        entity.referenceTransactionId ??
        undefined,

      failureCode:
        entity.failureCode
          ? (entity.failureCode as FailureCode)
          : undefined,

      processedAt:
        entity.processedAt ?? undefined,
    });
  }

  static toEntity(
    transaction: WagerTransaction,
  ): WagerTransactionEntity {
    const entity = new WagerTransactionEntity();

    WagerTransactionMapper.applyToEntity(
      transaction,
      entity,
    );

    return entity;
  }

  static applyToEntity(
    transaction: WagerTransaction,
    entity: WagerTransactionEntity,
  ): void {
    entity.id = transaction.id;
    entity.providerId = transaction.providerId;

    entity.externalTransactionId =
      transaction.externalTransactionId;

    entity.idempotencyKey =
      transaction.idempotencyKey;

    entity.payloadHash =
      transaction.payloadHash;

    entity.walletId =
      transaction.walletId;

    entity.playerId =
      transaction.playerId;

    entity.roundId =
      transaction.roundId;

    entity.gameId =
      transaction.gameId;

    entity.kind =
      transaction.kind;

    entity.amountMinor =
      MoneyPersistenceMapper.toMinor(
        transaction.money,
      );

    entity.currency =
      transaction.money.currency;

    entity.referenceExternalTransactionId =
      transaction.referenceExternalTransactionId ??
      null;

    entity.referenceTransactionId =
      transaction.referenceTransactionId ??
      null;

    entity.status =
      transaction.status;

    entity.failureCode =
      transaction.failureCode ?? null;

    entity.createdAt =
      transaction.createdAt;

    entity.processedAt =
      transaction.processedAt ?? null;
  }
}