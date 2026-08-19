import { Migration } from '@mikro-orm/migrations';

export class Migration20260819115802_initial_wallet_schema extends Migration {

  override name = 'Migration20260819115802_initial_wallet_schema';

  override up(): void | Promise<void> {
    this.addSql(`create table "inbox_messages" ("consumer_name" varchar(100) not null, "message_id" varchar(255) not null, "payload_hash" varchar(128) not null, "received_at" timestamptz not null, "processed_at" timestamptz null, primary key ("consumer_name", "message_id"));`);

    this.addSql(`create table "outbox_messages" ("id" uuid not null, "aggregate_id" varchar(255) not null, "event_type" varchar(255) not null, "payload" jsonb not null, "occurred_at" timestamptz not null, "attempts" int not null default 0, "next_attempt_at" timestamptz null, "published_at" timestamptz null, primary key ("id"));`);

    this.addSql(`create table "wallets" ("id" uuid not null, "player_id" varchar(255) not null, "currency" varchar(3) not null, "balance_minor" bigint not null, "version" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "wallets" add constraint "uq_wallet_player_currency" unique ("player_id", "currency");`);

    this.addSql(`create table "wager_transactions" ("id" uuid not null, "provider_id" varchar(100) not null, "external_transaction_id" varchar(255) not null, "idempotency_key" varchar(255) not null, "payload_hash" varchar(128) not null, "wallet_id" uuid not null, "player_id" varchar(255) not null, "round_id" varchar(255) not null, "game_id" varchar(255) not null, "kind" varchar(32) not null, "amount_minor" bigint not null, "currency" varchar(3) not null, "reference_external_transaction_id" varchar(255) null, "reference_transaction_id" uuid null, "status" varchar(32) not null, "failure_code" varchar(64) null, "created_at" timestamptz not null, "processed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "idx_wager_wallet_created" on "wager_transactions" ("wallet_id", "created_at");`);
    this.addSql(`alter table "wager_transactions" add constraint "uq_wager_provider_external_transaction" unique ("provider_id", "external_transaction_id");`);
    this.addSql(`alter table "wager_transactions" add constraint "uq_wager_provider_idempotency" unique ("provider_id", "idempotency_key");`);

    this.addSql(`create table "daily_ledgers" ("id" uuid not null, "wallet_id" uuid not null, "player_id" varchar(255) not null, "ledger_date" date not null, "currency" varchar(3) not null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "daily_ledgers" add constraint "uq_daily_ledger_player_date" unique ("player_id", "ledger_date");`);

    this.addSql(`create table "wallet_ledger_entries" ("id" uuid not null, "daily_ledger_id" uuid not null, "wallet_id" uuid not null, "transaction_id" uuid not null, "wallet_version" int not null, "direction" varchar(10) not null, "amount_minor" bigint not null, "currency" varchar(3) not null, "balance_before_minor" bigint not null, "balance_after_minor" bigint not null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "idx_ledger_wallet_created" on "wallet_ledger_entries" ("wallet_id", "created_at");`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "uq_ledger_wallet_version" unique ("wallet_id", "wallet_version");`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "uq_ledger_transaction" unique ("transaction_id");`);

    this.addSql(`alter table "outbox_messages" add constraint "ck_outbox_attempts_non_negative" check (attempts >= 0);`);

    this.addSql(`alter table "wallets" add constraint "ck_wallet_version_positive" check (version >= 1);`);
    this.addSql(`alter table "wallets" add constraint "ck_wallet_currency_brl" check (currency = 'BRL');`);
    this.addSql(`alter table "wallets" add constraint "ck_wallet_balance_non_negative" check (balance_minor >= 0);`);

    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_wallet_id_foreign" foreign key ("wallet_id") references "wallets" ("id") on delete restrict;`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_reference_transaction_id_foreign" foreign key ("reference_transaction_id") references "wager_transactions" ("id") on delete restrict;`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_opening_internal" check (
    kind <> 'OPENING'
    OR provider_id = 'internal'
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
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_currency_brl" check (currency = 'BRL');`);
    this.addSql(`alter table "wager_transactions" add constraint "ck_wager_amount_positive" check (amount_minor > 0);`);

    this.addSql(`alter table "daily_ledgers" add constraint "daily_ledgers_wallet_id_foreign" foreign key ("wallet_id") references "wallets" ("id") on delete restrict;`);
    this.addSql(`alter table "daily_ledgers" add constraint "ck_daily_ledger_currency_brl" check (currency = 'BRL');`);

    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_daily_ledger_id_foreign" foreign key ("daily_ledger_id") references "daily_ledgers" ("id") on delete restrict;`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_wallet_id_foreign" foreign key ("wallet_id") references "wallets" ("id") on delete restrict;`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_transaction_id_foreign" foreign key ("transaction_id") references "wager_transactions" ("id") on delete restrict;`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_balanced" check (
    (
      direction = 'DEBIT'
      AND balance_before_minor - amount_minor = balance_after_minor
    )
    OR
    (
      direction = 'CREDIT'
      AND balance_before_minor + amount_minor = balance_after_minor
    )
  );`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_direction" check (direction IN ('DEBIT', 'CREDIT'));`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_version_positive" check (wallet_version >= 1);`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_currency_brl" check (currency = 'BRL');`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_balance_after" check (balance_after_minor >= 0);`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_balance_before" check (balance_before_minor >= 0);`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "ck_ledger_amount_positive" check (amount_minor > 0);`);
    this.addSql(`create index "idx_outbox_pending"on "outbox_messages" ("next_attempt_at", "occurred_at")where "published_at" is null;`);
    this.addSql(`create unique index "uq_wager_single_rollback_reference"on "wager_transactions" ("provider_id","reference_external_transaction_id")where "kind" = 'ROLLBACK';`);
    
    this.addSql(`
  create or replace function prevent_wallet_ledger_mutation()
  returns trigger
  as $function$
  begin
    raise exception 'wallet_ledger_entries are immutable';
  end;
  $function$
  language plpgsql;
`);
    
    this.addSql(`
  create trigger "trg_wallet_ledger_immutable"
  before update or delete
  on "wallet_ledger_entries"
  for each row
  execute function prevent_wallet_ledger_mutation();
`);
    
this.addSql(`
  create trigger "trg_wallet_ledger_no_truncate"
  before truncate
  on "wallet_ledger_entries"
  for each statement
  execute function prevent_wallet_ledger_mutation();
`);
    
 this.addSql(`
  create or replace function enforce_wallet_balance_version()
  returns trigger
  as $function$
  begin
    if new.balance_minor = old.balance_minor then

      if new.version <> old.version then
        raise exception
          'wallet version cannot change when balance does not change';
      end if;

    else

      if new.version <> old.version + 1 then
        raise exception
          'wallet version must increment exactly once when balance changes';
      end if;

    end if;

    return new;
  end;
  $function$
  language plpgsql;
`);
  
  this.addSql(`
  create trigger "trg_wallet_balance_version"
  before update
  on "wallets"
  for each row
  execute function enforce_wallet_balance_version();
`);
  this.addSql(`
  create or replace function assert_wallet_has_ledger()
  returns trigger
  language plpgsql
  as $$
  declare
    expected_direction varchar(10);
    expected_amount bigint;
  begin

    /*
     * Wallet recém-aberta com saldo positivo:
     * deve existir OPENING/CREDIT representando version 1.
     */
    if tg_op = 'INSERT' then

      if new.balance_minor = 0 then
        return new;
      end if;

      if not exists (
        select 1
        from wallet_ledger_entries e
        where e.wallet_id = new.id
          and e.wallet_version = 1
          and e.direction = 'CREDIT'
          and e.amount_minor = new.balance_minor
          and e.balance_before_minor = 0
          and e.balance_after_minor = new.balance_minor
          and e.currency = new.currency
      ) then
        raise exception
          'wallet opening balance requires matching ledger entry';
      end if;

      return new;
    end if;

    /*
     * UPDATE sem alteração de saldo não requer novo ledger.
     */
    if new.balance_minor = old.balance_minor then
      return new;
    end if;

    if new.balance_minor > old.balance_minor then
      expected_direction := 'CREDIT';
      expected_amount :=
        new.balance_minor - old.balance_minor;
    else
      expected_direction := 'DEBIT';
      expected_amount :=
        old.balance_minor - new.balance_minor;
    end if;

    if not exists (
      select 1
      from wallet_ledger_entries e
      where e.wallet_id = new.id
        and e.wallet_version = new.version
        and e.direction = expected_direction
        and e.amount_minor = expected_amount
        and e.balance_before_minor = old.balance_minor
        and e.balance_after_minor = new.balance_minor
        and e.currency = new.currency
    ) then
      raise exception
        'wallet balance change requires matching ledger entry';
    end if;

    return new;
  end;
  $$;
`);

this.addSql(`
  create or replace function assert_ledger_consistency()
  returns trigger
  language plpgsql
  as $$
  declare
    wallet_row wallets%rowtype;
    transaction_row wager_transactions%rowtype;
    daily_ledger_row daily_ledgers%rowtype;
    reference_direction varchar(10);
  begin

    select *
      into wallet_row
      from wallets
      where id = new.wallet_id;

    if not found then
      raise exception 'ledger wallet does not exist';
    end if;

    /*
     * Não pode existir ledger de uma versão futura.
     */
    if new.wallet_version > wallet_row.version then
      raise exception
        'ledger wallet_version cannot be greater than wallet version';
    end if;


    /*
     * Garante continuidade do histórico.
     */
    if new.wallet_version = 1 then

      if new.balance_before_minor <> 0 then
        raise exception
          'wallet version 1 ledger must start from zero';
      end if;

    else

      if not exists (
        select 1
        from wallet_ledger_entries previous_entry
        where previous_entry.wallet_id = new.wallet_id
          and previous_entry.wallet_version =
              new.wallet_version - 1
          and previous_entry.balance_after_minor =
              new.balance_before_minor
      ) then
        raise exception
          'ledger previous balance/version is inconsistent';
      end if;

    end if;


    /*
     * Se este é o lançamento mais recente,
     * seu balanceAfter precisa ser o saldo atual da wallet.
     */
    if new.wallet_version = wallet_row.version then

      if new.balance_after_minor <>
         wallet_row.balance_minor then
        raise exception
          'latest ledger balance must equal wallet balance';
      end if;

    else

      /*
       * Se há versões posteriores, a próxima precisa
       * começar exatamente onde esta terminou.
       */
      if not exists (
        select 1
        from wallet_ledger_entries next_entry
        where next_entry.wallet_id = new.wallet_id
          and next_entry.wallet_version =
              new.wallet_version + 1
          and next_entry.balance_before_minor =
              new.balance_after_minor
      ) then
        raise exception
          'ledger chain is inconsistent';
      end if;

    end if;


    /*
     * Daily ledger deve pertencer à mesma wallet/moeda.
     */
    select *
      into daily_ledger_row
      from daily_ledgers
      where id = new.daily_ledger_id;

    if daily_ledger_row.wallet_id <> new.wallet_id then
      raise exception
        'daily ledger belongs to another wallet';
    end if;

    if daily_ledger_row.currency <> new.currency then
      raise exception
        'daily ledger currency mismatch';
    end if;


    /*
     * Transaction precisa pertencer à mesma wallet.
     */
    select *
      into transaction_row
      from wager_transactions
      where id = new.transaction_id;

    if transaction_row.wallet_id <> new.wallet_id then
      raise exception
        'transaction belongs to another wallet';
    end if;

    if transaction_row.currency <> new.currency then
      raise exception
        'transaction currency mismatch';
    end if;

    if transaction_row.amount_minor <> new.amount_minor then
      raise exception
        'transaction amount differs from ledger amount';
    end if;

    if transaction_row.status <> 'PROCESSED' then
      raise exception
        'ledger requires a processed transaction';
    end if;


    /*
     * LOSS nunca gera ledger.
     */
    if transaction_row.kind = 'LOSS' then
      raise exception
        'LOSS transaction cannot generate ledger entry';
    end if;


    /*
     * Direções diretas.
     */
    if transaction_row.kind = 'BET'
       and new.direction <> 'DEBIT' then
      raise exception 'BET ledger must be DEBIT';
    end if;

    if transaction_row.kind in ('OPENING', 'WIN')
       and new.direction <> 'CREDIT' then
      raise exception
        'OPENING/WIN ledger must be CREDIT';
    end if;


    /*
     * REFUND/ROLLBACK invertem a direção
     * do lançamento referenciado.
     */
    if transaction_row.kind in ('REFUND', 'ROLLBACK') then

      if transaction_row.reference_transaction_id is null then
        raise exception
          'referenced transaction must be resolved';
      end if;

      select direction
        into reference_direction
        from wallet_ledger_entries
        where transaction_id =
              transaction_row.reference_transaction_id;

      if reference_direction is null then
        raise exception
          'referenced transaction has no ledger';
      end if;

      if reference_direction = new.direction then
        raise exception
          'refund/rollback must invert referenced ledger direction';
      end if;

    end if;

    return new;
  end;
  $$;
`);
this.addSql(`
  create constraint trigger "ctrg_ledger_consistency"
  after insert
  on "wallet_ledger_entries"
  deferrable initially deferred
  for each row
  execute function assert_ledger_consistency();
`);
}

  override down(): void | Promise<void> {
  this.addSql(`
    drop trigger if exists "ctrg_ledger_consistency"
    on "wallet_ledger_entries";
  `);

  this.addSql(`
    drop trigger if exists "ctrg_wallet_requires_ledger"
    on "wallets";
  `);

  this.addSql(`
    drop trigger if exists "trg_wallet_ledger_immutable"
    on "wallet_ledger_entries";
  `);

  this.addSql(`
    drop trigger if exists "trg_wallet_ledger_no_truncate"
    on "wallet_ledger_entries";
  `);

  this.addSql(`
    drop trigger if exists "trg_wallet_balance_version"
    on "wallets";
  `);

  this.addSql(`
    drop function if exists assert_ledger_consistency();
    if new.wallet_version = 1 then

  if new.balance_before_minor <> 0 then
    raise exception
      'wallet version 1 ledger must start from zero';
  end if;

elsif new.wallet_version = 2
      and new.balance_before_minor = 0
      and not exists (
        select 1
        from wallet_ledger_entries previous_entry
        where previous_entry.wallet_id = new.wallet_id
          and previous_entry.wallet_version = 1
      ) then

  /*
   * Wallet pode ter sido aberta com saldo zero.
   * Nesse caso não existe lançamento de abertura.
   * A primeira movimentação real será version 2.
   */
  null;

else

  if not exists (
    select 1
    from wallet_ledger_entries previous_entry
    where previous_entry.wallet_id = new.wallet_id
      and previous_entry.wallet_version =
          new.wallet_version - 1
      and previous_entry.balance_after_minor =
          new.balance_before_minor
  ) then
    raise exception
      'ledger previous balance/version is inconsistent';
  end if;

end if;
  `);

  this.addSql(`
    drop function if exists assert_wallet_has_ledger();
  `);

  this.addSql(`
    drop function if exists prevent_wallet_ledger_mutation();
  `);

  this.addSql(`
    drop function if exists enforce_wallet_balance_version();
  `);

  this.addSql(`
    drop index if exists "uq_wager_single_rollback_reference";
  `);

  this.addSql(`
    drop index if exists "idx_outbox_pending";
  `);

  this.addSql(`
    drop table if exists "wallet_ledger_entries";
  `);

  this.addSql(`
    drop table if exists "daily_ledgers";
  `);

  this.addSql(`
    drop table if exists "wager_transactions";
  `);

  this.addSql(`
    drop table if exists "wallets";
  `);

  this.addSql(`
    drop table if exists "outbox_messages";
  `);

  this.addSql(`
    drop table if exists "inbox_messages";
  `);
}

}
