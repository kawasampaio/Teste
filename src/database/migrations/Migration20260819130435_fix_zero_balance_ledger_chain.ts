import { Migration } from '@mikro-orm/migrations';

export class Migration20260819130435_fix_zero_balance_ledger_chain extends Migration {

  override name = 'Migration20260819130435_fix_zero_balance_ledger_chain';

override up(): void | Promise<void> {
  this.addSql(`
    create or replace function assert_ledger_consistency()
    returns trigger
    as $function$
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

      if new.wallet_version > wallet_row.version then
        raise exception
          'ledger wallet_version cannot be greater than wallet version';
      end if;


      /*
       * Version 1:
       * wallet aberta com saldo positivo.
       */
      if new.wallet_version = 1 then

        if new.balance_before_minor <> 0 then
          raise exception
            'wallet version 1 ledger must start from zero';
        end if;


      /*
       * Version 2 sem ledger version 1:
       *
       * wallet nasceu com saldo zero.
       * Como saldo zero não gera lançamento,
       * a primeira movimentação real pode ser version 2.
       */
      elsif new.wallet_version = 2
        and new.balance_before_minor = 0
        and not exists (
          select 1
          from wallet_ledger_entries previous_entry
          where previous_entry.wallet_id = new.wallet_id
            and previous_entry.wallet_version = 1
        )
      then

        null;


      /*
       * Demais versões precisam continuar
       * exatamente a cadeia anterior.
       */
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
       * Ledger mais recente precisa refletir
       * o saldo atual da wallet.
       */
      if new.wallet_version = wallet_row.version then

        if new.balance_after_minor <> wallet_row.balance_minor then
          raise exception
            'latest ledger balance must equal wallet balance';
        end if;

      else

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

      if transaction_row.kind = 'LOSS' then
        raise exception
          'LOSS transaction cannot generate ledger entry';
      end if;


      if transaction_row.kind = 'BET'
        and new.direction <> 'DEBIT' then
        raise exception 'BET ledger must be DEBIT';
      end if;

      if transaction_row.kind in ('OPENING', 'WIN')
        and new.direction <> 'CREDIT' then
        raise exception
          'OPENING/WIN ledger must be CREDIT';
      end if;


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
    $function$
    language plpgsql;
  `);
}

  override down(): void | Promise<void> {
    this.addSql(`select 1`);
  }

}
