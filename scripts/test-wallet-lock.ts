import { MikroORM } from '@mikro-orm/postgresql';

import mikroOrmConfig from '../src/mikro-orm.config';
import { MikroOrmWalletRepository } from '../src/infrastructure/persistence/repositories/mikro-orm-wallet.repository';

const WALLET_ID =
  '11111111-1111-4111-8111-111111111111';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const orm = await MikroORM.init({
    ...mikroOrmConfig,
    debug: true,
  });

  /*
   * Dois EntityManagers independentes simulam
   * duas requisições/instâncias concorrentes.
   */
  const emA = orm.em.fork();
  const emB = orm.em.fork();

  const repoA = new MikroOrmWalletRepository(emA);
  const repoB = new MikroOrmWalletRepository(emB);

  try {
    console.log('\n--- TESTE DE LOCK PESSIMISTA ---\n');

    console.log('A: iniciando transação...');
    await emA.begin();

    console.log('A: tentando bloquear wallet...');

    const walletA =
      await repoA.findByIdForUpdate(WALLET_ID);

    if (!walletA) {
      throw new Error(
        `Wallet ${WALLET_ID} não encontrada`,
      );
    }

    console.log('A: LOCK OBTIDO ');
    console.log(
      `A: saldo = ${walletA.balance.toString()}`,
    );

    console.log('\nB: iniciando transação...');
    await emB.begin();

    console.log(
      'B: tentando bloquear a MESMA wallet...',
    );

    const startedAt = Date.now();

    let bAcquiredLock = false;

    const walletBPromise =
      repoB.findByIdForUpdate(WALLET_ID)
        .then((wallet) => {
          bAcquiredLock = true;

          const elapsed = Date.now() - startedAt;

          console.log(
            `B: LOCK OBTIDO após ${elapsed}ms `,
          );

          return wallet;
        });

    /*
     * Enquanto A mantém o lock,
     * B precisa ficar esperando.
     */
    await sleep(1500);

    if (bAcquiredLock) {
      throw new Error(
        'ERRO: B conseguiu o lock antes de A liberar!',
      );
    }

    console.log(
      '\nB continua esperando o lock ',
    );

    console.log(
      'A: fazendo COMMIT e liberando wallet...',
    );

    await emA.commit();

    console.log('A: COMMIT ');

    const walletB = await walletBPromise;

    if (!walletB) {
      throw new Error(
        `Wallet ${WALLET_ID} não encontrada por B`,
      );
    }

    await emB.commit();

    console.log('B: COMMIT ');

    console.log(
      '\n TESTE PASSOU: a mesma wallet foi serializada.',
    );
  } catch (error) {
    if (emA.isInTransaction()) {
      await emA.rollback();
    }

    if (emB.isInTransaction()) {
      await emB.rollback();
    }

    console.error('\n TESTE FALHOU');
    console.error(error);

    process.exitCode = 1;
  } finally {
    await orm.close(true);
  }
}

void main();