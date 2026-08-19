import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

import type { TransactionRunnerPort } from '../../application/ports/transaction-runner.port';

@Injectable()
export class MikroOrmTransactionRunner
  implements TransactionRunnerPort
{
  constructor(
    private readonly em: EntityManager,
  ) {}

  async run<T>(
    work: () => Promise<T>,
  ): Promise<T> {
    return this.em.transactional(
      async () => work(),
      {
        clear: true,
      },
    );
  }
}