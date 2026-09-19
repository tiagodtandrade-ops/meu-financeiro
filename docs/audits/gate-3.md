# Auditoria independente — Gate 3

**Destinatário:** Auditor  
**Modelo:** GPT-5.6 Sol Leve  
**Estado:** pendente; Gate 3 aberto  
**Código a examinar:** `main` no commit relevante para a issue de auditoria; compare com o commit inicial da Etapa 3 `a69a77165a7e5b5523baae5d265267a5d21b37d1`.

## Entradas

- Especificação `docs/specs/etapa-3-interface.md`, contratos `docs/domain.md`, README, código e testes do repositório.
- [Run 35429443823](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35429443823) e [artefato de evidências](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35429443823/artifacts/10579814815). Na expiração do artefato (14 dias desde 19/09/2026), peça ao Manager uma nova execução; não invente o conteúdo do trace.
- Resultado observado: `npm test` 68/68; Chromium 66/67, um teste de foco reprovado. O job falhou.

Confirme quais entradas conseguiu abrir. Registre `NOT VERIFIED` para o que não puder verificar; indisponibilidade de arquivo/navegador não é, por si, defeito do código.

## Investigar a falha

Em `tests/e2e/operations.spec.js:329`, após `Nome` receber foco, o teste pressiona `Shift+Tab` e espera que `Salvar` receba foco. Consulte `browser-results.json`, log, screenshot e trace dentro do artefato (`browser-artifacts/operations-teclado-foco-in-2cdf6-tenção-Escape-e-restauração/trace.zip`). Compare a ordem de foco real, o componente `js/components/operation-form.js` e o comportamento do `<dialog>` nativo. Se possível, reproduza com o Chromium e documente `document.activeElement` antes/depois, contenção do foco, Escape e restauração ao botão de origem.

Determine se o problema decorre da aplicação, da asserção do teste, de comportamento permitido pelo diálogo nativo ou se falta prova. Se a asserção for inadequada, preserve uma verificação confiável do requisito de foco. Não assuma a causa antecipadamente.

## Cobertura integral

Audite contas, categorias, receitas, despesas, transferências, validação pt-BR/centavos, filtros e paginação, persistência IndexedDB, regressão das Etapas 1/2, segurança DOM, acessibilidade e responsividade. Confronte implementação e testes com a especificação. Separe observação em Chromium Linux de critérios específicos de Edge ou dispositivos reais. Verifique se os outros 66 casos realmente passaram e se houve skips, retries, flakiness ou falhas de console/request. Quando possível, repita `npm ci`, lint, formatação, verificação estática, testes Node e navegador.

## Saída

Registre parecer na issue de auditoria, com: commit inspecionado; arquivos e evidências abertos; comandos/resultado; matriz `PASS`, `FAIL`, `NOT VERIFIED`; achados com ID, gravidade, local, impacto e aceite; riscos residuais; recomendação `APROVAR ETAPA 3`, `CORRIGIR ANTES DE AVANÇAR` ou `AUDITORIA PARCIAL — GATE 3 PENDENTE` quando a prova essencial faltar. O Manager/Arquiteto decide o gate após o parecer. Não implemente correções nem inicie a Etapa 4.
