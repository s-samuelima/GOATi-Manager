-- GOATi Manager v1.3.0: medir tempo de atendimento (não exclui dados existentes)
-- Execute UMA VEZ no SQL Editor do Supabase já configurado.
begin;

create table if not exists public.ticket_time_entries (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 technician_id uuid not null references public.profiles(id),
 started_at timestamptz not null default pg_catalog.now(),
 ended_at timestamptz,
 created_at timestamptz not null default pg_catalog.now(),
 constraint ticket_time_not_negative check(ended_at is null or ended_at>=started_at)
);
create index if not exists ticket_time_by_ticket on public.ticket_time_entries(ticket_id,started_at);
create unique index if not exists ticket_time_one_active_per_tech on public.ticket_time_entries(technician_id) where ended_at is null;
alter table public.ticket_time_entries enable row level security;
revoke all on public.ticket_time_entries from anon,authenticated;
grant select on public.ticket_time_entries to authenticated;
drop policy if exists ticket_time_view on public.ticket_time_entries;
create policy ticket_time_view on public.ticket_time_entries for select to authenticated using ((select private.can_manage_reports()));

-- O app chama somente esta RPC: inicio/pausa/finalizacao com horario gerado no servidor.
create or replace function public.ticket_timer_action(target_ticket uuid, operation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := (select auth.uid());
 item public.tickets%rowtype;
 active_session public.ticket_time_entries%rowtype;
begin
 if actor is null or not coalesce((select private.is_admin()),false) then
  raise exception 'Apenas administradores podem registrar o tempo de atendimento';
 end if;
 if operation not in ('start','pause','finish') then
  raise exception 'Operacao de cronometro invalida';
 end if;
 select * into item from public.tickets where id=target_ticket for update;
 if not found then raise exception 'Chamado nao encontrado'; end if;
 select * into active_session from public.ticket_time_entries
  where ticket_id=target_ticket and technician_id=actor and ended_at is null for update;
 if operation='start' then
  if item.status='resolvido' then raise exception 'Reabra o chamado antes de iniciar novo atendimento'; end if;
  if active_session.id is not null then raise exception 'Cronometro ja em execucao'; end if;
  if exists (select 1 from public.ticket_time_entries where technician_id=actor and ended_at is null) then
   raise exception 'Pause seu outro atendimento antes de iniciar este';
  end if;
  insert into public.ticket_time_entries(ticket_id,technician_id,started_at) values(target_ticket,actor,pg_catalog.now());
  if item.status='aberto' then update public.tickets set status='andamento' where id=target_ticket; end if;
 else
  if active_session.id is null and operation='pause' then raise exception 'Nenhum cronometro ativo para pausar'; end if;
  if active_session.id is not null then update public.ticket_time_entries set ended_at=pg_catalog.now() where id=active_session.id; end if;
  if operation='finish' then
   update public.tickets set status='resolvido',resolved_at=pg_catalog.now() where id=target_ticket;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('ok',true,'ticket_id',target_ticket,'operation',operation);
end;$$;
revoke execute on function public.ticket_timer_action(uuid,text) from public,anon;
grant execute on function public.ticket_timer_action(uuid,text) to authenticated;

-- Fecha cronometros se o chamado for resolvido pelo seletor de status.
create or replace function private.close_ticket_time_on_resolution() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='resolvido' and old.status is distinct from new.status then
  update public.ticket_time_entries set ended_at=pg_catalog.now() where ticket_id=new.id and ended_at is null;
 end if;
 return new;
end;$$;
revoke execute on function private.close_ticket_time_on_resolution() from public,anon,authenticated;
drop trigger if exists ticket_time_on_resolved on public.tickets;
create trigger ticket_time_on_resolved after update on public.tickets
for each row execute function private.close_ticket_time_on_resolution();

commit;
