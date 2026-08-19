import { Migration } from '@mikro-orm/migrations';

export class Migration20260819XXXXXX_add_wallet_ledger_constraint_trigger extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`
      create constraint trigger "ctrg_wallet_requires_ledger"
      after insert or update
      on "wallets"
      deferrable initially deferred
      for each row
      execute function assert_wallet_has_ledger();
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`
      drop trigger if exists "ctrg_wallet_requires_ledger"
      on "wallets";
    `);
  }

}