import { Injectable } from '@nestjs/common';
import { LockMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Wallet } from '../../../domain/wallet/wallet';
import type { WalletRepositoryPort } from '../../../application/ports/wallet-repository.port';

import { WalletEntity } from '../entities/wallet.entity';
import { WalletMapper } from '../mappers/wallet.mapper';

@Injectable()
export class MikroOrmWalletRepository
  implements WalletRepositoryPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async findById(
    id: string,
  ): Promise<Wallet | null> {
    const entity = await this.em.findOne(
      WalletEntity,
      { id },
    );

    if (!entity) {
      return null;
    }

    return WalletMapper.toDomain(entity);
  }

  async findByPlayerAndCurrency(
    playerId: string,
    currency: string,
  ): Promise<Wallet | null> {
    const entity = await this.em.findOne(
      WalletEntity,
      {
        playerId,
        currency,
      },
    );

    if (!entity) {
      return null;
    }

    return WalletMapper.toDomain(entity);
  }

  async findByIdForUpdate(
    id: string,
  ): Promise<Wallet | null> {
    if (!this.em.isInTransaction()) {
      throw new Error(
        'findByIdForUpdate requires an active database transaction',
      );
    }

    const entity = await this.em.findOne(
      WalletEntity,
      { id },
      {
        lockMode: LockMode.PESSIMISTIC_WRITE,
      },
    );

    if (!entity) {
      return null;
    }

    return WalletMapper.toDomain(entity);
  }

  async persist(
    wallet: Wallet,
  ): Promise<void> {
    const existing = await this.em.findOne(
      WalletEntity,
      { id: wallet.id },
    );

    if (!existing) {
      const entity = WalletMapper.toEntity(wallet);

      this.em.persist(entity);

      await this.em.flush();

      return;
    }

    WalletMapper.applyToEntity(
      wallet,
      existing,
    );

    await this.em.flush();
  }
}