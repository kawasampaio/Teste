import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
} from '@nestjs/common';

import {
  IdempotencyConflictError,
  ProcessBetUseCase,
  type ProcessBetResult,
} from '../../application/use-cases/process-bet.use-case';

import { ProcessBetDto } from '../dto/process-bet.dto';

@Controller('bets')
export class BetsController {
  constructor(
    private readonly processBet:
      ProcessBetUseCase,
  ) {}

  @Post()
  async create(
    @Body() body: ProcessBetDto,
  ): Promise<ProcessBetResult> {
    try {
      return await this.processBet.execute({
        providerId:
          body.providerId,

        externalTransactionId:
          body.externalTransactionId,

        idempotencyKey:
          body.idempotencyKey,

        walletId:
          body.walletId,

        playerId:
          body.playerId,

        roundId:
          body.roundId,

        gameId:
          body.gameId,

        chosenNumber:
          body.chosenNumber,

        stake:
          body.stake,
      });
    } catch (error) {
      if (
        error instanceof
        IdempotencyConflictError
      ) {
        throw new ConflictException(
          error.message,
        );
      }

      if (error instanceof Error) {
        throw new BadRequestException(
          error.message,
        );
      }

      throw error;
    }
  }
}