# Meu Financeiro — Etapa 3 (0.3.0)

Aplicação estática local-first em HTML, CSS e ES Modules. Dados no IndexedDB com Dexie 4.4.6 local; interface pt-BR e BRL. Sem backend, chamadas remotas de runtime, telemetria ou CDN.

## Executar

Node 20+ (CI com Node 24). Clone este repositório ou abra-o em um ambiente com acesso ao GitHub e, na pasta que contém `package.json`:

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:4173. O servidor é exclusivamente estático. Não abra index.html por file://. Em hospedagem, use raiz e fallback SPA. O vendor está versionado no repositório; não há build obrigatório.

## Fluxos

- **Contas:** criar, editar, mostrar arquivadas, arquivar/reativar e excluir quando não houver histórico; saldo derivado até a data local atual. A data do saldo inicial limita a primeira movimentação permitida.
- **Configurações → Categorias:** receitas e despesas, personalização do catálogo, arquivamento e exclusão protegida por referências em lançamentos/orçamentos.
- **Lançamentos:** receitas, despesas e transferências; criar/editar/excluir com confirmação, campos acessíveis, observações, centavos exatos e persistência após recarregar.
- **Filtros:** texto sem acentos/caixa, datas inclusivas, tipo, conta e categoria combinados com AND; botão Aplicar filtros, limpar e páginas de até 25 operações. Transferências sempre aparecem como um único item, mesmo ao filtrar a conta de destino.
- **Dashboard:** CTA conectado; indicadores e análises permanecem reservados à Etapa 4.

Use valores como `1.234,56` ou `12`; casas decimais, quando informadas, devem ter dois dígitos. A conversão usa BigInt temporário e persiste centavos inteiros. Campos continuam editáveis durante digitação intermediária; validação acontece ao salvar.

Registros arquivados saem das opções de criação e continuam legíveis no histórico e nos filtros. O domínio exige reativação para editar operações ligadas a eles; a interface mantém os dados do formulário ao apresentar o erro. Uma transferência existente não pode ser convertida em receita/despesa; editar seus campos preserva o par e os IDs.

Falhas não fecham o formulário nem alteram a lista otimisticamente. Use Salvar novamente após corrigir o problema. Na falha de abertura há Reconectar banco e navegação funcional. A aplicação não apaga dados para recuperar acesso.

## Arquitetura

`finance-session.js` compõe uma única API por sessão com a instância existente e inicializa o catálogo/settings idempotentemente. Views usam o controller operacional; controller e formulários usam apenas services. `operations-service.js` adapta a apresentação dos pares de transferência, delegando filtros, ordenação, atomicidade e validações ao motor aprovado. As camadas de banco, migration V2, contracts e repositories foram preservadas.

O modal nativo dialog fornece background inerte e contenção de foco. Escape e Cancelar são bloqueados durante a escrita. Submissões repetidas são ignoradas até a resposta do service. Renderizações antigas são descartadas e inscrições das views são removidas ao navegar.

## Verificar

```sh
npm ci
npm run lint
npm run format:check
npm run verify:static
npm test
npx playwright install chromium
npm run smoke
```

Com Microsoft Edge instalado:

```sh
npm run smoke:edge
```

A validação atual da Etapa 3 tem 68 testes Node, 72 testes Chromium e 60 repetições dirigidas dos cenários G3-03/G3-04 na CI; o número de casos pode mudar nas etapas seguintes. Os novos testes usam IndexedDB nativo e contextos Playwright independentes, sem compartilhar dados com outros testes ou o perfil real do usuário. `fake-indexeddb` permanece apenas nos testes Node do domínio.

**Gate 3 aprovado:** o [parecer independente final](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/2#issuecomment-5746490752) e a [CI da `main` após o PR #7](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35479581803) sustentam a decisão registrada em `docs/PROJECT_STATUS.md`. A CI roda em PRs e na `main`; os artefatos de navegador ficam no run correspondente.

Limitações: paginação limita DOM, mas o motor aprovado continua consultando dados em memória; grande volume requer benchmark posterior. A mudança em outra aba requer recarregar esta aba; não há sincronização visual multiaba. Zoom nativo/teclado virtual/dispositivos reais dependem de validação manual adicional. Backup, restore, health check, PWA e operação visual de orçamentos não foram antecipados.

Contratos completos da API: `docs/domain.md`. Trabalho pelo GitHub: `AGENTS.md` (regras dos agentes), `docs/WORKFLOW.md` (issues, branches, PRs e gates), `docs/ROADMAP.md` (etapas). Não é necessário trocar ZIPs. A liberação de cada etapa depende de auditoria independente e decisão expressa do Manager/Arquiteto.
