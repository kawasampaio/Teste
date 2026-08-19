import {Bet,BetResult,} from '../../../domain/bet/bet';
import { BetEntity } from '../entities/bet.entity';
import { MoneyPersistenceMapper } from './money-persistence.mapper';


export class BetMapper {
  static toDomain(entity: BetEntity): Bet {
    return Bet.rehydrate({
      id: entity.id,
      wagerTransactionId:
        entity.wagerTransactionId,
      walletId: entity.walletId,
      playerId: entity.playerId,

      chosenNumber: entity.chosenNumber,
      drawnNumber: entity.drawnNumber,
      result: entity.result as BetResult,

      stake: MoneyPersistenceMapper
        .fromMinor(
          entity.stakeMinor,
          entity.currency,
        )
        .toJSON(),

      payout: MoneyPersistenceMapper
        .fromMinor(
          entity.payoutMinor,
          entity.currency,
        )
        .toJSON(),

      balanceAfter: MoneyPersistenceMapper
        .fromMinor(
          entity.balanceAfterMinor,
          entity.currency,
        )
        .toJSON(),

      createdAt: entity.createdAt,
      
    });
  }

  static toEntity(bet: Bet): BetEntity {
    const entity = new BetEntity();

    entity.id = bet.id;
    entity.wagerTransactionId =
      bet.wagerTransactionId;
    entity.walletId = bet.walletId;
    entity.playerId = bet.playerId;

    entity.chosenNumber = bet.chosenNumber;
    entity.drawnNumber = bet.drawnNumber;

    entity.stakeMinor =
      MoneyPersistenceMapper.toMinor(
        bet.stake,
      );

    entity.payoutMinor =
      MoneyPersistenceMapper.toMinor(
        bet.payout,
      );

    entity.balanceAfterMinor =
      MoneyPersistenceMapper.toMinor(
        bet.balanceAfter,
      );

    entity.currency = bet.stake.currency;
    entity.result = bet.result;
    entity.createdAt = bet.createdAt;

    return entity;
  }
}