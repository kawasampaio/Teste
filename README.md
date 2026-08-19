# 🎲 Dados da Sorte

A ideia é fácil de entender: o jogador escolhe um número de **1 a 9**, informa o valor da aposta e o backend sorteia outro número. A regra final ficou assim:

- **Número escolhido maior que o sorteado:** vitória.
- **Número escolhido igual ao sorteado:** empate e devolução da aposta.
- **Número escolhido menor que o sorteado:** derrota.

Apesar de o jogo ser simples, a parte principal do projeto foi tratar o saldo de forma segura, pensando em concorrência, idempotência, histórico financeiro e consistência no banco.

---

## 🧠 Como o projeto foi pensado

Desde o começo, a ideia não foi apenas fazer um botão de apostar funcionar.

Como existe saldo envolvido, precisávamos evitar problemas como:

- a mesma aposta ser debitada duas vezes;
- duas requisições alterarem a mesma carteira ao mesmo tempo;
- saldo ficar negativo;
- um crédito existir sem histórico;
- um retry gerar um novo sorteio;
- uma operação ficar pela metade;
- o frontend virar a fonte da verdade do saldo.

Por isso, várias decisões foram feitas colocando o **PostgreSQL e o domínio como responsáveis pelas regras mais importantes**.

---

# 🛠️ Tecnologias usadas

## Bun

O projeto usa **Bun** para instalar dependências, executar scripts, rodar testes e iniciar as aplicações.

Exemplos:

```bash
bun install
bun test
bun run start:dev
bun run build
```

Escolhi manter o Bun porque ele funciona muito bem com TypeScript e deixou o fluxo de desenvolvimento simples e rápido.

---

## NestJS

O backend foi feito com **NestJS**.

A principal vantagem aqui foi organização. Em vez de misturar HTTP, banco e regra de negócio, o projeto foi separado em camadas:

```text
src/
├── application/
├── domain/
├── infrastructure/
├── presentation/
├── database/
└── main.ts
```

O Nest também foi usado para:

- Dependency Injection;
- Controllers;
- Providers;
- DTOs;
- ValidationPipe;
- tratamento de erros HTTP;
- CORS para o frontend.

---

## PostgreSQL 17

O banco é **PostgreSQL 17**, rodando com Docker.

Ele não foi usado só para armazenar dados. Também virou uma camada de proteção das regras financeiras através de:

- transactions;
- foreign keys;
- `CHECK`;
- índices únicos;
- triggers;
- `SELECT ... FOR UPDATE`;
- rollback;
- constraints de consistência.

---

## Docker

O PostgreSQL roda com Docker Compose.

Isso deixa o ambiente fácil de reproduzir sem precisar instalar e configurar o PostgreSQL manualmente em cada máquina.

Configuração usada no desenvolvimento:

```text
Banco: app
Usuário: app
Porta: 5432
```

---

## MikroORM

O **MikroORM** faz a integração entre NestJS e PostgreSQL.

Ele foi utilizado para:

- entidades;
- repositories;
- migrations;
- transactions;
- lock pessimista;
- persistência das alterações.

Durante o desenvolvimento tivemos um problema com entidades sendo carregadas de caminhos diferentes (`src` e `dist`). Para evitar prototypes duplicados, no final passamos a registrar as classes das entities explicitamente.

Também foi utilizado o `ReflectMetadataProvider`, junto com os decorators legacy do MikroORM.

---

# 💰 Dinheiro sem float

Uma decisão importante foi **não usar `number` para representar dinheiro**.

Na API, valores chegam como string:

```json
{
  "stake": "10.00"
}
```

No domínio usamos uma classe `Money`.

No banco, os valores são salvos em unidades menores:

```text
R$ 10,00  → 1000
R$ 100,00 → 10000
```

Isso evita problemas de ponto flutuante, como:

```js
0.1 + 0.2 !== 0.3
```

Para cálculos internos também foi utilizado `decimal.js`.

---

# 👛 Wallet

Cada jogador possui uma carteira.

Ela mantém dados como:

```text
id
playerId
currency
balance
version
createdAt
updatedAt
```

A moeda usada atualmente é:

```text
BRL
```

O saldo nunca pode ficar negativo. Essa regra existe no domínio e também no PostgreSQL.

---

# 🔢 Versionamento da wallet

Cada mudança real no saldo incrementa a versão da carteira.

Exemplo:

```text
wallet criada → version 1
BET           → version 2
WIN           → version 3
```

Isso permite relacionar cada movimentação financeira com o estado exato da wallet naquele momento.

---

# 🔒 Concorrência com SELECT FOR UPDATE

Quando uma aposta começa, a wallet é carregada com lock pessimista:

```sql
SELECT ...
FOR UPDATE
```

Se duas requisições tentarem mexer na mesma carteira:

```text
Requisição A
    ↓
bloqueia a wallet

Requisição B
    ↓
espera

A termina
    ↓
B continua
```

Foi criado um teste específico para provar esse comportamento, e ele passou.

O lock não é global. Só a linha da wallet envolvida fica bloqueada.

---

# 📒 Ledger financeiro

Além do saldo atual da wallet, existe um histórico imutável de movimentações.

Cada alteração de saldo gera uma entrada no ledger.

Exemplo:

```text
Saldo inicial: R$ 100

BET R$ 10
100 → 90

WIN R$ 20
90 → 110
```

Cada entrada registra:

```text
wallet
transaction
direction
amount
balance before
balance after
wallet version
created at
```

As direções são:

```text
DEBIT
CREDIT
```

## Por que imutável?

Uma movimentação financeira confirmada não deve ser editada ou apagada.

Por isso existem triggers no PostgreSQL que bloqueiam alterações indevidas no ledger, como `UPDATE`, `DELETE` e `TRUNCATE`.

Se alguma operação precisar ser compensada, o correto é criar uma nova movimentação.

---

# 📅 Daily Ledger

Também existe um ledger diário.

Ele agrupa movimentações por jogador e dia e possui proteção contra duplicidade.

Isso ajuda principalmente em situações concorrentes, em que duas operações podem tentar criar o ledger do mesmo jogador no mesmo dia.

---

# 🎰 Wager Transactions

As operações do jogo são registradas como `WagerTransaction`.

Tipos usados:

```text
OPENING
BET
WIN
LOSS
REFUND
ROLLBACK
```

Estados possíveis:

```text
PENDING
PENDING_REFERENCE
PROCESSED
REJECTED
FAILED
```

Exemplos:

```text
BET → PROCESSED
```

ou:

```text
BET → REJECTED → INSUFFICIENT_BALANCE
```

---

# 🔁 Idempotência

Idempotência foi uma das partes mais importantes.

Imagine que o frontend envia uma aposta, o backend processa, mas a conexão cai antes da resposta chegar. O frontend pode tentar novamente.

Sem proteção, poderia acontecer:

```text
requisição 1 → -R$ 10
retry        → -R$ 10 de novo
```

Cada operação possui informações como:

```text
providerId
idempotencyKey
externalTransactionId
payloadHash
```

O PostgreSQL possui restrições únicas e o repository faz inserção atômica com `ON CONFLICT`.

Se a mesma requisição chegar de novo:

```json
{
  "replayed": true
}
```

O servidor retorna o mesmo resultado anterior e **não**:

- debita novamente;
- sorteia outro número;
- cria outra aposta;
- altera o saldo novamente.

O `payloadHash` também permite detectar quando alguém tenta usar a mesma chave de idempotência com dados diferentes.

---

# 🎲 Regra do jogo

O jogador escolhe um número entre:

```text
1 e 9
```

O backend sorteia outro número usando `randomInt()` de `node:crypto`.

O frontend nunca decide o resultado.

A regra final é:

```text
escolhido > sorteado → WIN
escolhido = sorteado → DRAW
escolhido < sorteado → LOSS
```

---

# 🎉 Vitória

Exemplo:

```text
Saldo: R$ 100
Aposta: R$ 10
Escolhido: 8
Sorteado: 3
```

A aposta é debitada:

```text
100 - 10 = 90
```

Depois o prêmio é creditado em 2x:

```text
90 + 20 = 110
```

Resultado:

```text
Saldo final: R$ 110
Lucro real: +R$ 10
```

No frontend:

```text
🎉 Você ganhou +R$ 10,00!
```

com confete.

---

# 🤝 Empate

Exemplo:

```text
Escolhido: 5
Sorteado: 5
```

A aposta é debitada normalmente:

```text
100 - 10 = 90
```

Depois é criado um `REFUND`:

```text
90 + 10 = 100
```

O jogador não perde dinheiro.

No frontend:

```text
🤝 Empate!
R$ 10,00 foi devolvido para o saldo.
```

---

# 😢 Derrota

Exemplo:

```text
Escolhido: 2
Sorteado: 7
```

A aposta é debitada:

```text
100 - 10 = 90
```

Não existe crédito adicional.

No frontend:

```text
😢 Não foi dessa vez.
Você perdeu R$ 10,00.
```

---

# 🧾 Bets

O resultado final da aposta é persistido na tabela `bets`.

Ela guarda informações como:

```text
chosenNumber
drawnNumber
result
stake
payout
balanceAfter
```

Os resultados são:

```text
WIN
DRAW
LOSS
```

O PostgreSQL também valida a consistência:

```text
WIN  → escolhido > sorteado e payout = stake * 2
DRAW → escolhido = sorteado e payout = stake
LOSS → escolhido < sorteado e payout = 0
```

Isso é importante porque o banco também protege a regra, não apenas o TypeScript.

---

# 📤 Transactional Outbox

Foi implementado o padrão **Transactional Outbox**.

Quando uma aposta termina, um evento `BetSettled` é salvo na mesma transação da aposta.

Isso evita situações como:

```text
saldo atualizado ✅
evento não salvo ❌
```

O Outbox também possui informações para retry:

```text
attempts
nextAttemptAt
publishedAt
```

A persistência do Outbox está pronta. Uma fila ou broker pode ser conectado depois.

---

# 🔄 Fluxo transacional da aposta

De forma simplificada:

```text
BEGIN
  ↓
idempotência
  ↓
wallet FOR UPDATE
  ↓
validação de saldo
  ↓
BET
  ↓
wallet
  ↓
ledger
  ↓
sorteio
  ↓
WIN / DRAW / LOSS
  ↓
movimentação complementar
  ↓
bets
  ↓
outbox
  ↓
COMMIT
```

Se qualquer etapa falhar:

```text
ROLLBACK
```

Assim o sistema não fica com uma operação pela metade.

---

# 🧪 Testes feitos

Além dos testes unitários, foram feitos testes reais contra PostgreSQL.

Em uma das etapas o projeto chegou a:

```text
62 testes passando
0 falhas
```

Também foram feitos testes específicos.

## Teste de concorrência

Duas transações tentaram bloquear a mesma wallet.

A segunda ficou esperando a primeira liberar.

Resultado:

```text
✅ SELECT FOR UPDATE funcionando
```

## Teste completo WIN / DRAW / LOSS

Foi criada uma wallet temporária com R$ 100.

### WIN

```text
8 x 3
100 - 10 + 20 = 110
```

### DRAW

```text
5 x 5
110 - 10 + 10 = 110
```

### LOSS

```text
2 x 7
110 - 10 = 100
```

Saldo final:

```text
R$ 100
```

Wallet version final:

```text
6
```

O ledger ficou:

```text
v1 CREDIT 10000   0     → 10000
v2 DEBIT   1000   10000 → 9000
v3 CREDIT  2000   9000  → 11000
v4 DEBIT   1000   11000 → 10000
v5 CREDIT  1000   10000 → 11000
v6 DEBIT   1000   11000 → 10000
```

Também foram validados:

```text
7 wager transactions
6 ledger entries
3 bets
3 outbox messages
1 daily ledger
```

No fim do teste era feito rollback para não deixar dados temporários no banco.

---

# 🌐 API

## Consultar wallet

```http
GET /wallets/:id
```

Exemplo:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "playerId": "player-demo",
  "balance": {
    "amount": "100.00",
    "currency": "BRL"
  },
  "version": 1
}
```

## Fazer aposta

```http
POST /bets
```

Exemplo:

```json
{
  "providerId": "frontend",
  "externalTransactionId": "bet-123",
  "idempotencyKey": "idem-123",
  "walletId": "22222222-2222-4222-8222-222222222222",
  "playerId": "player-demo",
  "roundId": "round-123",
  "gameId": "dados-da-sorte",
  "chosenNumber": 8,
  "stake": "10.00"
}
```

Exemplo de vitória:

```json
{
  "status": "PROCESSED",
  "chosenNumber": 8,
  "drawnNumber": 3,
  "result": "WIN",
  "won": true,
  "draw": false,
  "stake": {
    "amount": "10.00",
    "currency": "BRL"
  },
  "payout": {
    "amount": "20.00",
    "currency": "BRL"
  },
  "profit": {
    "amount": "10.00",
    "currency": "BRL"
  },
  "balanceAfter": {
    "amount": "110.00",
    "currency": "BRL"
  },
  "replayed": false
}
```

---

# ✅ Validação da API

Foi utilizado `class-validator` junto com `ValidationPipe`.

São validados pontos como:

```text
chosenNumber entre 1 e 9
walletId válido
campos obrigatórios
stake como string decimal
máximo de 2 casas decimais
```

Exemplos rejeitados:

```json
{ "chosenNumber": 15 }
```

```json
{ "stake": "10.999" }
```

```json
{ "stake": "1e3" }
```

Também usamos:

```text
whitelist
forbidNonWhitelisted
```

para rejeitar propriedades desconhecidas.

---

# 🖥️ Frontend

O frontend foi construído com:

```text
React
TypeScript
Vite
```

Ele fica dentro de:

```text
frontend/
```

A URL do backend é configurada com:

```env
VITE_API_URL=http://localhost:3000
```

A interface possui:

- saldo no topo;
- número escolhido;
- número sorteado;
- botões de 1 até 9;
- campo do valor da aposta;
- botão `APOSTAR`;
- feedback visual de resultado;
- confete na vitória;
- feedback neutro no empate;
- efeito de derrota;
- fundo preto com detalhes roxos.

O frontend não calcula o saldo por conta própria. Depois da aposta ele usa o `balanceAfter` retornado pelo backend.

---

# 📁 Estrutura resumida

```text
meu-projeto/
│
├── src/
│   ├── application/
│   │   ├── ports/
│   │   └── use-cases/
│   │
│   ├── domain/
│   │   ├── bet/
│   │   ├── ledger/
│   │   ├── messaging/
│   │   ├── money/
│   │   ├── wager/
│   │   └── wallet/
│   │
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── entities/
│   │   │   ├── mappers/
│   │   │   └── repositories/
│   │   └── random/
│   │
│   ├── presentation/
│   │   ├── controllers/
│   │   └── dto/
│   │
│   ├── database/
│   │   └── migrations/
│   ├── app.module.ts
│   ├── main.ts
│   └── mikro-orm.config.ts
│
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── App.css
│       └── index.css
│
├── scripts/
│   ├── create-demo-wallet.ts
│   ├── test-process-bet.ts
│   └── test-wallet-lock.ts
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 🚀 Como rodar

## Backend

Na raiz do projeto:

```bash
bun install
```

Suba o PostgreSQL:

```bash
docker compose up -d
```

Aplique as migrations:

```bash
bunx mikro-orm migration:up
```

Crie a wallet demo:

```bash
bun scripts/create-demo-wallet.ts
```

Inicie o backend:

```bash
bun run start:dev
```

Backend:

```text
http://localhost:3000
```

## Frontend

Em outro terminal:

```bash
cd frontend
bun install
bun run dev
```

O Vite mostrará a URL local no terminal.

---

# 🧪 Testes

Testes gerais:

```bash
bun test
```

Teste de lock:

```bash
bun scripts/test-wallet-lock.ts
```

Teste completo de aposta:

```bash
bun scripts/test-process-bet.ts
```

---

# 🔐 Principais garantias

O projeto foi construído tentando manter:

```text
✅ saldo não negativo
✅ dinheiro sem float
✅ idempotência
✅ retry sem débito duplicado
✅ replay sem novo sorteio
✅ lock por wallet
✅ transactions PostgreSQL
✅ ledger imutável
✅ wallet versionada
✅ constraints no banco
✅ migrations versionadas
✅ Outbox transacional
✅ rollback em falhas
✅ validação de entrada
✅ resultado calculado no backend
✅ saldo controlado pelo backend
```

---

# 📌 Próximos passos possíveis

Algumas melhorias naturais seriam:

- autenticação real;
- jogadores reais em vez da wallet demo;
- endpoint de cadastro;
- histórico de apostas;
- WebSocket;
- fila/mensageria para Outbox;
- testes E2E automatizados;
- CI/CD;
- deploy;
- logs estruturados;
- observabilidade;
- configuração separada para development/test/production.

---

# 💡 Resumo

O projeto começou como um jogo simples de números, mas o backend foi desenvolvido pensando em problemas que aparecem quando existe saldo envolvido.

Em vez de simplesmente fazer:

```text
saldo = saldo - aposta
```

o fluxo ficou mais próximo de:

```text
Frontend
↓
API
↓
Validação
↓
Idempotência
↓
Transaction
↓
Wallet Lock
↓
Regra do jogo
↓
Ledger
↓
Wager Transaction
↓
Bet
↓
Outbox
↓
PostgreSQL
```

Isso deixou o projeto maior do que um jogo básico, mas também muito mais seguro e interessante do ponto de vista de backend.
