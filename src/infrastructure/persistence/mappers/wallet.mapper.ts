import { Wallet } from '../../../domain/wallet/wallet';
import { WalletEntity } from '../entities/wallet.entity';
import { MoneyPersistenceMapper } from './money-persistence.mapper';

export class WalletMapper {
  static toDomain(entity: WalletEntity): Wallet {
    const balance = MoneyPersistenceMapper.fromMinor(
      entity.balanceMinor,
      entity.currency,
    );

    return Wallet.rehydrate({
      id: entity.id,
      playerId: entity.playerId,
      currency: entity.currency,
      balance: balance.toJSON(),
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(wallet: Wallet): WalletEntity {
    const entity = new WalletEntity();

    entity.id = wallet.id;
    entity.playerId = wallet.playerId;
    entity.currency = wallet.currency;

    entity.balanceMinor =
      MoneyPersistenceMapper.toMinor(wallet.balance);

    entity.version = wallet.version;
    entity.createdAt = wallet.createdAt;
    entity.updatedAt = wallet.updatedAt;

    return entity;
  }

  static applyToEntity(
    wallet: Wallet,
    entity: WalletEntity,
  ): void {
    /*
     * id, playerId, currency e createdAt não são
     * modificados durante uma movimentação.
     */

    entity.balanceMinor =
      MoneyPersistenceMapper.toMinor(wallet.balance);

    entity.version = wallet.version;
    entity.updatedAt = wallet.updatedAt;
  }
}