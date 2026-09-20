# Estado do projeto — Meu Financeiro

**Atualizado em:** 20/09/2026  
**Versão do aplicativo:** 0.3.0  
**Versão de avaliação:** Etapa 3 publicada; Gate 3 ainda pendente  
**Gate:** 3 REABERTO após novo achado G3-05; a aprovação anterior está suspensa.  
**Etapa ativa:** correção G3-05; [UI/UX #10](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/10) atua em paralelo no diagnóstico e protótipo; Etapa 4 pausada.  
**Responsável atual:** Coding Agent — GPT-6 Astra Medium, [issue #9](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/9); Designer de UI/UX — GPT-6 Astra Medium — atua em paralelo na [issue #10](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/10).

## Decisão expressa do Gate 3

**DECISÃO REVISTA: Gate 3 reaberto.** A CI inicial pós-merge passou, mas [run posterior da `main`](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35479713545) reprovou 1/72 Chromium com `Dexie.delete('mf-smoke-…') was blocked` no teste de fundação. [Issue #9](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/9) trata G3-05. A issue #8 da Etapa 4 está pausada até correção, reauditoria e nova decisão expressa. A versão atual pode ser publicada para avaliação, com essa falha de teste conhecida. O [parecer independente do Auditor sobre G3-03/G3-04](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/2#issuecomment-5746490752) recomenda o merge do [PR #7](https://github.com/tiagodtandrade-ops/meu-financeiro/pull/7) e a conclusão do Gate após CI verde na `main`. O PR foi incorporado no [commit `5dfafb7`](https://github.com/tiagodtandrade-ops/meu-financeiro/commit/5dfafb7527ddfbe8dd1df81c07e888fb7d4d172c). A [CI pós-merge, primeira tentativa](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35479581803) passou lint, formato, verificação de estáticos, **68/68 Node, 60/60 repetições dirigidas sem retry e 72/72 Chromium**; [artefato](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35479581803/artifacts/10595477463) retido até 04/10/2026. O job e todas as etapas terminaram com sucesso. Isto confirma o comportamento exercitado, sem garantir estabilidade absoluta.

G3-01/G3-02 (foco e indicador visual) foram [reauditados](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/2#issuecomment-5742879536) e incorporados no PR #4. G3-03 (cleanup de bancos temporários) e G3-04 (restauração do foco) foram [reauditados](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/2#issuecomment-5746490752) e incorporados no PR #7. As [issues #5](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/5) e [#6](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/6) foram fechadas pelo merge.

**Limites aceitos:** Edge nesta entrega, zoom nativo, teclado virtual, dispositivo real e execução independente local do PR #7 permanecem `NOT VERIFIED`. Há provas anteriores de domínio no Edge da Etapa 2; elas não substituem testes da interface atual. A Etapa 4 não deve alegar validação nessas plataformas sem novos testes. Programar verificação manual dirigida e conservar estes limites até evidência específica. O alerta de depreciação Node 20 de `actions/upload-artifact@v5` no runner foi distinguido do warning Dexie de aplicação e não bloqueia este gate.

## Próximas ações, em ordem

1. **PAUSADO até novo Gate 3:** Coding Agent — GPT-6 Astra Medium: implementar a [issue #8](https://github.com/tiagodtandrade-ops/meu-financeiro/issues/8) conforme a [especificação v1 da Etapa 4](https://github.com/tiagodtandrade-ops/meu-financeiro/blob/main/docs/specs/etapa-4-dashboard-analytics-orcamentos.md) em branch própria.
2. Coding Agent: abrir PR para `main` com números, critérios e CI/evidências, sem aprovar a própria entrega.
3. CI: executar Node, Chromium e cenários dirigidos; preservar regressões aprovadas.
4. Auditor independente — GPT-5.6 Sol Leve: auditar PR, números, cenários e limites de plataforma; registrar PASS/FAIL/NOT VERIFIED.
5. Coding Agent: corrigir achados no PR e repetir testes quando necessário.
6. Manager/Arquiteto: decidir merge, verificar CI na `main` e registrar decisão expressa do Gate 4.
7. Apenas após Gate 4: liberar Etapa 5 — Backup, Restore e Health Check.

Especificação histórica da Etapa 3: `docs/specs/etapa-3-interface.md`; governança: `AGENTS.md`, `docs/WORKFLOW.md`; roadmap: `docs/ROADMAP.md`.

**Versão publicada para avaliação:** https://tiagodtandrade-ops.github.io/meu-financeiro/?verify=b43dca0 — [deploy](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35481033701) e [CI mais recente](https://github.com/tiagodtandrade-ops/meu-financeiro/actions/runs/35481033711). A publicação não aprova Gate 3. Prioridades em paralelo: Coding Agent investiga G3-05 na issue #9 e Designer de UI/UX produz diagnóstico, direção visual e protótipo na issue #10. O Manager encaminha a direção escolhida ao Coding Agent quando os gates permitirem.
