# Trabalho e decisões no GitHub

## Onde cada informação fica

| Informação | Lugar canônico |
|---|---|
| Código, testes, especificações e estado dos gates | Branch `main`, `AGENTS.md`, `docs/` |
| Pedido concreto e responsável | GitHub Issue com links para arquivos e critérios |
| Implementação e revisão | Branch e Pull Request ligados à issue |
| Resultados automáticos, logs, trace e screenshots | GitHub Actions do commit/PR |
| Parecer independente | Comentário do Auditor na issue/PR ou arquivo `docs/audits/` referenciado no PR |
| Decisão de gate | Alteração de `docs/PROJECT_STATUS.md` com referência ao parecer, PR e run |

Não é necessário gerar, enviar ou reapresentar pacotes ZIP para o ciclo comum. Artefatos de CI têm retenção limitada; registre na issue as conclusões, commits e links necessários. Se uma evidência bruta precisar ser guardada por mais tempo, o Manager definirá onde arquivá-la, sem incluir dados pessoais no repositório público.

## Fluxo

1. **Manager/Arquiteto** escolhe uma etapa autorizada e abre uma issue com destinatário, modelo, critérios, escopo e dependências. As instruções operacionais ficam em Markdown neste repositório.
2. **Designer de UI/UX** pode auditar a experiência publicada em paralelo às correções, pela issue de design. Entrega diagnóstico, direção visual, protótipo e critérios em PR documental; o usuário e o Manager avaliam a direção. Mudança em produção depende de issue específica liberada, sem antecipar etapa bloqueada.
3. **Coding Agent** implementa a issue funcional/visual liberada em branch própria, testa e abre PR para `main`. Não envia ZIP e não altera outra etapa sem comando.
4. **CI** executa validação de Node e navegador para PRs e commits na `main`. Vermelho é evidência de falha, não aprovação tácita. Falta de navegador ou de acesso é `NOT VERIFIED`, não `PASS` nem defeito automático.
5. **Auditor independente** examina o diff, os critérios, o código e os artefatos; registra `PASS`, `FAIL` e `NOT VERIFIED`, achados com severidade e recomendação. Não corrige a própria auditoria.
6. **Manager/Arquiteto** decide correção, merge e gate explicitamente. Merge de manutenção documental não equivale a aprovação funcional. Correções relevantes voltam ao Coding Agent e ao Auditor.
7. **Manager** atualiza `PROJECT_STATUS.md`, fecha as issues concluídas e só libera a próxima etapa por nova issue e brief versionado.

O Designer revisa a fidelidade visual do PR implementado, sem substituir a auditoria independente. O usuário avalia a usabilidade no celular e participa da escolha da direção visual. Enquanto Gate 3 estiver reaberto, diagnóstico e protótipo de design podem avançar, mas implementação funcional da Etapa 4 segue pausada.

O usuário acompanha a decisão de negócio. Nunca publique credenciais, dados de banco pessoais, capturas com contas reais ou informações privadas neste repositório público. Não trate histórico ou prompts preliminares como nova autorização.

## Critérios mínimos para Gate 3

- Requisitos de `specs/etapa-3-interface.md` cumpridos e domínio aprovado preservado.
- Todos os testes aplicáveis aprovados, ou desvio precisamente fundamentado e aceito pelo Auditor e Manager.
- A falha de foco documentada em `audits/gate-3.md` resolvida ou demonstrada como asserção inadequada com verificação alternativa confiável.
- Parecer independente conclusivo e decisão expressa no `PROJECT_STATUS.md`.
