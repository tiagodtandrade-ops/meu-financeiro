# Repositories

`createRepositories(database)` concentra CRUD de tabelas e fronteiras de transação.
A API de aplicação é `createFinance(database)` em services/index.js. Não use o CRUD
de repositories diretamente nas views: ele não substitui as regras dos services.
As cinco tabelas participam da mesma transação para eliminar corridas entre validação
de referências e gravação. Não há promises externas/rede dentro das transações.
