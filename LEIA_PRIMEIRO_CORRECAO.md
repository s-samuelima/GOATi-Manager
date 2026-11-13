# Correção v1.2.1: formulário de chamados

Corrigida a referência a variável inexistente (`e is not defined`) no tratamento de cliques do modal. O clique dentro do formulário não deve gerar alerta ou fechar a janela.

Para testar: `npm test`, `npm start` e acesse a tela de Novo chamado. Confirme a gravação real em `public.tickets` pelo Supabase.

O `config.js` é local e ignorado pelo Git. Ao usar a versão deste repositório, copie `config.example.js` para `config.js` e preencha apenas URL/chave publishable.
