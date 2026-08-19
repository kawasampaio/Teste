import { Migration } from '@mikro-orm/migrations';

export class Migration20260819164226_add_bet_draw_result
  extends Migration
{
  override name =
    'Migration20260819164226_add_bet_draw_result';

  override up(): void | Promise<void> {
    this.addSql(`
      alter table "bets"
      drop constraint "ck_bet_result_consistency";
    `);

    this.addSql(`
      alter table "bets"
      drop column "won";
    `);

    this.addSql(`
      alter table "bets"
      add column "result" varchar(10) not null;
    `);

    this.addSql(`
      alter table "bets"
      add constraint "ck_bet_result_consistency"
      check (
        (
          result = 'WIN'
          and chosen_number > drawn_number
          and payout_minor = stake_minor * 2
        )
        or
        (
          result = 'DRAW'
          and chosen_number = drawn_number
          and payout_minor = stake_minor
        )
        or
        (
          result = 'LOSS'
          and chosen_number < drawn_number
          and payout_minor = 0
        )
      );
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`
      alter table "bets"
      drop constraint "ck_bet_result_consistency";
    `);

    this.addSql(`
      alter table "bets"
      drop column "result";
    `);

    this.addSql(`
      alter table "bets"
      add column "won" boolean not null;
    `);

    this.addSql(`
      alter table "bets"
      add constraint "ck_bet_result_consistency"
      check (
        (
          won = true
          and chosen_number = drawn_number
          and payout_minor = stake_minor * 2
        )
        or
        (
          won = false
          and chosen_number <> drawn_number
          and payout_minor = 0
        )
      );
    `);
  }
}