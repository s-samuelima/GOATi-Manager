-- GOATi Manager v1.2.4: excluir chamados exclusivamente pelo admin
-- Execute APENAS esta migração uma vez no SQL Editor do projeto Supabase já existente.
-- NÃO apaga nenhum chamado existente.
begin;
grant delete on public.tickets to authenticated;
drop policy if exists tickets_delete_admin on public.tickets;
create policy tickets_delete_admin on public.tickets for delete to authenticated
 using((select private.is_admin()));
create or replace function private.audit_ticket_delete() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_log(actor_id,entity,entity_id,action,details)
  values((select auth.uid()),'tickets',old.id,'excluido',
   pg_catalog.jsonb_build_object('numero',old.number,'solicitante',old.requester_id,'status',old.status));
  return old;
end;$$;
revoke execute on function private.audit_ticket_delete() from public,anon,authenticated;
drop trigger if exists on_ticket_delete_audit on public.tickets;
create trigger on_ticket_delete_audit before delete on public.tickets
for each row execute function private.audit_ticket_delete();
commit;
