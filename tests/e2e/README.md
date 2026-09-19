# Navegador — Etapa 2

1. Na raiz, executar `npm ci`.
2. Com Chromium disponível: `npx playwright install chromium`, depois `npm run smoke`.
3. Com Microsoft Edge já instalado: `npm run smoke:edge`. Não é necessário baixar outro navegador. Usa a mesma suíte, mudando somente channel para msedge.
4. Guardar `evidence/browser-results.json` e `evidence/browser-artifacts/` da nova execução. Não confundir com `evidence/etapa-1-history/`.

O Playwright inicia/encerra o servidor estático na porta 4173, que deve estar livre.

São **45 casos**: os 19 da fundação preservados + 26 cenários de IndexedDB real. Os cenários novos importam o mesmo módulo de assertions da integração Node, mas usam a implementação nativa do navegador e Dexie local. Usam bancos aleatórios mf-domain-test-*; o finally exclui somente esses bancos. Não executam sobre dados do usuário.

A suíte cobre CRUD, filtros, saldos, constraints, concorrência de orçamento/arquivo, seed, rollback de cada operação de transferência, persistência após reabertura, migração V1 e rollback de migração. Falhas injetadas por hooks Dexie atingem a segunda escrita real, sem substituir o repository por mock.

Fundação: 360/390/768/1024/1440 × 900 px nos dois temas, cinco páginas/refresh, histórico, teclado, foco, temas/storage, contraste amostral, movimento reduzido e ampliação de texto. As fixtures verificam console/rede local. A inspeção manual complementar da baseline (clipping, foco, zoom nativo e capturas) continua aplicável; ampliação de texto não equivale a zoom nativo e não declara conformidade WCAG.

**Execução no ambiente desta entrega:** Chromium indisponível por falha de download; Edge não instalado. O runner foi chamado com `--max-failures=1` para registrar o impedimento. Nenhum caso browser foi aprovado nesta versão. A validação Edge da Etapa 1 é histórica, não substitui esses 45 casos.
