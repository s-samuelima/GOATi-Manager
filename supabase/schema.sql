-- GOATi MANAGER v1.0 | executar no SQL Editor de um PROJETO SUPABASE EXCLUSIVO
-- Execute uma vez em um projeto vazio. NÃO execute no banco do outros projetos.
-- Nenhum dado de exemplo é inserido aqui.
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  sector text not null default 'Não informado',
  role text not null default 'funcionario' check (role in ('funcionario','admin','gestao')),
  status text not null default 'pendente' check(status in ('pendente','ativo','bloqueado')),
  created_at timestamptz not null default now()
);

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin' and p.status='ativo');
$$;
create or replace function private.is_active() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='ativo');
$$;
create or replace function private.can_manage_reports() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','gestao') and p.status='ativo');
$$;
revoke execute on function private.is_admin() from public,anon;
revoke execute on function private.is_active() from public,anon;
revoke execute on function private.can_manage_reports() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active() to authenticated;
grant execute on function private.can_manage_reports() to authenticated;

create or replace function private.create_profile_for_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,email,sector,role,status)
 values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Novo colaborador'),coalesce(new.email,''),coalesce(nullif(new.raw_user_meta_data->>'sector',''),'Não informado'),'funcionario','ativo')
 on conflict (id) do nothing;
 return new;
end;$$;
revoke execute on function private.create_profile_for_user() from public,anon,authenticated;
drop trigger if exists goat_ti_new_user on auth.users;
create trigger goat_ti_new_user after insert on auth.users for each row execute function private.create_profile_for_user();

create table if not exists public.assets (
 id uuid primary key default gen_random_uuid(),
 tag text not null unique,
 category text not null,
 brand text not null default '',model text not null default '',serial text not null default '',
 sector text not null default '',owner text not null default '',location text not null default '',
 status text not null default 'Em uso',condition text not null default 'Bom',
 quantity integer not null default 1 check(quantity>0),
 imei text not null default '',line text not null default '',notes text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint tag_goat check (tag ~ '^GOAT-TI-[A-Z]+-[0-9]{3,}$')
);
create table if not exists public.tickets (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 requester_id uuid not null references public.profiles(id),
 requester_name text not null default '',sector text not null default '',
 title text not null check(length(trim(title)) between 5 and 140),
 description text not null check(length(trim(description)) between 10 and 8000),
 category text not null default 'Outros',
 urgency text not null default 'media' check(urgency in ('baixa','media','alta','critica')),
 status text not null default 'aberto' check(status in ('aberto','andamento','aguardando','resolvido')),
 asset_id uuid references public.assets(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists tickets_requester_id on public.tickets(requester_id);
create index if not exists tickets_created_at on public.tickets(created_at desc);
create index if not exists tickets_status on public.tickets(status);
create table if not exists public.ticket_messages (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 author_id uuid not null references public.profiles(id),
 author_name text not null default '',
 body text not null check(length(trim(body)) between 1 and 4000),
 internal boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists msg_ticket_idx on public.ticket_messages(ticket_id);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null unique references public.tickets(id) on delete cascade,
 author_id uuid not null references public.profiles(id),
 rating smallint not null check(rating between 1 and 5),
 resolved boolean not null,
 comment text not null default '' check(length(comment)<=1500),
 created_at timestamptz not null default now()
);
create table if not exists public.activities (
 id uuid primary key default gen_random_uuid(),
 date date not null default current_date,
 title text not null check(length(trim(title)) between 3 and 180),
 category text not null default 'Outros',sector text not null default '',
 minutes integer not null default 0 check(minutes>=0 and minutes<=1440),
 description text not null default '',status text not null default 'Concluída',
 created_at timestamptz not null default now()
);
create table if not exists public.guides (
 id uuid primary key default gen_random_uuid(),
 title text not null,category text not null default 'Outros',summary text not null default '',
 steps jsonb not null default '[]'::jsonb,active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.ticket_events (
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.tickets(id) on delete cascade,
 actor_id uuid, action text not null,previous_value text,new_value text,
 created_at timestamptz not null default now()
);

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end;$$;
drop trigger if exists tickets_touch on public.tickets;
create trigger tickets_touch before update on public.tickets for each row execute function private.touch_updated_at();
drop trigger if exists assets_touch on public.assets;
create trigger assets_touch before update on public.assets for each row execute function private.touch_updated_at();
create or replace function private.log_ticket_status() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.ticket_events(ticket_id,actor_id,action,new_value) values(new.id,(select auth.uid()),'criado',new.status);
 elsif new.status is distinct from old.status then
  insert into public.ticket_events(ticket_id,actor_id,action,previous_value,new_value) values(new.id,(select auth.uid()),'status',old.status,new.status);
 end if;
 return new;
end;$$;
revoke execute on function private.log_ticket_status() from public,anon,authenticated;
drop trigger if exists tickets_event_log on public.tickets;
create trigger tickets_event_log after insert or update on public.tickets for each row execute function private.log_ticket_status();

create or replace function private.reopen_if_not_resolved() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.resolved=false then
  update public.tickets set status='aberto',resolved_at=null where id=new.ticket_id;
 end if;
 return new;
end;$$;
revoke execute on function private.reopen_if_not_resolved() from public,anon,authenticated;
drop trigger if exists review_reopen_ticket on public.reviews;
create trigger review_reopen_ticket after insert on public.reviews for each row execute function private.reopen_if_not_resolved();

alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.activities enable row level security;
alter table public.guides enable row level security;
alter table public.ticket_events enable row level security;

-- Diminui superfície de acesso; RLS e grants atuam em conjunto.
revoke all on public.profiles,public.assets,public.tickets,public.ticket_messages,public.reviews,public.activities,public.guides,public.ticket_events from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select,insert,update,delete on public.tickets to authenticated;
grant select,insert on public.ticket_messages to authenticated;
grant select,insert on public.reviews to authenticated;
grant select,insert,update,delete on public.assets,public.activities,public.guides to authenticated;
grant select on public.ticket_events to authenticated;
grant usage,select on sequence public.tickets_number_seq to authenticated;

create policy profiles_select on public.profiles for select to authenticated
 using(id=(select auth.uid()) or (select private.can_manage_reports()));
create policy profiles_update_admin on public.profiles for update to authenticated
 using((select private.is_admin())) with check((select private.is_admin()));

create policy tickets_select on public.tickets for select to authenticated
 using(((requester_id=(select auth.uid()) and (select private.is_active())) or (select private.can_manage_reports())));
create policy tickets_insert on public.tickets for insert to authenticated
 with check(requester_id=(select auth.uid()) and (select private.is_active()) and status='aberto' and urgency in ('baixa','media','alta','critica'));
create policy tickets_update_admin on public.tickets for update to authenticated
 using((select private.is_admin())) with check((select private.is_admin()));
create policy tickets_delete_admin on public.tickets for delete to authenticated
 using((select private.is_admin()));

create policy msg_select on public.ticket_messages for select to authenticated
 using((select private.can_manage_reports()) or (not internal and (select private.is_active()) and exists(select 1 from public.tickets t where t.id=ticket_id and t.requester_id=(select auth.uid()))));
create policy msg_insert on public.ticket_messages for insert to authenticated
 with check(author_id=(select auth.uid()) and (select private.is_active()) and
 ( (select private.is_admin()) or (not internal and exists(select 1 from public.tickets t where t.id=ticket_id and t.requester_id=(select auth.uid())))));

create policy reviews_select on public.reviews for select to authenticated
 using((select private.can_manage_reports()) or ((select private.is_active()) and author_id=(select auth.uid())));
create policy reviews_insert on public.reviews for insert to authenticated
 with check(author_id=(select auth.uid()) and (select private.is_active()) and exists(select 1 from public.tickets t where t.id=ticket_id and t.requester_id=(select auth.uid()) and t.status='resolvido'));

create policy assets_select on public.assets for select to authenticated using((select private.can_manage_reports()));
create policy assets_insert on public.assets for insert to authenticated with check((select private.is_admin()));
create policy assets_update on public.assets for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy assets_delete on public.assets for delete to authenticated using((select private.is_admin()));

create policy activities_select on public.activities for select to authenticated using((select private.can_manage_reports()));
create policy activities_insert on public.activities for insert to authenticated with check((select private.is_admin()));
create policy activities_update on public.activities for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy activities_delete on public.activities for delete to authenticated using((select private.is_admin()));

create policy guides_select on public.guides for select to authenticated using(((select private.is_active()) and active) or (select private.is_admin()));
create policy guides_insert on public.guides for insert to authenticated with check((select private.is_admin()));
create policy guides_update on public.guides for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy guides_delete on public.guides for delete to authenticated using((select private.is_admin()));
create policy events_select on public.ticket_events for select to authenticated using(
  (select private.can_manage_reports()) or ((select private.is_active()) and exists(select 1 from public.tickets t where t.id=ticket_id and t.requester_id=(select auth.uid())))
);

-- Recomendado: testar políticas com usuário ativo, pendente e bloqueado antes de liberar a empresa.
-- BOOTSTRAP DO ADMINISTRADOR: cadastre sua conta pelo aplicativo, confirme e-mail e depois execute
-- UPDATE public.profiles SET role='admin', status='ativo' WHERE email='SEU_EMAIL_REAL';
-- Somente no editor SQL administrativo. Não coloque credenciais/admin secrets no frontend.

-- EXTENSÃO DO INVENTÁRIO: histórico de movimentações e manutenções.
create table if not exists public.asset_movements (
 id uuid primary key default gen_random_uuid(),
 asset_id uuid not null references public.assets(id) on delete cascade,
 movement_date date not null default current_date,
 from_sector text not null default '', to_sector text not null default '',
 from_owner text not null default '', to_owner text not null default '',
 new_location text not null default '',notes text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.asset_maintenance (
 id uuid primary key default gen_random_uuid(),
 asset_id uuid not null references public.assets(id) on delete cascade,
 opened_at date not null default current_date,
 title text not null,action_taken text not null default '',
 status text not null default 'Em andamento',technician text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists movements_asset_idx on public.asset_movements(asset_id);
create index if not exists maintenance_asset_idx on public.asset_maintenance(asset_id);
alter table public.asset_movements enable row level security;
alter table public.asset_maintenance enable row level security;
revoke all on public.asset_movements,public.asset_maintenance from anon,authenticated;
grant select,insert,update,delete on public.asset_movements,public.asset_maintenance to authenticated;
create policy movement_select on public.asset_movements for select to authenticated using((select private.can_manage_reports()));
create policy movement_insert on public.asset_movements for insert to authenticated with check((select private.is_admin()));
create policy movement_update on public.asset_movements for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy movement_delete on public.asset_movements for delete to authenticated using((select private.is_admin()));
create policy maintenance_select on public.asset_maintenance for select to authenticated using((select private.can_manage_reports()));
create policy maintenance_insert on public.asset_maintenance for insert to authenticated with check((select private.is_admin()));
create policy maintenance_update on public.asset_maintenance for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy maintenance_delete on public.asset_maintenance for delete to authenticated using((select private.is_admin()));

-- Aplica transferência de patrimônio ao cadastro em uma única transação.
create or replace function private.apply_asset_movement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.assets set
  sector = coalesce(nullif(new.to_sector,''),sector),
  owner = coalesce(nullif(new.to_owner,''),owner),
  location = coalesce(nullif(new.new_location,''),location)
 where id=new.asset_id;
 return new;
end;$$;
revoke execute on function private.apply_asset_movement() from public,anon,authenticated;
drop trigger if exists on_asset_movement on public.asset_movements;
create trigger on_asset_movement after insert on public.asset_movements for each row execute function private.apply_asset_movement();

-- Protege autoria e datas contra manipulação pelo navegador.
create or replace function private.stamp_ticket_author() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 select p.full_name into new.requester_name from public.profiles p where p.id=new.requester_id;
 new.created_at=now();new.updated_at=now();
 return new;
end;$$;
revoke execute on function private.stamp_ticket_author() from public,anon,authenticated;
drop trigger if exists on_ticket_created_stamp on public.tickets;
create trigger on_ticket_created_stamp before insert on public.tickets for each row execute function private.stamp_ticket_author();
create or replace function private.stamp_message_author() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 select p.full_name into new.author_name from public.profiles p where p.id=new.author_id;
 new.created_at=now();return new;
end;$$;
revoke execute on function private.stamp_message_author() from public,anon,authenticated;
drop trigger if exists on_message_created_stamp on public.ticket_messages;
create trigger on_message_created_stamp before insert on public.ticket_messages for each row execute function private.stamp_message_author();

-- Trilha de auditoria administrativa (aprovação/bloqueio e patrimônio).
create table if not exists public.audit_log (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid, entity text not null, entity_id uuid,
 action text not null, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon,authenticated;
grant select on public.audit_log to authenticated;
create policy audit_read_admin on public.audit_log for select to authenticated using((select private.is_admin()));

create or replace function private.audit_profile_access() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.role is distinct from new.role or old.status is distinct from new.status then
  insert into public.audit_log(actor_id,entity,entity_id,action,details)
  values((select auth.uid()),'profiles',new.id,'alteracao_de_acesso',
  pg_catalog.jsonb_build_object('anterior_role',old.role,'nova_role',new.role,'anterior_status',old.status,'novo_status',new.status));
 end if;
 return new;
end;$$;
revoke execute on function private.audit_profile_access() from public,anon,authenticated;
drop trigger if exists on_profile_access_change on public.profiles;
create trigger on_profile_access_change after update on public.profiles for each row execute function private.audit_profile_access();

create or replace function private.audit_asset_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.audit_log(actor_id,entity,entity_id,action,details)
  values((select auth.uid()),'assets',new.id,'criado',pg_catalog.jsonb_build_object('tag',new.tag));
 else
  insert into public.audit_log(actor_id,entity,entity_id,action,details)
  values((select auth.uid()),'assets',new.id,'atualizado',
  pg_catalog.jsonb_build_object('tag',new.tag,'setor_anterior',old.sector,'novo_setor',new.sector,'responsavel_anterior',old.owner,'novo_responsavel',new.owner));
 end if;
 return new;
end;$$;
revoke execute on function private.audit_asset_change() from public,anon,authenticated;
drop trigger if exists on_asset_audit on public.assets;
create trigger on_asset_audit after insert or update on public.assets for each row execute function private.audit_asset_change();

-- Auditoria de exclusão de chamados. O histórico de auditoria não possui FK ao chamado.
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

-- GOATi Manager v1.3.0: medir tempo de atendimento (não exclui dados existentes)
-- Execute UMA VEZ no SQL Editor do Supabase já configurado.
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


-- Aplique a migracao incremental 20261116_signup_auto_access_delete_users.sql nos projetos existentes.
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
