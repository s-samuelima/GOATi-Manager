# GOATi Manager v1.3.0 — Cronômetro dos atendimentos

## Atualização obrigatória do banco
No Supabase, entre em **SQL Editor → New query** e execute somente o arquivo `supabase/migrations/20261113_ticket_time_tracking.sql`. O script cria a tabela de sessões, as regras de segurança e a função RPC. **Não exclui nem modifica chamados existentes na instalação.**

O script anterior `schema.sql` não deve ser reaplicado em um banco com dados.

## Utilização
1. Entre como administrador no GOATi Manager.
2. Abra **Chamados** e clique em qualquer lugar da linha do chamado.
3. Clique em **Iniciar atendimento**; o cronômetro começa e o chamado passa a Em andamento.
4. Use **Pausar** para interromper; **Retomar** para iniciar outra sessão.
5. Use **Finalizar atendimento** para encerrar a sessão e marcar o chamado como Resolvido.

A duração é calculada pelo intervalo entre início e fim gravados no Supabase. Fechar o navegador não pausa a contagem. Cada técnico só pode ter um atendimento em execução por vez.

Os detalhes do chamado mostram a duração e as sessões. O relatório PDF de chamados inclui duração por chamado e tempo total do período. A nota dada pelo solicitante aparece em **Avaliações** e, para administradores, nos detalhes do chamado.

## Segurança e limitações
- O registro de tempo é uma ação autenticada, restrita a administrador pela RPC.
- O servidor controla o horário; não aceite a contagem do navegador como fonte autoritativa.
- O modo demonstração é armazenado somente no dispositivo.
- Se a migração ainda não foi executada, o aplicativo segue funcionando, mas avisa que o recurso precisa ser ativado.
- As alterações devem ser testadas com usuários reais antes de considerar o sistema pronto para toda a empresa.
