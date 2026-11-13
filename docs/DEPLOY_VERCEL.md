# Publicar GOATi Manager na Vercel

A aplicação é HTML/CSS/JavaScript estático. Não precisa executar server.mjs na Vercel. O arquivo vercel.json define npm run build e publica apenas dist/.

## 1. Importar repositório

1. Vercel → Add New → Project → Import Git Repository.
2. Escolha s-samuelima/GOATi-Manager e selecione a branch main.
3. Framework Preset: Other; Root Directory: ./. O vercel.json configura Build Command e Output Directory automaticamente.

## 2. Variáveis de ambiente (antes de clicar em Deploy)

Na página de importação, abra Environment Variables e crie:

| Nome | Valor |
| --- | --- |
| GOATI_SUPABASE_URL | https://SEU-PROJETO.supabase.co (sem /rest/v1/) |
| GOATI_SUPABASE_PUBLISHABLE_KEY | Sua chave pública sb_publishable_... |

Selecione Production; se quiser testar Preview, configure também Preview. Nunca inclua sb_secret_, service_role, senha de banco ou token pessoal. O build falha explicitamente se faltar qualquer variável, para não publicar um modo demo por engano.

A publishable key vai para o navegador e não é um segredo. Proteja os dados com as políticas RLS do Supabase. O config.js é gerado automaticamente na implantação e não está no GitHub.

## 3. Implantar e registrar o endereço HTTPS

Clique Deploy. Quando terminar, copie o endereço HTTPS que a Vercel mostrar, sem adivinhar o subdomínio.

No Supabase: Authentication → URL Configuration:
- Site URL: endereço HTTPS de produção, com barra final /.
- Redirect URLs: inclua o endereço HTTPS de produção com /** e mantenha http://localhost:4173/** para desenvolvimento.

A alteração ajuda na confirmação de e-mail e recuperação de senha. Se mudar variáveis na Vercel, faça um novo deploy para aplicá-las.

## 4. Validação obrigatória antes de convidar usuários reais

- Testar tela de login, criar conta, aprovação e recuperação de senha.
- Verificar que o endereço /config.js carrega somente a chave publishable.
- Abrir um chamado de teste e conferir em Supabase → Table Editor → tickets.
- Confirmar que um funcionário não consegue ver chamados de outro usuário.
- Conferir inventário, permissões do perfil gestão e acesso de administradores.
- Testar instalação PWA e atualização de cache após um novo deploy.

A publicação inicial é para homologação. Não use dados reais nem libere o sistema para toda a empresa antes de validar segurança (RLS), privacidade e permissões. Não há notificações push com navegador fechado nesta versão.

## Desenvolvimento local

O INICIAR_WINDOWS.bat continua igual. Para testar o build estático manualmente, defina GOATI_SUPABASE_URL e GOATI_SUPABASE_PUBLISHABLE_KEY com valores públicos de teste e execute npm run build.
