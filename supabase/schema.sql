-- CAPRICHO STORE - PostgreSQL / Supabase
-- Run this in Supabase SQL Editor. It creates an empty catalog: no products or commercial data are inserted.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  stock integer not null default 0 check (stock >= 0),
  stock_min integer not null default 0 check (stock_min >= 0),
  active boolean not null default false,
  featured boolean not null default false,
  offer boolean not null default false,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text unique,
  price numeric(12,2) check (price is null or price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity <> 0),
  movement_type text not null check (movement_type in ('entry','exit','adjustment','return')),
  reason text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  delivery_type text not null check (delivery_type in ('delivery','pickup')),
  address text,
  neighborhood text,
  city text,
  notes text,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','CONTACTED','CONFIRMED','PREPARING','DELIVERED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  product_name text not null,
  variant_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'CAPRICHO STORE',
  logo_url text,
  instagram text,
  whatsapp text,
  address text,
  city text,
  hours text,
  delivery_fee numeric(12,2) check (delivery_fee is null or delivery_fee >= 0),
  delivery_enabled boolean not null default false,
  payment_methods jsonb not null default '[]'::jsonb,
  contact_text text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.store_settings(id) values (1) on conflict (id) do nothing;

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(active);
create index if not exists product_images_product_idx on public.product_images(product_id, sort_order);
create index if not exists variants_product_idx on public.product_variants(product_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists inventory_product_idx on public.inventory_movements(product_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists variants_updated_at on public.product_variants;
create trigger variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public catalog reads only active records.
drop policy if exists categories_public_select on public.categories;
create policy categories_public_select on public.categories for select to anon, authenticated using (active = true or public.is_admin());
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_public_select on public.products;
create policy products_public_select on public.products for select to anon, authenticated using (active = true or public.is_admin());
drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists images_public_select on public.product_images;
create policy images_public_select on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and (p.active = true or public.is_admin())));
drop policy if exists images_admin_all on public.product_images;
create policy images_admin_all on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_public_select on public.product_variants;
create policy variants_public_select on public.product_variants for select to anon, authenticated using (active = true and exists(select 1 from public.products p where p.id = product_id and p.active = true) or public.is_admin());
drop policy if exists variants_admin_all on public.product_variants;
create policy variants_admin_all on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists inventory_admin_all on public.inventory_movements;
create policy inventory_admin_all on public.inventory_movements for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_public_select on public.store_settings;
create policy settings_public_select on public.store_settings for select to anon, authenticated using (true);
drop policy if exists settings_admin_all on public.store_settings;
create policy settings_admin_all on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Atomic order creation. Prices and stock are read from PostgreSQL, never trusted from the browser.
create or replace function public.create_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_qty integer;
  v_unit numeric(12,2);
  v_line numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_delivery numeric(12,2) := 0;
  v_city text := nullif(trim(coalesce(p_order->>'city','')), '');
  v_delivery_type text := p_order->>'delivery_type';
  v_order record;
begin
  if nullif(trim(coalesce(p_order->>'customer_name','')), '') is null then raise exception 'El nombre es obligatorio'; end if;
  if nullif(trim(coalesce(p_order->>'customer_phone','')), '') is null then raise exception 'El teléfono es obligatorio'; end if;
  if v_delivery_type not in ('delivery','pickup') then raise exception 'Tipo de entrega inválido'; end if;
  if jsonb_typeof(p_order->'items') <> 'array' or jsonb_array_length(p_order->'items') = 0 then raise exception 'El carrito está vacío'; end if;

  if v_delivery_type = 'delivery' then
    if not exists(select 1 from store_settings where id=1 and delivery_enabled=true) then raise exception 'El domicilio no está habilitado'; end if;
    select coalesce(delivery_fee,0) into v_delivery from store_settings where id=1;
  end if;

  insert into orders(id,customer_name,customer_phone,delivery_type,address,neighborhood,city,notes,delivery_fee)
  values(v_order_id,trim(p_order->>'customer_name'),trim(p_order->>'customer_phone'),v_delivery_type,
         nullif(trim(coalesce(p_order->>'address','')),''),nullif(trim(coalesce(p_order->>'neighborhood','')),''),v_city,
         nullif(trim(coalesce(p_order->>'notes','')), ''),v_delivery);

  for v_item in select * from jsonb_array_elements(p_order->'items') loop
    select * into v_product from products where id=(v_item->>'product_id')::uuid and active=true for update;
    if not found then raise exception 'Uno de los productos ya no está disponible'; end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    v_unit := coalesce(v_product.sale_price,v_product.price);

    if nullif(v_item->>'variant_id','') is not null then
      select * into v_variant from product_variants where id=(v_item->>'variant_id')::uuid and product_id=v_product.id and active=true for update;
      if not found then raise exception 'Una variante ya no está disponible'; end if;
      if v_variant.stock < v_qty then raise exception 'Stock insuficiente para %', v_product.name; end if;
      v_unit := coalesce(v_variant.price,v_unit);
      update product_variants set stock=stock-v_qty where id=v_variant.id;
    else
      if v_product.stock < v_qty then raise exception 'Stock insuficiente para %', v_product.name; end if;
      update products set stock=stock-v_qty where id=v_product.id;
    end if;

    v_line := v_unit * v_qty;
    v_subtotal := v_subtotal + v_line;
    insert into order_items(order_id,product_id,variant_id,product_name,variant_name,quantity,unit_price,line_total)
    values(v_order_id,v_product.id,case when nullif(v_item->>'variant_id','') is null then null else v_variant.id end,
           v_product.name,case when nullif(v_item->>'variant_id','') is null then null else v_variant.name end,v_qty,v_unit,v_line);
  end loop;

  update orders set subtotal=v_subtotal,total=v_subtotal+v_delivery where id=v_order_id;
  select * into v_order from orders where id=v_order_id;
  return jsonb_build_object('order_id',v_order_id,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,'total',v_order.total);
exception when others then
  raise;
end;
$$;

grant execute on function public.create_order(jsonb) to anon, authenticated;

-- Create the admin profile AFTER creating the Auth user in Supabase Auth.
-- Example (replace with the actual Auth user's UUID):
-- insert into public.profiles(id, role) values ('USER-UUID-HERE','admin') on conflict (id) do update set role='admin';

-- Storage bucket: create as public so storefront images can be displayed by URL.
insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict (id) do update set public=true;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select to public using (bucket_id='product-images');
drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.is_admin());
drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated using (bucket_id='product-images' and public.is_admin()) with check (bucket_id='product-images' and public.is_admin());
drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated using (bucket_id='product-images' and public.is_admin());
