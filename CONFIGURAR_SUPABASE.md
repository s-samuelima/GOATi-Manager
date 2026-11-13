# Configuração do Supabase (uso local)

A configuração de cada instalação fica em `config.js`, que **não é versionado**. O repositório publica apenas `config.example.js`.

1. Copie `config.example.js` para `config.js` na raiz. No PowerShell: `Copy-Item config.example.js config.js`.
2. Insira a URL raiz do seu projeto Supabase (`https://SEU-ID.supabase.co`) e somente uma `Publishable key` (`sb_publishable_...`).
3. Não insira senha do banco, `sb_secret_...`, chave `service_role` ou tokens privados.
4. Execute `npm start` e abra `http://localhost:4173`.
5. Para usar um banco novo, veja `supabase/schema.sql`. **Não execute migrações cegamente** em um projeto existente.
6. Confira no banco se os chamados e perfis são gravados de fato. Revise as políticas RLS antes de liberar usuários de produção.

A versão `GOATi_Manager_DEMO.html` é um exemplo autônomo e **não utiliza** seu projeto Supabase.

Para publicar uma aplicação acessível pela internet, configure as variáveis de frontend no provedor de hospedagem, hospede os arquivos estáticos, adicione a URL HTTPS em `Authentication > URL Configuration` no Supabase e teste RLS, autenticação e CORS.
