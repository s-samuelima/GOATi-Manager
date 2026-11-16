# GOATi Manager 🐐

**Help Desk, inventário de TI, Central de Ajuda e relatórios PDF.** Projeto independente de portfólio em JavaScript, com visual grafite/vermelho, PWA e integração opcional com Supabase.

![Identidade visual GOATi](assets/goati-mark.png)

## Recursos

- Abertura, acompanhamento, comentários e gestão de chamados de TI.
- Perfis de funcionário, administração TI e gestão (quando conectado ao Supabase).
- Inventário de equipamentos, movimentações, manutenções e importação CSV.
- Central de Ajuda com pesquisa, categorias e mascote de tutoriais.
- Diário de atividades, avaliações e relatórios PDF.
- Modo demonstração local, PWA, tema claro/escuro e recursos de uso offline.

**Versão:** 1.3.0 — suporte à criação de conta e recuperação de senha após falha de credenciais no login, preservando o e-mail.

> **Estado do projeto:** MVP em desenvolvimento. Ainda exige testes integrados de segurança (RLS), fluxos com múltiplos usuários e sincronização offline antes de uso em produção. Notificações com navegador fechado ainda não foram implementadas.

## Executar

Requer **Node.js 20 ou superior**.

```powershell
# Na pasta do projeto:
Copy-Item config.example.js config.js
npm test
npm start
```

Acesse `http://localhost:4173`. O servidor local está configurado apenas para o próprio computador.

No Windows, você também pode executar `INICIAR_WINDOWS.bat` após criar `config.js`.

Sem configurar Supabase, o aplicativo roda em **modo demonstração local**, com dados fictícios. Também é possível abrir `GOATi_Manager_DEMO.html` diretamente para demonstrar a interface; esse HTML não se conecta ao banco real.

## Supabase

A integração utiliza os arquivos `src/api.js` e `supabase/schema.sql`.

1. Crie um projeto Supabase e aplique o esquema SQL em um **banco de testes vazio**, depois de revisar o script.
2. Configure `Authentication > URL Configuration` com a URL local e, futuramente, o domínio HTTPS da aplicação.
3. Abra `config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` usando a **publishable key**.
4. Crie um usuário, confirme o e-mail e configure a autorização de administrador no seu ambiente de testes.
5. Verifique as políticas de segurança, as permissões por perfil e a gravação dos chamados no banco.

Detalhes: [Configurar Supabase](CONFIGURAR_SUPABASE.md) e [Validação antes da produção](docs/VALIDACAO_ANTES_DA_PRODUCAO.md).

**Não publique** `config.js` com dados pessoais do seu ambiente, segredos, banco exportado nem arquivos de usuários. Ele é ignorado por `.gitignore`. Mesmo uma chave publishable exige RLS corretamente configurada.

## Testes

```powershell
npm test
npm run build:demo
```

O script `build:demo` regenera a demonstração autônoma sem embutir credenciais Supabase.

## Publicação no GitHub

Veja [docs/PUBLICAR_NO_GITHUB.md](docs/PUBLICAR_NO_GITHUB.md) para o passo a passo. Publicar o **repositório de código** é diferente de **hospedar a aplicação**.

## Estrutura

```text
GOATi-Manager/
├── assets/            # Logo e mascote
├── src/               # Interface, API, dados, relatórios e estilos
├── supabase/          # Estrutura do banco e políticas
├── tests/             # Testes automatizados
├── docs/              # Tutoriais, importação e validação
├── scripts/           # Gerador da demonstração
├── config.example.js  # Modelo público de configuração
├── index.html
├── sw.js
├── server.mjs
└── package.json
```

Código e identidade visual do projeto GOATi Manager. A licença de uso público ainda não foi definida.

## Publicação na Vercel

O `vercel.json` gera `dist/` com `npm run build` e configuração pública Supabase via variáveis de ambiente; o arquivo `config.js` local continua ignorado pelo Git. **Veja [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).** Não coloque secret keys no projeto web.

## Excluir chamados de teste

Admin pode selecionar e excluir chamados com confirmação. É necessário aplicar [migração SQL no Supabase](docs/EXCLUIR_CHAMADOS.md) para habilitar a operação.

## Controle de tempo por chamado

O administrador pode iniciar, pausar, retomar e finalizar o tempo gasto em cada atendimento, salvo no Supabase. O total aparece nos detalhes, na lista e no relatório PDF. **Execute a migração** `supabase/migrations/20261113_ticket_time_tracking.sql` no banco existente (não reaplique o schema.sql inteiro). Veja `docs/CONTROLE_TEMPO.md`. O funcionário pode avaliar o chamado resolvido na seção Avaliações.

### Convite para avaliar chamados (v1.3.1)

Se um usuário funcionário entrar e tiver chamado resolvido ainda sem avaliação, o GOATi Manager abre automaticamente o formulário de avaliação. Se fechar, a tela inicial mantém um lembrete com acesso direto à avaliação. O formulário aceita nota de 1 a 5 estrelas, confirmação da solução e comentário opcional. Não exige nova migração SQL além das migrações anteriores do sistema.

### Alertas de cadastros pendentes (v1.3.2)

O administrador vê o contador de pendências em **Usuários**, no topo do aplicativo e em um aviso com acesso direto. O sistema consulta novos cadastros a cada ~23 segundos **somente enquanto o GOATi Manager estiver aberto e online**. A mensagem interna oferece **Analisar cadastro** e a notificação do sistema operacional (caso habilitada no navegador) também leva ao painel de aprovação. A simples criação da conta não aprova o usuário. Não é preciso SQL adicional para este recurso.

### Cadastro automático e avaliação em tempo quase real (v1.3.3)

A primeira visita abre **Criar conta**; quem já tem cadastro usa **Fazer login**. A migração SQL habilita novos perfis como **funcionario/ativo** sem aprovação. Administradores continuam podendo bloquear e reativar. Se o Supabase exigir confirmação de e-mail, o funcionário precisará confirmá-lo antes de entrar. Veja [o guia de atualização](docs/CADASTRO_AUTOMATICO_E_AVALIACAO.md).

O administrador pode excluir permanentemente contas **sem histórico** com confirmação EXCLUIR; contas com chamados, mensagens, avaliações ou tempo de atendimento associados devem ser bloqueadas, preservando histórico. Com o app aberto, a avaliação aparece automaticamente após resolução em verificações a cada ~6 segundos; não exige reabrir o chamado.
