-- GOATi Manager v1.4.0 | Inventario patrimonial GL
-- MIGRACAO INCREMENTAL: execute em projeto existente apos backup e homologacao.
-- Preserva os UUIDs, chamados, movimentacoes, manutencoes e tags antigas em legacy_tag.
-- Sem dados de exemplo, sem exclusao de registros existentes.
begin;

alter table public.profiles add column if not exists can_manage_inventory boolean not null default false;
alter table public.assets add column if not exists legacy_tag text;
alter table public.assets add column if not exists acquired_on date;
alter table public.assets add column if not exists warranty_until date;
alter table public.assets add column if not exists last_checked_on date;
alter table public.assets add column if not exists last_assigned_on date;

create sequence if not exists public.gl_asset_tag_seq as bigint start with 1 increment by 1 no cycle;

-- Mantem a sequencia superior ao maior GL ja usado, inclusive em migracoes repetidas.
do $$
declare mx bigint;
declare current_last bigint;
declare used boolean;
begin
 select coalesce(max(substring(tag from '^GL-([0-9]+)$')::bigint),0) into mx from public.assets;
 select last_value,is_called into current_last,used from public.gl_asset_tag_seq;
 perform pg_catalog.setval('public.gl_asset_tag_seq',greatest(mx,current_last,1),used or mx>0);
end;$$;

-- Migra patrimonios legados sem afetar as FKs existentes (assets.id).
alter table public.assets drop constraint if exists tag_goat;
alter table public.assets drop constraint if exists tag_gl;
do $$
declare r record;
begin
 for r in select id,tag from public.assets where tag !~ '^GL-[0-9]{6,}$' order by created_at,id loop
  update public.assets
   set legacy_tag=coalesce(legacy_tag,r.tag),
       tag='GL-'||pg_catalog.lpad(pg_catalog.nextval('public.gl_asset_tag_seq')::text,6,'0')
   where id=r.id;
 end loop;
end;$$;
alter table public.assets add constraint tag_gl check(tag ~ '^GL-[0-9]{6,}$');
create unique index if not exists assets_legacy_tag_unique on public.assets(legacy_tag) where legacy_tag is not null;
create index if not exists assets_serial_lookup on public.assets(serial) where serial<>'';

-- O navegador nunca escolhe o numero da etiqueta. A etiqueta nao muda em edicoes.
create or replace function private.assign_gl_asset_tag() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.tag='GL-'||pg_catalog.lpad(pg_catalog.nextval('public.gl_asset_tag_seq')::text,6,'0');
  new.legacy_tag=null;
  if new.quantity<>1 then raise exception 'Cada patrimonio novo deve representar um equipamento (quantidade = 1)'; end if;
 elsif new.tag is distinct from old.tag or new.id is distinct from old.id then
  raise exception 'Identificador patrimonial e UUID nao podem ser alterados';
 elsif new.legacy_tag is distinct from old.legacy_tag then
  raise exception 'Identificador anterior nao pode ser alterado';
 end if;
 return new;
end;$$;
revoke execute on function private.assign_gl_asset_tag() from public,anon,authenticated;
drop trigger if exists on_asset_gl_tag on public.assets;
create trigger on_asset_gl_tag before insert or update on public.assets
 for each row execute function private.assign_gl_asset_tag();

create or replace function private.can_view_inventory() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid())
 and p.status='ativo'
 and (p.role in ('admin','gestao') or (p.role='funcionario' and p.can_manage_inventory=true)));
$$;
create or replace function private.can_edit_inventory() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid())
 and p.status='ativo'
 and (p.role='admin' or (p.role='funcionario' and p.can_manage_inventory=true)));
$$;
revoke execute on function private.can_view_inventory() from public,anon;
revoke execute on function private.can_edit_inventory() from public,anon;
grant execute on function private.can_view_inventory() to authenticated;
grant execute on function private.can_edit_inventory() to authenticated;

-- Audita explicitamente concessoes e revogacoes de permissao TI.
create or replace function private.audit_profile_access() returns trigger
language plpgsql security definer set search_path='' as $
begin
 if old.role is distinct from new.role or old.status is distinct from new.status
    or old.can_manage_inventory is distinct from new.can_manage_inventory then
  insert into public.audit_log(actor_id,entity,entity_id,action,details)
  values((select auth.uid()),'profiles',new.id,'alteracao_de_acesso',
   pg_catalog.jsonb_build_object('anterior_role',old.role,'nova_role',new.role,
      'anterior_status',old.status,'novo_status',new.status,
      'anterior_inventario',old.can_manage_inventory,'novo_inventario',new.can_manage_inventory));
 end if;
 return new;
end;$;
revoke execute on function private.audit_profile_access() from public,anon,authenticated;


-- Inventario: Gestao leitura, TI autorizado leitura/escrita, Admin leitura/escrita.
drop policy if exists assets_select on public.assets;
drop policy if exists assets_insert on public.assets;
drop policy if exists assets_update on public.assets;
drop policy if exists assets_delete on public.assets;
create policy assets_select on public.assets for select to authenticated using((select private.can_view_inventory()));
create policy assets_insert on public.assets for insert to authenticated with check((select private.can_edit_inventory()));
create policy assets_update on public.assets for update to authenticated using((select private.can_edit_inventory())) with check((select private.can_edit_inventory()));
-- Sem DELETE fisico: usar status 'Baixado' e preservar codigo e historico.
revoke delete on public.assets from authenticated;

drop policy if exists movement_select on public.asset_movements;
drop policy if exists movement_insert on public.asset_movements;
drop policy if exists movement_update on public.asset_movements;
drop policy if exists movement_delete on public.asset_movements;
create policy movement_select on public.asset_movements for select to authenticated using((select private.can_view_inventory()));
create policy movement_insert on public.asset_movements for insert to authenticated with check((select private.can_edit_inventory()));
-- Movimentacao e registro historico imutavel: nao permitir UPDATE/DELETE.
revoke update,delete on public.asset_movements from authenticated;

drop policy if exists maintenance_select on public.asset_maintenance;
drop policy if exists maintenance_insert on public.asset_maintenance;
drop policy if exists maintenance_update on public.asset_maintenance;
drop policy if exists maintenance_delete on public.asset_maintenance;
create policy maintenance_select on public.asset_maintenance for select to authenticated using((select private.can_view_inventory()));
create policy maintenance_insert on public.asset_maintenance for insert to authenticated with check((select private.can_edit_inventory()));
revoke update,delete on public.asset_maintenance from authenticated;

create table if not exists public.asset_events(
 id uuid primary key default pg_catalog.gen_random_uuid(),
 asset_id uuid not null references public.assets(id) on delete restrict,
 actor_id uuid,
 event_type text not null,
 before_data jsonb,
 after_data jsonb,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default pg_catalog.now()
);
create index if not exists asset_events_asset_idx on public.asset_events(asset_id,created_at desc);
alter table public.asset_events enable row level security;
revoke all on public.asset_events from anon,authenticated;
grant select on public.asset_events to authenticated;
drop policy if exists asset_events_select on public.asset_events;
create policy asset_events_select on public.asset_events for select to authenticated
 using((select private.can_view_inventory()));

-- Historico inviolavel de cadastro, transferencias, manutencao e baixa.
create or replace function private.record_asset_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare kind text;
begin
 if tg_table_name='assets' then
  if tg_op='INSERT' then kind:='cadastro'; else
   if to_jsonb(old) is not distinct from to_jsonb(new) then return new; end if;
   kind:=case when new.status='Baixado' and old.status is distinct from 'Baixado' then 'baixa' else 'atualizacao' end;
  end if;
  insert into public.asset_events(asset_id,actor_id,event_type,before_data,after_data)
  values(new.id,(select auth.uid()),kind,
   case when tg_op='INSERT' then null else to_jsonb(old) end,to_jsonb(new));
  return new;
 elsif tg_table_name='asset_movements' then
  insert into public.asset_events(asset_id,actor_id,event_type,details)
  values(new.asset_id,(select auth.uid()),'movimentacao',
   pg_catalog.jsonb_build_object('from_sector',new.from_sector,'to_sector',new.to_sector,'from_owner',new.from_owner,'to_owner',new.to_owner,'new_location',new.new_location,'notes',new.notes));
 elsif tg_table_name='asset_maintenance' then
  insert into public.asset_events(asset_id,actor_id,event_type,details)
  values(new.asset_id,(select auth.uid()),'manutencao',
   pg_catalog.jsonb_build_object('title',new.title,'status',new.status,'technician',new.technician,'action',new.action_taken));
 end if;
 return new;
end;$$;
revoke execute on function private.record_asset_event() from public,anon,authenticated;
drop trigger if exists asset_event_data on public.assets;
create trigger asset_event_data after insert or update on public.assets
 for each row execute function private.record_asset_event();
drop trigger if exists asset_event_movement on public.asset_movements;
create trigger asset_event_movement after insert on public.asset_movements
 for each row execute function private.record_asset_event();
drop trigger if exists asset_event_maintenance on public.asset_maintenance;
create trigger asset_event_maintenance after insert on public.asset_maintenance
 for each row execute function private.record_asset_event();

-- Vinculo aos chamados sem conceder consulta de chamados de outros usuarios.
create or replace function public.link_ticket_asset(target_ticket uuid,target_asset uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if (select auth.uid()) is null or not coalesce((select private.can_edit_inventory()),false) then
  raise exception 'Sem permissao para associar equipamento';
 end if;
 select requester_id into owner_id from public.tickets where id=target_ticket for update;
 if not found then raise exception 'Chamado nao encontrado'; end if;
 if not coalesce((select private.is_admin()),false) and owner_id<>(select auth.uid()) then
  raise exception 'Somente seus proprios chamados podem ser associados';
 end if;
 if target_asset is not null and not exists(select 1 from public.assets where id=target_asset and status<>'Baixado') then
  raise exception 'Patrimonio nao encontrado ou baixado';
 end if;
 update public.tickets set asset_id=target_asset where id=target_ticket;
 return pg_catalog.jsonb_build_object('ok',true,'ticket_id',target_ticket,'asset_id',target_asset);
end;$$;
revoke all on function public.link_ticket_asset(uuid,uuid) from public,anon,authenticated;
grant execute on function public.link_ticket_asset(uuid,uuid) to authenticated;

commit;
