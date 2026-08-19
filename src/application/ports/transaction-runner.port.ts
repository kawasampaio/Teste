export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

export interface TransactionRunnerPort {
  run<T>(work: () => Promise<T>): Promise<T>;
}