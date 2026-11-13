# Excluir chamados no GOATi Manager v1.2.4

No Supabase (uma única vez no banco **já existente**), execute **supabase/migrations/20261113_admin_delete_tickets.sql** no SQL Editor. O script apenas altera permissões e instala uma auditoria, não exclui nenhum chamado automaticamente.

Entre como administrador, abra **Chamados** e marque os chamados que deseja remover. Use **Excluir selecionados** ou abra um chamado e clique **Excluir chamado permanentemente**. Digite **EXCLUIR** para confirmar. A exclusão é irreversível; serão apagados também comentários, eventos e avaliações vinculados por ON DELETE CASCADE. Os registros mínimos de auditoria permanecem em audit_log, visíveis somente para administradores.

Funcionários e usuários de Gestão não podem excluir chamados. O servidor aplica essa regra com RLS; o menu não substitui as permissões. Em modo offline, o recurso fica bloqueado.

Se o SQL não tiver sido executado, a interface pode exibir falta de permissão. Nunca use o script schema.sql inteiro para atualizar uma instalação que já possui dados.
