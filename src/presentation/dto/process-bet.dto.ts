import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ProcessBetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalTransactionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;

  @IsUUID()
  walletId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roundId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  gameId!: string;

  @IsInt()
  @Min(1)
  @Max(9)
  chosenNumber!: number;

  /*
   * Dinheiro continua sendo STRING.
   *
   * Aceita:
   * "1"
   * "10"
   * "10.00"
   * "0.50"
   *
   * Rejeita:
   * "10.999"
   * "-10"
   * "1e3"
   * "abc"
   */
  @IsString()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, {
    message:
      'stake must be a positive decimal string with at most 2 decimal places',
  })
  stake!: string;
}