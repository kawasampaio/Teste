import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from 'react';

import './App.css';

const API_URL =
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000';

const WALLET_ID =
  '22222222-2222-4222-8222-222222222222';

const PLAYER_ID =
  'player-demo';

type Money = {
  amount: string;
  currency: string;
};

type WalletResponse = {
  id: string;
  playerId: string;
  balance: Money;
  version: number;
};

type BetResult =
  | 'WIN'
  | 'DRAW'
  | 'LOSS';

type ProcessedBet = {
  status: 'PROCESSED';

  betId: string;
  wagerTransactionId: string;

  chosenNumber: number;
  drawnNumber: number;

  result: BetResult;

  won: boolean;
  draw: boolean;

  stake: Money;
  payout: Money;
  profit: Money;
  balanceAfter: Money;

  replayed: boolean;
};

type RejectedBet = {
  status: 'REJECTED';
  reason: string;
  replayed: boolean;
};

type BetResponse =
  | ProcessedBet
  | RejectedBet;

const NUMBERS =
  Array.from(
    { length: 9 },
    (_, index) => index + 1,
  );

function formatBRL(
  amount: string,
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  ).format(Number(amount));
}

function getErrorMessage(
  data: unknown,
): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data
  ) {
    const message = (
      data as {
        message?: string | string[];
      }
    ).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Ocorreu um erro inesperado.';
}

function App() {
  const [
    chosenNumber,
    setChosenNumber,
  ] = useState(2);

  const [
    drawnNumber,
    setDrawnNumber,
  ] = useState<number | null>(
    null,
  );

  const [
    stake,
    setStake,
  ] = useState('10.00');

  const [
    balance,
    setBalance,
  ] = useState('0.00');

  const [
    result,
    setResult,
  ] =
    useState<ProcessedBet | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingWallet,
    setLoadingWallet,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadWallet =
    useCallback(
      async (): Promise<void> => {
        try {
          setLoadingWallet(true);

          const response =
            await fetch(
              `${API_URL}/wallets/${WALLET_ID}`,
            );

          const data =
            (await response.json()) as
              | WalletResponse
              | unknown;

          if (!response.ok) {
            throw new Error(
              getErrorMessage(data),
            );
          }

          const wallet =
            data as WalletResponse;

          setBalance(
            wallet.balance.amount,
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Erro ao buscar saldo.',
          );
        } finally {
          setLoadingWallet(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  async function placeBet(): Promise<void> {
    const normalizedStake =
      stake
        .trim()
        .replace(',', '.');

    if (
      !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(
        normalizedStake,
      ) ||
      Number(normalizedStake) <= 0
    ) {
      setError(
        'Digite um valor de aposta válido.',
      );

      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setDrawnNumber(null);

      const id =
        crypto.randomUUID();

      const response =
        await fetch(
          `${API_URL}/bets`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              providerId:
                'frontend',

              externalTransactionId:
                `bet-${id}`,

              idempotencyKey:
                `idem-${id}`,

              walletId:
                WALLET_ID,

              playerId:
                PLAYER_ID,

              roundId:
                `round-${id}`,

              gameId:
                'dados-da-sorte',

              chosenNumber,

              stake:
                normalizedStake,
            }),
          },
        );

      const data =
        (await response.json()) as
          | BetResponse
          | unknown;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data),
        );
      }

      const bet =
        data as BetResponse;

      if (
        bet.status === 'REJECTED'
      ) {
        setError(
          bet.reason ===
            'INSUFFICIENT_BALANCE'
            ? 'Saldo insuficiente para essa aposta.'
            : `Aposta rejeitada: ${bet.reason}`,
        );

        await loadWallet();

        return;
      }

      setResult(bet);

      setDrawnNumber(
        bet.drawnNumber,
      );

      setBalance(
        bet.balanceAfter.amount,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível realizar a aposta.',
      );
    } finally {
      setLoading(false);
    }
  }

  function resultTitle(): string {
    if (!result) {
      return '';
    }

    switch (result.result) {
      case 'WIN':
        return `🎉 Você ganhou +${formatBRL(
          result.profit.amount,
        )}!`;

      case 'DRAW':
        return '🤝 Empate!';

      case 'LOSS':
        return '😢 Não foi dessa vez.';
    }
  }

  function resultDescription(): string {
    if (!result) {
      return '';
    }

    switch (result.result) {
      case 'WIN':
        return `Sua aposta foi de ${formatBRL(
          result.stake.amount,
        )} e você recebeu ${formatBRL(
          result.payout.amount,
        )}.`;

      case 'DRAW':
        return `${formatBRL(
          result.stake.amount,
        )} foi devolvido para o seu saldo.`;

      case 'LOSS':
        return `Você perdeu ${formatBRL(
          result.stake.amount,
        )}. Tente novamente!`;
    }
  }

  return (
    <main className="app">
      {result?.result === 'WIN' && (
        <div
          className="confetti"
          aria-hidden="true"
        >
          {Array.from({
            length: 45,
          }).map((_, index) => {
            const style: CSSProperties = {
              left: `${
                (index * 23) % 100
              }%`,

              animationDelay: `${
                (index % 9) * 0.08
              }s`,

              animationDuration: `${
                2.3 +
                (index % 5) * 0.25
              }s`,
            };

            return (
              <span
                key={index}
                style={style}
              />
            );
          })}
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          DADOS DA SORTE
        </div>

        <div className="balance-card">
          <span className="balance-label">
            SALDO
          </span>

          <strong>
            {loadingWallet
              ? 'Carregando...'
              : formatBRL(balance)}
          </strong>
        </div>
      </header>

      <section className="game">
        <div className="numbers-area">
          <div className="number-column">
            <h2>
              SEU NÚMERO
            </h2>

            <div className="number-box">
              {chosenNumber}
            </div>
          </div>

          <div className="versus">
            VS
          </div>

          <div className="number-column">
            <h2>
              NÚMERO SORTEADO
            </h2>

            <div
              className={`number-box ${
                drawnNumber === null
                  ? 'unknown'
                  : ''
              }`}
            >
              {drawnNumber ?? '?'}
            </div>
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">
            ESCOLHA SEU NÚMERO
          </p>

          <div className="number-picker">
            {NUMBERS.map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  className={
                    chosenNumber ===
                    number
                      ? 'number-button active'
                      : 'number-button'
                  }
                  disabled={loading}
                  onClick={() =>
                    setChosenNumber(
                      number,
                    )
                  }
                >
                  {number}
                </button>
              ),
            )}
          </div>

          <label className="stake-label">
            VALOR DA APOSTA

            <div className="stake-input">
              <span>
                R$
              </span>

              <input
                value={stake}
                disabled={loading}
                inputMode="decimal"
                placeholder="10,00"
                onChange={(event) =>
                  setStake(
                    event.target.value,
                  )
                }
              />
            </div>
          </label>

          <button
            className="bet-button"
            type="button"
            disabled={
              loading ||
              loadingWallet
            }
            onClick={() =>
              void placeBet()
            }
          >
            {loading
              ? 'SORTEANDO...'
              : 'APOSTAR'}
          </button>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {result && (
          <section
            className={`result-card ${result.result.toLowerCase()}`}
          >
            <div className="result-icon">
              {result.result === 'WIN'
                ? '🏆'
                : result.result ===
                    'DRAW'
                  ? '🤝'
                  : '😢'}
            </div>

            <h3>
              {resultTitle()}
            </h3>

            <p>
              {resultDescription()}
            </p>

            <div className="result-balance">
              Saldo atual:{' '}
              <strong>
                {formatBRL(
                  result.balanceAfter
                    .amount,
                )}
              </strong>
            </div>
          </section>
        )}

        <p className="rules">
          Seu número maior vence •
          números iguais devolvem a
          aposta • número menor perde
        </p>
      </section>
    </main>
  );
}

export default App;