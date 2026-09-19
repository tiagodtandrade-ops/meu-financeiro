# Especificação da Etapa 3 — Interface Operacional

Este documento registra os critérios originalmente aprovados para a implementação 0.3.0. A execução e a auditoria correntes usam a branch `main`, a issue ativa e `docs/PROJECT_STATUS.md`.

**Destinatário:** Coding Agent  
**Modelo recomendado:** GPT-6 Astra Medium  
**Projeto:** Meu Financeiro  
**Etapa:** 3 — Interface Operacional  
**Gate vigente:** Etapa 2 aprovada; Gate 3 aberto

## 1. Contexto autorizado

A implementação original partiu da baseline aprovada da versão 0.2.0, cujo pacote histórico tinha SHA-256:

`e5ec1207dc83d12dbae81cdc6f544055f8756b7643340a0bcc1526e27a061ab5`

A Auditoria 04 aprovou a Etapa 2 sem defeitos confirmados. A baseline possui:

- arquitetura local-first e estática;
- Dexie 4.4.6 distribuído localmente;
- schema V2 e migration V1 → V2 aprovados;
- camadas de database, repositories, services e domínio;
- contas, categorias, lançamentos, transferências, orçamentos e settings;
- valores monetários em centavos inteiros;
- datas civis `YYYY-MM-DD`;
- transferências atômicas;
- saldos derivados;
- 65 testes Node aprovados;
- 45 testes Playwright aprovados no Microsoft Edge, sendo 19 da fundação e 26 do domínio/IndexedDB.

O banco e o motor financeiro aprovados são a única fonte de verdade. Não duplique regras de domínio nas views e não contorne services ou repositories.

## 2. Objetivo

Transformar a fundação visual existente em uma interface operacional completa para:

- contas;
- categorias;
- receitas;
- despesas;
- transferências;
- listagem, busca e filtros de lançamentos.

Esta etapa integra a interface ao motor aprovado. Não implemente ainda o dashboard analítico completo, a operação visual de orçamentos, backup/restore, health check, PWA definitiva ou qualquer item da Etapa 4 em diante.

## 3. Restrições não negociáveis

- Aplicação estática, sem backend ou servidor de aplicação.
- HTML5, CSS moderno e JavaScript ES Modules, sem framework.
- IndexedDB via Dexie local, sem CDN.
- Interface em pt-BR e valores em BRL.
- Nenhum dado financeiro em `localStorage`.
- Nenhuma telemetria, analytics, tracking ou chamada remota.
- Nenhuma regra financeira crítica dentro das views.
- Nenhuma atualização otimista que deixe a tela divergente do banco após falha.
- Nenhum reset de dados ou alteração destrutiva de migration.
- Preserve o schema V2. Não crie V3 apenas para atender necessidades visuais; qualquer mudança de schema realmente indispensável deve ser justificada, migrada e testada sem perda.
- Preserve integralmente as regressões aprovadas das Etapas 1 e 2.
- Não exiba fixtures ou dados fictícios como se fossem dados do usuário.

## 4. Integração e inicialização

- Crie uma única composição da API financeira por sessão usando a infraestrutura existente.
- Inicialize o catálogo/settings pelo fluxo aprovado e idempotente.
- Faça as views consumirem services públicos, nunca tabelas Dexie diretamente.
- Trate inicialização assíncrona com estados de loading, sucesso e falha recuperável.
- Em indisponibilidade do IndexedDB, mantenha navegação e shell funcionais, bloqueie escritas com mensagem clara e ofereça nova tentativa.
- Recarregar a página deve preservar dados e reconstruir a interface a partir do IndexedDB.
- Evite listeners duplicados, instâncias repetidas do banco e renderizações concorrentes obsoletas.

## 5. Contas

Na página **Contas**, implemente:

- listagem de contas ativas e opção clara para visualizar arquivadas;
- criação e edição;
- arquivamento e reativação quando permitido pelo domínio;
- exclusão somente quando o service considerar seguro;
- confirmação antes de exclusão;
- nome, tipo, saldo inicial, data do saldo inicial e identificação visual previstos no domínio;
- saldo atual derivado do motor financeiro;
- estado ativa/arquivada comunicado por texto, não apenas por cor;
- tratamento claro de conta sem movimentações e conta com histórico;
- bloqueio de duplo envio e de ações concorrentes sobre o mesmo registro.

Contas arquivadas não devem aparecer por padrão em novas operações, mas o histórico e os filtros existentes precisam continuar legíveis.

## 6. Categorias

Disponibilize o gerenciamento de categorias em uma seção coerente da interface existente, preferencialmente em **Configurações**, sem criar uma rota principal desnecessária.

Implemente:

- listagem separando receita e despesa;
- criação e edição;
- arquivamento e reativação quando permitido;
- exclusão apenas quando segura;
- indicação clara de tipo, nome e estado;
- preservação das categorias iniciais personalizadas pelo usuário;
- mensagens específicas para categoria referenciada por lançamento ou orçamento;
- remoção de categorias arquivadas das opções padrão para novas operações, preservando registros históricos.

## 7. Lançamentos

Na página **Lançamentos** e nos CTAs existentes, implemente criação, edição e exclusão de:

- receita;
- despesa;
- transferência.

Campos aplicáveis:

- tipo;
- data civil;
- descrição;
- valor;
- conta;
- categoria para receita/despesa;
- conta de origem e destino para transferência;
- observações.

Regras de interação:

- entrada monetária adequada a pt-BR, convertida de forma segura para centavos inteiros;
- nunca persistir dinheiro a partir de cálculo impreciso com ponto flutuante;
- validação por campo sem impedir digitação intermediária legítima;
- erros associados aos campos e resumo quando houver múltiplos erros;
- transferências exigem contas distintas;
- edição deve preservar IDs, timestamps e integridade segundo os services;
- confirmação explícita antes de exclusão;
- botão de salvar desativado durante persistência;
- proteção contra clique duplo e submissão repetida;
- somente fechar o formulário após confirmação real de sucesso;
- em falha, manter os dados preenchidos quando seguro e apresentar ação de nova tentativa;
- mensagens de domínio devem ser traduzidas para linguagem útil sem esconder o código/causa durante diagnóstico.

Use dialog acessível ou página dedicada. Se utilizar modal, implemente foco inicial, contenção de foco, Escape quando seguro e restauração do foco ao elemento de origem.

## 8. Lista, busca e filtros

Implemente listagem operacional de lançamentos com:

- ordenação determinística já prevista pelo motor;
- busca textual sem diferenciar caixa ou acentos;
- data inicial e final;
- tipo;
- conta;
- categoria;
- combinação dos filtros com AND;
- ação para limpar filtros;
- estado vazio geral;
- estado sem resultados para os filtros atuais;
- carregamento progressivo ou paginação simples para evitar renderização ilimitada.

Cada item deve comunicar:

- descrição;
- data;
- categoria quando aplicável;
- conta ou par origem/destino;
- tipo;
- valor formatado em BRL;
- ações disponíveis.

Receitas, despesas e transferências devem ser distinguíveis por texto/ícone e nome acessível, nunca apenas por cor. As duas pernas internas de uma transferência não podem aparecer como lançamentos independentes confusos; apresente a transferência como uma operação coerente para o usuário.

## 9. Estados e feedback

Implemente de forma consistente:

- loading inicial e por operação;
- vazio;
- sem resultados;
- sucesso;
- erro de validação;
- erro recuperável de persistência;
- indisponibilidade do IndexedDB;
- item arquivado;
- ação sem permissão pelas regras de integridade.

Toasts podem complementar, mas não podem ser a única forma de comunicar erro importante. Use regiões anunciáveis para feedback assíncrono e mantenha mensagens essenciais próximas do contexto afetado.

## 10. Responsividade e acabamento

Preserve o design system e o shell aprovados. Teste pelo menos:

- 360 × 640;
- 390 × 844;
- 768 × 1024;
- 1024 × 768;
- 1440 × 900.

Em telas pequenas:

- listas/tabelas devem adaptar-se sem overflow horizontal obrigatório;
- ações não podem desaparecer;
- campos e botões devem permanecer utilizáveis com teclado virtual;
- dialogs devem respeitar altura disponível e scroll interno;
- alvos interativos devem manter tamanho adequado;
- navegação e foco não podem ficar encobertos.

Respeite `prefers-reduced-motion` e os dois temas existentes.

## 11. Acessibilidade

- Fluxos completos utilizáveis por teclado.
- Foco visível e ordem de tabulação lógica.
- Labels explícitas e nomes acessíveis.
- Erros associados por campo.
- Headings e landmarks coerentes.
- Botões com `type` correto.
- Controles nativos preferidos a ARIA customizada.
- Dialog, quando usado, com nome, foco e fechamento previsíveis.
- Zoom de 200% sem perda de conteúdo ou operação.
- Contraste preservado nos dois temas.
- Sinal e estado não dependentes somente de cor.

## 12. Segurança e privacidade

- Renderize descrição, observação, nomes de conta e categoria com APIs seguras de DOM.
- Não use `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval` ou construção equivalente com conteúdo do usuário.
- Teste caracteres especiais, HTML, aspas, acentos e emoji.
- Não registre dados financeiros no console.
- Não inclua dados reais, identificadores pessoais, caminhos corporativos ou credenciais nas fixtures e evidências.
- Requests de runtime devem permanecer restritos ao servidor local da aplicação.

## 13. Testes obrigatórios

Preserve os 65 testes Node e os 45 testes de navegador existentes. Adicione testes proporcionais para, no mínimo:

- criar, editar, arquivar/reativar e excluir conta quando seguro;
- criar, editar, arquivar/reativar e excluir categoria quando seguro;
- criar, editar e excluir receita e despesa;
- criar, editar e excluir transferência como uma única operação visual;
- impedir origem e destino iguais;
- moeda pt-BR e centavos exatos;
- datas e inputs inválidos;
- filtros combinados e limpar filtros;
- estado vazio e sem resultados;
- conta/categoria arquivada;
- confirmação de exclusão;
- clique duplo em salvar;
- falha/rollback do banco sem divergência visual;
- reload com persistência;
- conteúdo malicioso tratado como texto;
- navegação por teclado e foco em dialogs;
- indisponibilidade do IndexedDB;
- responsividade crítica e ausência de overflow;
- regressão das cinco rotas, temas, reduced-motion, console e requests externos.

Os testes de interface devem usar IndexedDB nativo no Playwright e bancos isolados. Não substitua toda a prova de interface por `fake-indexeddb`.

Execute e registre:

```sh
npm ci
npm run lint
npm run format:check
npm run verify:static
npm test
npm run smoke
```

Se o navegador Chromium não puder ser instalado no ambiente do Coding Agent, não presuma aprovação. Execute tudo que for possível, preserve a configuração `smoke:edge`, registre o impedimento e entregue os testes para validação local complementar.

## 14. Critérios de aceite

A entrega estará pronta para auditoria quando:

- todos os fluxos operacionais definidos acima estiverem funcionais;
- UI consumir somente a API aprovada da Etapa 2;
- nenhuma regressão de banco, domínio ou fundação existir;
- dados sobreviverem a reload;
- falhas não produzirem estado visual falso;
- acessibilidade e responsividade críticas estiverem cobertas;
- testes automatizados e evidências forem reproduzíveis;
- nenhum item da Etapa 4 ou posterior tiver sido antecipado.

## 15. Entregáveis e evidências no GitHub

- Código, testes, documentação e lockfile em branch e Pull Request ligados à issue vigente; mantenha vendor local e não inclua `node_modules`, caches, dados pessoais ou evidências geradas no Git.
- Relatório no PR: commit de base, arquivos alterados, fluxos, decisões de UX, integração com services, testes novos/preservados, comandos/resultados, limitações `NOT VERIFIED` e riscos para a etapa seguinte.
- Logs, JSON do Playwright e traces/screenshots sem identificadores pessoais disponíveis nos artefatos da CI ligados ao PR. Se uma prova essencial expirar, repita o workflow e registre a nova URL.

## 16. Encerramento e gate

Não inicie a Etapa 4. Não aprove a própria entrega.

Ao finalizar, abra o PR e solicite auditoria independente. O Gate 3 permanecerá pendente até decisão expressa do Manager/Arquiteto.
