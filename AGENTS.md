# Instruções para agentes — Meu Financeiro

Leia `README.md`, `docs/PROJECT_STATUS.md` e `docs/WORKFLOW.md` antes de atuar. A branch `main` contém o código de referência; o estado de aprovação está em `docs/PROJECT_STATUS.md`. O projeto é público: não inclua dados financeiros reais, credenciais, prints pessoais ou arquivos locais.

## Fonte única de trabalho

- Código e especificações: este repositório. Tarefas: GitHub Issues. Entregas: branches e Pull Requests. Testes: GitHub Actions e evidências ligadas ao PR/issue.
- Use links para commit/PR/run em vez de enviar ZIPs. Consulte sempre o estado mais recente da branch e da issue antes de trabalhar.
- Só o Manager/Arquiteto atualiza o estado dos gates e libera a próxima etapa. Gate 3 está aberto; Etapa 4 permanece bloqueada.

## Papéis

- **Manager/Arquiteto:** define escopo, emite briefs e issues, organiza dependências, interpreta o parecer independente e registra a decisão do gate. Modelo recomendado: GPT-5.6 Sol High.
- **Coding Agent:** implementa somente a issue liberada, em branch própria, testa e abre PR com evidências. Modelo recomendado: GPT-6 Astra Medium. Não aprova a própria entrega.
- **Auditor:** inspeciona código, trace, testes, resultado da CI e PR de forma independente; registra PASS/FAIL/NOT VERIFIED e achados. Modelo recomendado: GPT-5.6 Sol Leve; escalar para Medium somente se necessário. Não corrige nem aprova gate.
- **Usuário:** dono do produto, resolve escolhas de negócio e pode revisar o resultado.

## Restrições do produto

Web estática local-first; HTML, CSS e ES Modules sem framework ou backend; IndexedDB via Dexie local; dados financeiros em centavos inteiros, datas civis e interface pt-BR/BRL. Preserve schema V2 e migrations sem apagar dados. Não inclua telemetria, CDN de runtime ou dados financeiros em `localStorage`. Mantenha services como fonte das regras de domínio. Consulte `docs/domain.md` e a especificação da etapa para os detalhes.

## Como entregar

1. Trabalhe na issue atribuída, a partir da `main` atual; use branch `fix/issue-N-descricao` ou `feat/issue-N-descricao`.
2. Execute `npm ci`, `npm run lint`, `npm run format:check`, `npm run verify:static`, `npm test` e `npm run smoke` quando mudar comportamento. Documente qualquer impedimento real como `NOT VERIFIED`.
3. Abra PR para `main` usando o template. Relacione a issue, descreva critérios atendidos, riscos, testes e link da CI. Anexe apenas evidências sem dados pessoais; não faça commit de `node_modules` ou artefatos gerados.
4. Aguarde auditoria independente no PR e decisão expressa do Manager/Arquiteto. Não avance de etapa por conta própria.

Veja `docs/WORKFLOW.md` para gates, estados e próximos passos; `docs/PROJECT_STATUS.md` prevalece sobre textos históricos.
