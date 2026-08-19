import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from '@nestjs/common';

import {
  WALLET_REPOSITORY,
  type WalletRepositoryPort,
} from '../../application/ports/wallet-repository.port';

@Controller('wallets')
export class WalletsController {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets:
      WalletRepositoryPort,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<{
    id: string;
    playerId: string;
    balance: {
      amount: string;
      currency: string;
    };
    version: number;
  }> {
    const wallet =
      await this.wallets.findById(id);

    if (!wallet) {
      throw new NotFoundException(
        'Wallet not found',
      );
    }

    return {
      id:
        wallet.id,

      playerId:
        wallet.playerId,

      balance:
        wallet.balance.toJSON(),

      version:
        wallet.version,
    };
  }
}