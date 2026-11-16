# GOATi Manager v1.3.3 — Ativar cadastro direto e avaliação

## Migração necessária

Faça backup do projeto antes de alterar permissões. No Supabase, abra **SQL Editor** e execute somente `supabase/migrations/20261116_signup_auto_access_delete_users.sql`. Esse script **não exclui contas ou chamados**. Ele cria perfis `funcionario/ativo` automaticamente para **novos cadastros** e disponibiliza uma operação segura de exclusão. Cadastros antigos em situação pendente não mudam automaticamente.

Não execute novamente o `supabase/schema.sql` inteiro em um projeto já utilizado.

## Confirmação de e-mail

O cadastro não exige aprovação administrativa após a migração. Para fazer login imediatamente, entretanto, é necessário que **Confirm email** esteja desativado em **Authentication → Providers → Email** no Supabase. Caso esteja ativo, o usuário precisa confirmar o e-mail antes de acessar. Esses são controles independentes.

**Aviso de segurança:** cadastro público com liberação imediata significa que qualquer pessoa que obtenha o link poderá criar uma conta com perfil de funcionário. Antes de disponibilizar a toda a organização, considere uma lista permitida de domínios corporativos ou outro controle de identidade. O aplicativo nunca concede perfil admin automaticamente.

## Exclusão e bloqueio

Como administrador, abra **Usuários → Gerenciar conta**. **Bloqueado** corta o acesso aos dados e pode ser revertido. Para exclusão definitiva de uma conta sem histórico, clique **Excluir conta do colaborador** e confirme digitando `EXCLUIR`. O Supabase apaga a conta de autenticação e o perfil, registrando auditoria. Se houver chamados, mensagens, avaliações ou tempo de atendimento associados, o servidor recusa a exclusão para preservar registros: bloqueie a conta. Não é permitido excluir a própria conta nem outras contas administrativas por essa opção.

## Avaliação após finalização

Quando o administrador encerra o atendimento pelo cronômetro ou define o status **Resolvido**, o funcionário que estiver com o GOATi Manager aberto e online recebe a avaliação automaticamente após a verificação periódica (~6 segundos), sem abrir novamente o chamado. Se estiver em outra janela modal, o aviso será exibido ao fechá-la. Fora do aplicativo ou sem conexão, a solicitação aparece quando o usuário retornar.

## Testes recomendados

1. Criar conta nova: conferir `status=ativo` e a opção **Fazer login**.
2. Testar cadastro com confirmação de e-mail ativa e desativada.
3. Bloquear e reativar conta teste; conferir que sessão aberta perde acesso aos dados.
4. Criar chamado como funcionário e finalizar como admin; observar a janela de estrelas na sessão do funcionário.
5. Excluir uma conta de teste sem histórico; confirmar que conta com histórico é recusada.
6. Validar RLS para funcionário, gestão e administrador antes de utilizar em produção.
