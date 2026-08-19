import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import type { BetRepositoryPort } from '../../../application/ports/bet-repository.port';

import { Bet } from '../../../domain/bet/bet';

import { BetEntity } from '../entities/bet.entity';
import { BetMapper } from '../mappers/bet.mapper';

@Injectable()
export class MikroOrmBetRepository
  implements BetRepositoryPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async findByWagerTransactionId(
    wagerTransactionId: string,
  ): Promise<Bet | null> {
    const entity = await this.em.findOne(
      BetEntity,
      {
        wagerTransactionId,
      },
    );

    return entity
      ? BetMapper.toDomain(entity)
      : null;
  }

  async save(bet: Bet): Promise<void> {
    const entity = BetMapper.toEntity(bet);

    this.em.persist(entity);

    await this.em.flush();
  }
}