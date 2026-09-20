# Especificação da Etapa 4 — Dashboard, Analytics e Orçamentos (v1)

**Estado:** liberada para implementação após Gate 3 aprovado em [PROJECT_STATUS](../PROJECT_STATUS.md).  
**Destinatário:** Coding Agent — GPT-6 Astra Medium, conforme issue vinculada.  
**Gate de saída:** Gate 4, sujeito a CI, auditoria independente e decisão do Manager.  
**Baseline:** `main` no início da issue; referência funcional mínima: [merge do PR #7](https://github.com/tiagodtandrade-ops/meu-financeiro/commit/5dfafb7527ddfbe8dd1df81c07e888fb7d4d172c). Não fixar branch antiga durante a execução.

## 1. Objetivo e escopo

Substituir os indicadores fictícios no Dashboard e a página vazia de Orçamentos por dados reais do IndexedDB. Entregar: saldo total atual e por conta; receitas, despesas e resultado de um mês selecionado; distribuição de despesas por categoria; evolução mensal legível; cadastro, atualização e exclusão confirmada de limites por categoria de despesa, com comparação do realizado. Todos os valores exibidos devem derivar de services ou de um adaptador de leitura testado, sem persistir resultados calculados.

Respeitar a arquitetura local-first estática (HTML, CSS, ES Modules, Dexie local), pt-BR/BRL, datas civis e centavos inteiros. Preservar schema V2, migrações, IDs e timestamps. Não incluir backend, CDN, telemetria, chamadas externas, dados financeiros em localStorage, fixtures visíveis como dados reais, bibliotecas pesadas de gráficos, backup, restore, health check ou PWA desta etapa.

## 2. Fontes de verdade e semântica financeira

Usar `finance.analytics.balances(asOf)`, `finance.analytics.totals(filters)`, `finance.transactions.list(filters)`, `finance.accounts.list()`, `finance.categories.list()` e `finance.budgets.save/list/remove`. Consultar [contratos do domínio](../domain.md). Ler contas/categorias arquivadas para resolver nomes históricos; só permitir criar/editar orçamento para categoria ativa de despesa. Services continuam responsáveis por validação e transações; a UI não acessa tabelas Dexie.

- **Saldo atual:** `balances(todayLocalISO())`, incluindo saldo inicial e contas arquivadas, com indicação do `asOf` exibido. Saldos podem ser negativos. Saldo é posição, não soma de receitas do mês.
- **Mês selecionado:** intervalo civil inclusivo de primeiro ao último dia via `monthInterval`; receitas e despesas por `analytics.totals({from,to})`; resultado = receitas − despesas em centavos seguros, sem ponto flutuante. Transferências e saldos iniciais não entram nos totais, distribuição nem consumo de orçamento. Operações futuras dentro do mês entram no total mensal se a interface o rotular como **mês completo, inclusive agendadas**; na visualização de consumo **até hoje** do mês corrente, usar corte `min(fim do mês, hoje)`, e no futuro apresentar realizado até hoje como zero. Não misturar cortes diferentes sem rótulo.
- **Por categoria:** somar apenas despesas das linhas contábeis do intervalo, uma vez por lançamento; ordenar por valor decrescente e desempatar de modo determinístico. Categorias arquivadas continuam visíveis com rótulo de estado. Não arredondar centavos antes da soma; tratar histórico vazio e totais zero.
- **Evolução:** série de seis meses civis terminando no mês selecionado, com receitas e despesas; cada mês tem intervalo próprio e rótulo explícito. Garantir que transferência não aumente receitas/despesas.
- **Orçamento:** `budgets.save({month, categoryId, limitCents})` é upsert por mês/categoria; atualização do limite conserva ID e `createdAt`. Mudar mês/categoria cria outra chave e requer ação separada ou fluxo explícito de substituição, nunca migração silenciosa. Consumo = soma das despesas da categoria dentro do mês e do corte temporal rotulado; diferença = limite − consumo, podendo ficar negativa; distinguir visualmente acima/abaixo do limite com texto acessível, nunca só cor. Não considerar receitas nem transferências. Mesmo sem orçamento, despesas devem aparecer na análise, sem fabricar limite.

## 3. Interação e estados

Dashboard: substituir `R$ —` por valores reais somente quando `finance-session` estiver pronta; seletor de mês acessível com mês inicial local atual; indicadores e visualização da distribuição/evolução com equivalente textual ou tabela que comunique os números sem depender de cor ou gráfico. Manter CTA `+ Novo lançamento` funcional. Após criar/editar/excluir lançamentos em outra rota, recalcular ao voltar ou em notificação; descartar respostas antigas se o usuário trocar mês/navegar.

Orçamentos: lista para mês selecionado com categoria, limite, gasto, diferença e estado; criar/editar limite com valor pt-BR validado por `parseBRLToCents`, positivo e dentro do inteiro seguro; excluir com confirmação; bloquear duplo envio; após falha preservar entradas e estado visual anterior, mostrar erro junto ao formulário e permitir nova tentativa. Categoria arquivada com orçamento existente deve permanecer legível e removível, mas edição/criação exige reativação conforme service. Quando o banco estiver indisponível, manter navegação e oferecer o mecanismo existente de reconexão sem apagar dados. Estados de carregamento, vazio, nenhum orçamento, sem despesas, erro recuperável, sucesso e dados históricos arquivados devem ser distinguíveis.

Responsividade nos viewports da Etapa 3, ampliação de texto a 200%, dois temas, teclado, foco visível, leitor de tela e `prefers-reduced-motion`. Dados de usuário somente com construção segura de DOM; não usar sinks HTML dinâmicos. Sem overflow horizontal obrigatório ou charts inacessíveis. Não registrar dados financeiros em console.

## 4. Testes e evidências

Preservar os 68 testes Node, 72 Chromium e 60 repetições dirigidas G3-03/G3-04 da baseline (contagens podem aumentar). Criar casos novos proporcionais para: mês civil/leap year e passagem de ano; saldo inicial e conta arquivada; receita/despesa vs transferência; despesas futuras e corte até hoje; agregação em centavos exatos e empate de categorias; zero e saldo negativo; upsert conserva ID e `createdAt`; dois orçamentos no mesmo mês sem duplicar chave; categoria arquivada e orçamento histórico; validação de BRL e valor não positivo; exclusão confirmada e erro de banco com retry; reload, navegação, concorrência de troca de mês e vazamento de listeners; caracteres maliciosos exibidos como texto, ausência de request externo; acessibilidade textual e mobile.

Executar `npm ci`, `npm run lint`, `npm run format:check`, `npm run verify:static`, `npm test` e `npm run smoke` na CI. Ampliar testes do Chromium usando IndexedDB nativo e bancos isolados. Preservar rastreio e asserções de warning das regressões G3-03/G3-04; não esconder falhas com retry ou skip. Anexar logs/JSON/traces pertinentes sem dados financeiros pessoais.

Limites do Gate 3 a reavaliar quando possível: Edge da interface atual, zoom nativo, teclado virtual e dispositivo real seguem `NOT VERIFIED`. Automatização de viewport/fonte não equivale a comprovação em dispositivo. Se o ambiente não permitir esses testes, registrar o impedimento e um roteiro manual curto para o usuário, sem tratar `NOT VERIFIED` como `PASS`.

## 5. Entrega e auditoria

Abrir PR para `main` relacionado à issue da Etapa 4, com diff, decisões de semântica temporal, métricas, testes, run da CI, limites e riscos. A auditoria independente (GPT-5.6 Sol Leve) deve verificar números, corte temporal, orçamento, acessibilidade e regressões, registrar PASS/FAIL/NOT VERIFIED e recomendar merge/gate. O Coding Agent não aprova a própria entrega. Só o Manager decide merge e Gate 4 após CI pós-merge na `main`.
