import { Migration } from '@mikro-orm/migrations';

export class Migration20260819161317_add_bets extends Migration {

  override name = 'Migration20260819161317_add_bets';

  override up(): void | Promise<void> {
    this.addSql(`create table "bets" ("id" uuid not null, "wager_transaction_id" uuid not null, "wallet_id" uuid not null, "player_id" varchar(255) not null, "chosen_number" smallint not null, "drawn_number" smallint not null, "stake_minor" bigint not null, "payout_minor" bigint not null, "balance_after_minor" bigint not null, "currency" varchar(3) not null, "won" boolean not null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "bets" add constraint "uq_bet_wager_transaction" unique ("wager_transaction_id");`);

    this.addSql(`drop index "idx_outbox_pending";`);

    this.addSql(`alter table "wallets" drop constraint "ck_wallet_currency_brl";`);
    this.addSql(`drop trigger if exists "ctrg_wallet_requires_ledger" on "wallets";`);
    this.addSql(`drop function if exists "wallets_ctrg_wallet_requires_ledger_fn"();`);
    this.addSql(`drop trigger if exists "trg_wallet_balance_version" on "wallets";`);
    this.addSql(`drop function if exists "wallets_trg_wallet_balance_version_fn"();`);
    this.addSql(`alter table "wallets" add constraint "ck_wallet_currency_brl" check (currency = 'BRL');`);

    this.addSql(`drop index "uq_wager_single_rollback_reference";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_currency_brl";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_kind";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_reference_required";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_status";`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_currency_brl" check (currency = 'BRL');`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_kind" check (
    kind IN (
      'OPENING',
      'BET',
      'WIN',
      'LOSS',
      'REFUND',
      'ROLLBACK'
    )
  );`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_reference_required" check (
    (
      kind IN ('REFUND', 'ROLLBACK')
      AND reference_external_transaction_id IS NOT NULL
    )
    OR
    (
      kind NOT IN ('REFUND', 'ROLLBACK')
      AND reference_external_transaction_id IS NULL
    )
  );`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_status" check (
    status IN (
      'PENDING',
      'PENDING_REFERENCE',
      'PROCESSED',
      'REJECTED',
      'FAILED'
    )
  );`);

    this.addSql(`alter table "daily_ledgers" drop constraint "ck_daily_ledger_currency_brl";`);
    this.addSql(`alter table "daily_ledgers" add constraint "ck_daily_ledger_currency_brl" check (currency = 'BRL');`);

    this.addSql(`alter table "wallet_ledger_entries" drop constraint "ck_ledger_currency_brl";`);
    this.addSql(`drop trigger if exists "ctrg_ledger_consistency" on "wallet_ledger_entries";`);
    this.addSql(`drop function if exists "wallet_ledger_entries_ctrg_ledger_consistency_fn"();`);
    this.addSql(`drop trigger if exists "trg_wallet_ledger_immutable" on "wallet_ledger_entries";`);
    this.addSql(`drop function if exists "wallet_ledger_entries_trg_wallet_ledger_immutable_fn"();`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_currency_brl" check (currency = 'BRL');`);

    this.addSql(`alter table "bets" add constraint "bets_wager_transaction_id_foreign" foreign key ("wager_transaction_id") references "wager_transactions" ("id") on delete restrict;`);
    this.addSql(`alter table "bets" add constraint "bets_wallet_id_foreign" foreign key ("wallet_id") references "wallets" ("id") on delete restrict;`);
    this.addSql(`alter table "bets" add constraint "ck_bet_result_consistency" check (
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
  );`);
    this.addSql(`alter table "bets" add constraint "ck_bet_currency_brl" check (currency = 'BRL');`);
    this.addSql(`alter table "bets" add constraint "ck_bet_balance_non_negative" check (balance_after_minor >= 0);`);
    this.addSql(`alter table "bets" add constraint "ck_bet_payout_non_negative" check (payout_minor >= 0);`);
    this.addSql(`alter table "bets" add constraint "ck_bet_stake_positive" check (stake_minor > 0);`);
    this.addSql(`alter table "bets" add constraint "ck_bet_drawn_number" check (drawn_number between 1 and 9);`);
    this.addSql(`alter table "bets" add constraint "ck_bet_chosen_number" check (chosen_number between 1 and 9);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "bets" cascade;`);

    this.addSql(`alter table "daily_ledgers" drop constraint "ck_daily_ledger_currency_brl";`);
    this.addSql(`alter table "daily_ledgers" add constraint "ck_daily_ledger_currency_brl" check ("currency" in ('BRL'));`);

    this.addSql(`create index "idx_outbox_pending" on "outbox_messages" ("next_attempt_at", "occurred_at") where published_at IS NULL;`);

    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_reference_required";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_status";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_kind";`);
    this.addSql(`alter table "wager_transactions" drop constraint "ck_wager_currency_brl";`);
    this.addSql(`create unique index "uq_wager_single_rollback_reference" on "wager_transactions" ("provider_id", "reference_external_transaction_id") where (kind)::text = 'ROLLBACK'::text;`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_reference_required" check (((kind = ANY (ARRAY['REFUND'::character varying, 'ROLLBACK'::character varying][])) AND (reference_external_transaction_id IS NOT NULL)) OR ((kind <> ALL (ARRAY['REFUND'::character varying, 'ROLLBACK'::character varying][])) AND (reference_external_transaction_id IS NULL)));`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_status" check ("status" in ('PENDING', 'PENDING_REFERENCE', 'PROCESSED', 'REJECTED', 'FAILED'));`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_kind" check ("kind" in ('OPENING', 'BET', 'WIN', 'LOSS', 'REFUND', 'ROLLBACK'));`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_currency_brl" check ("currency" in ('BRL'));`);

    this.addSql(`alter table "wallet_ledger_entries" drop constraint "ck_ledger_currency_brl";`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_currency_brl" check ("currency" in ('BRL'));`);
    this.addSql(`create or replace function "wallet_ledger_entries_ctrg_ledger_consistency_fn"() returns trigger as \$\$ begin ; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "ctrg_ledger_consistency" AFTER INSERT on "wallet_ledger_entries" for each ROW execute function "wallet_ledger_entries_ctrg_ledger_consistency_fn"();`);
    this.addSql(`create or replace function "wallet_ledger_entries_trg_wallet_ledger_immutable_fn"() returns trigger as \$\$ begin ; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "trg_wallet_ledger_immutable" BEFORE DELETE OR UPDATE on "wallet_ledger_entries" for each ROW execute function "wallet_ledger_entries_trg_wallet_ledger_immutable_fn"();`);

    this.addSql(`alter table "wallets" drop constraint "ck_wallet_currency_brl";`);
    this.addSql(`alter table "wallets" add constraint "ck_wallet_currency_brl" check ("currency" in ('BRL'));`);
    this.addSql(`create or replace function "wallets_ctrg_wallet_requires_ledger_fn"() returns trigger as \$\$ begin ; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "ctrg_wallet_requires_ledger" AFTER INSERT OR UPDATE on "wallets" for each ROW execute function "wallets_ctrg_wallet_requires_ledger_fn"();`);
    this.addSql(`create or replace function "wallets_trg_wallet_balance_version_fn"() returns trigger as \$\$ begin ; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "trg_wallet_balance_version" BEFORE UPDATE on "wallets" for each ROW execute function "wallets_trg_wallet_balance_version_fn"();`);
  }

}
