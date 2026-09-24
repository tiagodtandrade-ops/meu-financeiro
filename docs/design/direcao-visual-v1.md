# Direção visual v1 — Clareza para operar

Issue #10 · Proposta para avaliação do usuário e Manager; não aprovada. Referência de código: `57863aa7bce129a2484e78fa9b7cffd5ff694b98`. Nenhuma mudança funcional, schema, service, migration ou gate.

## Direção recomendada

Superfícies claras, azul profundo para ação, hierarquia centrada em tarefa e números, espaço moderado e poucos elementos simultâneos. O ganho esperado é localizar uma movimentação e registrar outra com menos leitura e rolagem. Modernização não exige framework, dependência ou gráficos decorativos.

Reutilizar a escala de espaço, fonte de sistema, temas, safe-area, diálogo e foco do CSS existente. Substituir a regra global de botões móveis por variantes: CTA largo, ação contextual compacta e perigo explícito. Cor não é requisito para reconhecer tipo ou erro.

Alternativa curta: manter o verde atual e aplicar exatamente a mesma hierarquia. A escolha azul/verde não bloqueia as melhorias de estrutura.

## Referências examináveis

- [Prancha mobile de 390 px](referencia-mobile.svg): desenho vetorial, não screenshot, aberto diretamente no GitHub.
- [Prancha desktop](referencia-desktop.svg): mesma família de componentes.
- [Protótipo estático navegável](prototipo/index.html): Início, Contas, Histórico, formulários, vazio, erro e conceito futuro do Dashboard. Abrir HTML junto com style.css; o GitHub exibe código, não executa HTML.

Para examinar no telefone sem publicar produção: checkout desta branch, executar `python3 -m http.server 4174 --bind 0.0.0.0` na raiz, e abrir `http://<IP-local-do-computador>:4174/docs/design/prototipo/` no telefone na mesma rede. Encerrar o servidor após avaliação. Não há dependências, rede de runtime, banco, armazenamento ou coleta. As pranchas SVG são a alternativa imediata para inspeção pelo smartphone.

O checkbox Escuro compara os temas da página atual (não persiste entre páginas). Links simulam estados fixos; entradas não são salvas, busca não consulta registros, personalização não está implementada. Formulário é referência do **conteúdo** do modal em página isolada: não simula contenção/restauração de foco do dialog de produção. Não alegar equivalência funcional.

## Tokens propostos

| Token             | Claro   | Escuro  | Uso                                                         |
| ----------------- | ------- | ------- | ----------------------------------------------------------- |
| Fundo             | #F4F6FA | #101827 | Área externa                                                |
| Superfície        | #FFFFFF | #192439 | Conteúdo/formulário                                         |
| Texto             | #17243B | #F1F5FF | Conteúdo principal                                          |
| Secundário        | #53627A | #B4C1D6 | Metadados                                                   |
| Ação              | #244CC5 | #AAC0FF | Primário/ativo                                              |
| Sobre ação        | #FFFFFF | #101827 | Texto do CTA                                                |
| Superfície ativa  | #EDF1FF | #263757 | Seleção                                                     |
| Borda de controle | #78869A | #7E8DA7 | Inputs e secundários                                        |
| Entrada           | #126C4B | #7DE0B0 | Receita com sinal e nome                                    |
| Saída/erro        | #AD263C | #FFACB7 | Despesa/erro com texto                                      |
| Foco              | #A65B00 | #A65B00 | Contorno de 3 px + offset; rever contraste em cada contexto |

Fonte: system-ui, sem download. Corpo/input 16 px, secundário 14 px, navegação móvel 12 px, títulos 28/32 px, destaque 34/40 px. Valores com `font-variant-numeric: tabular-nums`; não abreviar saldos exatos. Espaço 4/8/12/16/20/24/32/40 px. Raio 8 em inputs, 10 em botões, 16 em cartões. Alvo preferido 48 px, mínimo 44 px. Bordas decorativas podem ser suaves; bordas que identificam controles precisam de contraste.

## Componentes e estados

| Componente        | Regra de apresentação e comportamento de produção                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navegação         | Cinco destinos; selecionado por fundo + peso + aria-current. Mobile fixo com safe-area; desktop lateral. Rótulos propostos Início/Contas/Histórico/Planos/Ajustes precisam avaliação; preservar H1 canônico |
| Cabeçalho         | Título, contexto curto e uma ação primária. Mobile empilha; desktop alinha                                                                                                                                  |
| Conta             | Nome, tipo, saldo até a data, estado arquivado quando aplicável; ações em disclosure com nome da conta, sem esconder valor                                                                                  |
| Lançamento        | Descrição, data, conta/categoria, tipo e valor. Transferência neutra, origem → destino, único item. Detalhe abre edição; ação deve ser elemento acessível, não clique em div                                |
| Filtros           | Busca rápida e painel avançado com período/tipo/conta/categoria; indicador de quantidade aplicada; Aplicar explícito; Limpar acessível. Manter filtros preenchidos após erro                                |
| Formulário        | Tipo primeiro, valor/descrição proeminentes, data/conta/categoria; observação opcional. Modal com dialog nativo no desktop; mobile com altura limitada e rolagem, ações alcançáveis com teclado virtual     |
| Sem pré-requisito | Criar conta quando não houver ativa; transferência exige duas. Não perder rascunho se criação contextual for autorizada; alternativa menor é orientar antes de abrir o formulário                           |
| Carregando        | Status textual, sem valores zero que pareçam reais; evitar deslocamento excessivo; não bloquear navegação                                                                                                   |
| Erro              | Mensagem útil, dados retidos, resumo com foco, campo relacionado e detalhes técnicos recolhidos; retry sem duplicação                                                                                       |
| Sucesso           | Texto específico (“Despesa salva”), anúncio educado e retorno do foco; não depender de toast breve                                                                                                          |
| Vazio             | Distinguir nenhum registro de nenhum resultado filtrado; CTA contextual                                                                                                                                     |
| Exclusão          | Confirmação com nome; aviso irreversível; Cancelar em destaque seguro, Excluir com estilo de perigo. Não incluir Desfazer sem suporte                                                                       |

Responsive: até 760 px, coluna única; acima, lateral 220 px e conteúdo com largura limitada. Cartões/valores devem caber em 360 e 390; em 320 px ou texto 200%, empilhar valor quando necessário. Não truncar saldo nem esconder significado para manter duas colunas.

## Etapa 3 versus Etapa 4

`prototipo/index.html` representa o início possível na Etapa 3: orientação e atalhos, sem indicadores fictícios misturados à produção. `dashboard-futuro.html` é conceito separado e rotulado da Etapa 4: números fictícios 5.000,00 de receita, 180,00 de despesa, transferência interna 500,00, saldo inicial zero; contas 4.320,00 e 500,00, total 4.820,00. Essa coerência aritmética é ilustrativa, não implementação de analytics. Orçamentos permanecem futuros.

## Plano de PRs pequenos e handoff

**Destinatário: Coding Agent — GPT-6 Astra Medium, somente após issue liberada pelo Manager.** Designer revisa fidelidade; Auditor independente — GPT-5.6 Sol Leve — verifica regressões, sem substituir decisão de produto. Manager decide gate.

| Ordem | PR proposto                    | Dependência                                 | Aceite específico                                                                                       |
| ----- | ------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1     | Microcopy e estados da Etapa 3 | Aprovação do Manager                        | UX03/04/08/11/12; início orienta criar conta; funções futuras identificadas; categorias localizáveis    |
| 2     | Tokens, números e navegação    | Direção escolhida                           | UX09/10; ambos temas, todos destinos, valores grandes/negativos e foco legíveis                         |
| 3     | Listas e filtros               | 1–2                                         | UX01/02; menos rolagem; mesmas combinações AND, paginação e transferência única; ações contextualizadas |
| 4     | Formulários, erro e perigo     | 1–3                                         | UX05/06/07; manter foco, rascunho e prevenção de duplicação; personalização preserva legados            |
| 5     | Dashboard e orçamentos reais   | Novo Gate 3 expresso + liberação #8/Etapa 4 | Implementar apenas especificação funcional vigente; revisar conceito com valores e contratos reais      |

Cada PR de comportamento: lint, format:check, verify:static, testes Node e smoke segundo AGENTS.md, CI do commit e evidência visual sanitizada. Comparar antes/depois no mesmo dataset e viewport. Não incluir PR5 no polimento. Não aprovar próprio design nem alterar PROJECT_STATUS.

## Critérios transversais de aceite

1. Cinco rotas × 360/390/desktop × claro/escuro com prints sem dados reais; nenhum controle encoberto, corte de valor ou scroll horizontal de página.
2. Texto normal ≥4,5:1; grande ≥3:1; controles/estados/foco ≥3:1 contra adjacente. Medir todas as combinações efetivamente usadas, incluindo hover/erro/ativo.
3. Uso só por teclado, ordem lógica, foco perceptível, modal contido, Escape/Cancelar fora da escrita e retorno ao acionador/fallback preservados; leitura de nomes e status com tecnologia assistiva.
4. Zoom de texto 200%, reflow 320 px e teclado virtual no aparelho; safe-area não cobre Salvar. Anotar plataforma real e limites.
5. Valores pt-BR e centavos exatos; transferência única; arquivados legíveis; falha preserva campos e não duplica; exclusão protegida e sem promessa de undo.
6. Sem CDN, analytics, persistência nova, services/schema/migrations alterados por polimento. Protótipo não entra no build da aplicação.

## Decisões para usuário/Manager

- Azul proposto ou verde atual com a nova estrutura?
- Nomes curtos na barra móvel são claros? “Planos” pode ser amplo demais; alternativa conservadora: “Orçamentos”.
- Lista com ações recolhidas facilita o uso no seu telefone? Avaliar acesso a Editar sem tornar destrutivas acidentais.
- Aprovar orientação inicial da Etapa 3 e só depois avaliar conceito de Dashboard futuro.

Aprovação visual e matriz de navegador ainda pendentes; esta versão é examinável e implementável como especificação, mas não pode ser descrita como revisão visual completa da aplicação publicada.
