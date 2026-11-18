-- Estoque por quantidade, com as permissões do inventário de TI.
begin;

create table if not exists public.stock_items (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 1 and 120),
 quantity integer not null check (quantity >= 0),
 revision integer not null default 0 check (revision >= 0),
 location text not null default '' check (char_length(location) <= 120)
);

create unique index if not exists stock_items_name_location_key
 on public.stock_items (lower(btrim(name)), lower(btrim(location)));

alter table public.stock_items enable row level security;
revoke all on public.stock_items from public, anon, authenticated;
grant select, insert on public.stock_items to authenticated;
grant update (name, quantity, location, revision) on public.stock_items to authenticated;

drop policy if exists stock_items_select on public.stock_items;
create policy stock_items_select on public.stock_items for select to authenticated
 using ((select private.can_view_inventory()));

drop policy if exists stock_items_insert on public.stock_items;
create policy stock_items_insert on public.stock_items for insert to authenticated
 with check ((select private.can_edit_inventory()));

drop policy if exists stock_items_update on public.stock_items;
create policy stock_items_update on public.stock_items for update to authenticated
 using ((select private.can_edit_inventory())) with check ((select private.can_edit_inventory()));

commit;
