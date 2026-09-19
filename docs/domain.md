# Contratos do núcleo financeiro 0.2.0

## Persistência e migration

`SCHEMA_V1` foi mantido literal, assim como `db.version(1).stores(SCHEMA_V1)`. A V2 acrescenta índice único `[transferId+direction]` em transactions e `budgetKey` único em budgets. O índice anterior de mês/categoria também permanece. `budgetKey` é `YYYY-MM|categoryId`, técnico e redundante apenas para unicidade; nenhum saldo derivado é persistido.

Na atualização V1 → V2:

1. Ler contas, categorias, lançamentos e orçamentos existentes na própria transação de upgrade.
2. Verificar contratos, timestamps, estados, referências, categorias/tipos, datas iniciais, pares de transferência, duplicatas de orçamento e segurança dos saldos por data.
3. Acrescentar somente `budgetKey` aos orçamentos. Todos os IDs, timestamps, campos extras e demais registros são preservados; settings não são alterados.
4. Erro de validação, conflito de índice ou escrita aborta o upgrade integral. Nenhuma limpeza, renumeração, exclusão ou arbitragem financeira automática. A abertura rejeita e conserva o banco anterior; será necessário diagnosticar os registros incompatíveis antes de tentar novamente.

A V1 era uma fundação sem contrato de registros preenchidos. Não se inventam valores financeiros para registros legados incompletos. A migração aceita registros compatíveis com os contratos abaixo e recusa inconsistências. Banco V1 vazio migra; banco novo abre diretamente na versão 2. Nenhum seed roda durante migration.

## Entidades

IDs são strings estáveis geradas por crypto.randomUUID, exceto seis UUIDs fixos do catálogo inicial. Timestamps `createdAt`/`updatedAt` são ISO técnicos, criados pela camada de serviço. IDs e createdAt não podem ser alterados por patch. Campos desconhecidos/imutáveis em comandos são rejeitados. Serviços retornam registros, sem expor tabelas.

| Entidade | Dados aceitos |
|---|---|
| Conta | name; type checking/savings/cash/other; initialBalanceCents inteiro seguro com sinal; initialBalanceDate YYYY-MM-DD; color/icon opcionais |
| Categoria | name; kind income/expense; color/icon opcionais |
| Receita/despesa | description; date; amountCents inteiro seguro **positivo**; type income/expense; accountId; categoryId obrigatório e compatível; notes opcional |
| Transferência (comando) | description; date; amountCents positivo; fromAccountId; toAccountId; notes opcional; nenhuma categoria |
| Transferência (armazenamento) | dois registros type transfer, direction out/in, mesmo transferId, valor/data/descrição/notas; IDs próprios; contas diferentes |
| Orçamento | month YYYY-MM; categoryId de despesa; limitCents inteiro seguro **positivo**; id/createdAt preservados por chave mês/categoria |
| Settings | chave preferences com BRL/pt-BR; marcador initial-categories-v1; valores existentes preservados na inicialização |

Textos são aparados, sem HTML. Nome/descrição/IDs de entrada: máximo 200 caracteres; notas: 2.000; cor: 40; ícone: 80. Cor e ícone são metadados textuais; uma futura UI deve aplicar seu próprio conjunto permitido antes de usá-los como CSS/HTML. Campos opcionais ausentes viram string vazia em novos registros.

## API pública

Todas as funções abaixo retornam Promise. Crie `finance = createFinance(database)` após `await openDatabase(database)`.

| Serviço | Métodos |
|---|---|
| accounts | create(input), list({includeArchived = true}), get(id), update(id, patch), archive(id, archived = true), remove(id) |
| categories | create(input), list({includeArchived = true}), get(id), update(id, patch), archive(id, archived = true), remove(id) |
| transactions | create(input), list(filters), get(id), update(id, patch), remove(id), createTransfer(input), getTransfer(transferId), updateTransfer(transferId, patch), removeTransfer(transferId) |
| budgets | save({month, categoryId, limitCents}), list(), get(id), remove(id) |
| analytics | balance(accountId, asOf?), balances(asOf?), totals(filters?) |
| settings | initialize(), get() |

`budgets.save` é upsert pelo mês/categoria. Alterar limite mantém ID e createdAt. Mudar mês/categoria significa outra identidade lógica; para substituir orçamento, remover a chave antiga e salvar a nova conforme a intenção explícita do chamador. Duas gravações concorrentes para a mesma chave produzem um registro.

Transferências retornam `{transferId, entries: [outgoing, incoming]}`. Editar mantém transferId e IDs das duas pernas. `transactions.get(id)` permite ler uma perna; update/remove comuns rejeitam alteração isolada (`TRANSFER_USE_API`). list retorna linhas contábeis: uma transferência aparece duas vezes sem filtro de conta. A UI futura poderá agrupá-las por transferId, sem duplicar valores em resumos.

## Integridade e atomicidade

- Escritas e verificações de referência ocorrem juntas em transação Dexie `rw` sobre as cinco tabelas. Isso serializa também corridas entre exclusão/arquivamento e inserção. Leituras de cálculo usam transação `r` consistente.
- Criação, edição e exclusão de transferência escrevem ambos os lados dentro da mesma transação. Falha em qualquer lado reverte ambos. Não há catch que transforme falha em sucesso.
- Transferência exige contas existentes, ativas e diferentes. A data deve ser igual ou posterior ao saldo inicial de ambas. Categoria é proibida no comando.
- Contas/categorias referenciadas não podem ser excluídas. Categorias também são protegidas por orçamentos. Preferir archive; `archive(id, false)` restaura.
- Arquivados continuam no histórico e nos saldos. Novas gravações e edição de lançamentos/orçamentos exigem referências ativas. Exclusão de lançamento/transferência/orçamento antigo é permitida mesmo com referência arquivada. Metadados de conta/categoria arquivada podem ser editados dentro das demais regras.
- Tipo de categoria referenciada não pode mudar. Nome/cor/ícone podem mudar sem reescrever histórico. Nomes iguais são permitidos: identidade é pelo ID.
- Data do saldo inicial não pode ultrapassar nenhum lançamento existente. Lançamento anterior ao saldo inicial é rejeitado. Saldos negativos são permitidos.
- Os saldos por conta e o total devem caber em inteiro seguro ao final de cada data civil. A linha do tempo é validada antes do commit. Uma compensação futura não pode ocultar overflow passado. Não há limite intradiário porque a unidade temporal do domínio é a data civil.
- O índice único de direção complementa a integridade, mas IndexedDB não tem foreign keys/check constraints. Todas as escritas normais devem passar pelos serviços. Alteração manual do banco fora dessa API não é protegida; pares inconsistentes detectados pela API de transferências são recusados, não reparados automaticamente.

O catálogo inicial é opt-in via `settings.initialize()`, atômico e idempotente. Contém Salário, Outras receitas, Alimentação, Moradia, Transporte e Saúde. O marcador impede reaplicar nomes depois da personalização ou recriar categorias excluídas. Colisão inesperada de ID sem marcador aborta em vez de sobrescrever. Nenhuma conta ou movimentação sintética é inserida no banco do usuário.

## Cálculos, datas e dinheiro

`balance(id, asOf)` = saldo inicial + receitas − despesas + entradas de transferência − saídas. Se asOf antecede a data inicial, resultado zero. Sem asOf usa a data civil local de hoje; futuro só entra quando solicitado. `balances` retorna `{asOf, byAccount: [{accountId,balanceCents}], totalCents}` e sempre inclui arquivados.

`totals` retorna `{incomeCents, expenseCents}` no intervalo/filtros informado, ignorando transferências e saldos iniciais. Sem filtro de data, considera todo o histórico (inclusive futuro), de forma distinta do saldo atual. Receita/despesa usa valor absoluto; não persistir sinal para expressar tipo.

Filtros opcionais: from/to inclusivos, accountId, categoryId, type (income/expense/transfer), text. São combinados com AND; busca em descrição e notas ignora caixa e acentos. Intervalo invertido/tipo inválido é erro. Referência de filtro sem resultados retorna lista vazia. Ordenação crescente por date, createdAt e id, sem depender da ordem de inserção.

`parseBRLToCents`: aceita texto como `1.234,56`, `1234,56`, `10`, `-0,01`, com espaços somente nas extremidades. Rejeita símbolo R$, notação científica, decimal com ponto, agrupamento inválido e fração diferente de dois dígitos. O sinal é útil para saldo inicial; lançamentos/orçamentos exigem positivo. Nenhuma entrada inválida vira zero ou é arredondada.

Aritmética usa BigInt temporário para exatidão e retorna Number inteiro seguro; persistência usa somente centavos inteiros Number. formatBRL separa parte inteira/fração com BigInt, inclusive no limite seguro. Datas gregorianas prolépticas 0001–9999, sem conversão UTC; monthInterval retorna `{from,to}` sem Date. Timestamps técnicos são independentes das datas financeiras.

## Erros e limites

DomainError expõe `code` e mensagem pt-BR: VALIDATION, NOT_FOUND, ARCHIVED, REFERENCED, CATEGORY_KIND, DATE_BEFORE_OPENING, TRANSFER_USE_API, INTEGRITY, MONEY_OVERFLOW, SEED_CONFLICT, PERSISTENCE. Erros de persistência preservam `cause`. Na abertura, o wrapper existente mantém a rejeição com causa de migration; MIGRATION_INVALID informa que o banco não foi atualizado.

O chamador deve apresentar a mensagem, registrar somente metadados técnicos necessários e jamais tratar rejeição como sucesso. Não há logging de dados financeiros nos serviços.

Para esta etapa, listagens e validações carregam o conjunto local em memória. A validação de saldo percorre a linha do tempo em O(n log n), e as transações abrangem cinco tabelas. Favorece integridade e simplicidade em uso pessoal; benchmarks/paginação para grandes volumes não foram feitos. Nenhum gráfico, formulário financeiro, importação, backup, autenticação ou PWA foi implementado.
