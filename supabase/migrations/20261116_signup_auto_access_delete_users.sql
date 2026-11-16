-- GOATi Manager v1.3.3: cadastro automatico e exclusao segura de contas
-- APLICAR no SQL Editor do Supabase existente. Nao exclui usuarios/chamados durante a migracao.
-- A nova regra vale para novos cadastros; cadastros antigos pendentes nao sao alterados.
begin;

create or replace function private.create_profile_for_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,email,sector,role,status)
 values(new.id,
  coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Novo colaborador'),
  coalesce(new.email,''),
  coalesce(nullif(new.raw_user_meta_data->>'sector',''),'Não informado'),
  'funcionario','ativo')
 on conflict (id) do nothing;
 return new;
end;$$;
revoke execute on function private.create_profile_for_user() from public,anon,authenticated;

-- Conta removida somente por admin ativo e sem perda de historico de atendimentos.
create or replace function public.admin_delete_user(target_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 item public.profiles%rowtype;
 linked_time boolean := false;
begin
 if (select auth.uid()) is null or not coalesce((select private.is_admin()),false) then
  raise exception 'Somente administradores ativos podem excluir usuarios';
 end if;
 if target_user=(select auth.uid()) then
  raise exception 'Nao e permitido excluir sua propria conta';
 end if;
 select * into item from public.profiles where id=target_user for update;
 if not found then raise exception 'Usuario nao encontrado'; end if;
 if item.role='admin' then raise exception 'Nao e permitido excluir contas de administradores'; end if;
 if exists(select 1 from public.tickets where requester_id=target_user)
   or exists(select 1 from public.ticket_messages where author_id=target_user)
   or exists(select 1 from public.reviews where author_id=target_user) then
  raise exception 'Este usuario possui historico de atendimento. Bloqueie a conta para preservar os registros';
 end if;
 if pg_catalog.to_regclass('public.ticket_time_entries') is not null then
  execute 'select exists(select 1 from public.ticket_time_entries where technician_id=$1)'
   into linked_time using target_user;
  if linked_time then
   raise exception 'Este usuario tem tempo de atendimento registrado. Bloqueie a conta para preservar o historico';
  end if;
 end if;
 delete from auth.users where id=target_user;
 if not found then raise exception 'Conta de autenticacao nao encontrada'; end if;
 insert into public.audit_log(actor_id,entity,entity_id,action,details)
 values((select auth.uid()),'profiles',target_user,'usuario_excluido',
   pg_catalog.jsonb_build_object('email',item.email,'nome',item.full_name));
 return pg_catalog.jsonb_build_object('ok',true,'id',target_user);
end;$$;
revoke all on function public.admin_delete_user(uuid) from public,anon,authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

commit;
