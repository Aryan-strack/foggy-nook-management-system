-- ============================================================================
-- FOGGY NOOK SMOKE & VAPE SHOP MANAGEMENT SYSTEM
-- Database Schema for Supabase (PostgreSQL)
-- ============================================================================
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)
-- Safe to re-run: uses IF NOT EXISTS / DROP ... IF EXISTS guards.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('super_admin', 'admin', 'manager');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_movement_type as enum
    ('stock_in', 'stock_out', 'adjustment', 'damaged', 'expired', 'returned', 'transfer_in', 'transfer_out', 'sale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_status as enum ('completed', 'refunded', 'cancelled', 'partially_refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'card', 'easypaisa', 'jazzcash', 'mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_item_type as enum ('unit', 'loose');
exception when duplicate_object then null; end $$;

do $$ begin
  create type paper_width as enum ('58mm', '80mm');
exception when duplicate_object then null; end $$;

do $$ begin
  create type printer_connection_type as enum ('browser', 'usb', 'network', 'bluetooth');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- BRANCHES
-- ----------------------------------------------------------------------------
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  address text,
  phone text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'manager',
  branch_id uuid references branches(id) on delete set null, -- required for managers
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BRANDS
-- ----------------------------------------------------------------------------
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PRODUCTS (Global Catalog)
-- ----------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  barcode text unique,
  image_url text,
  brand_id uuid references brands(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  cost_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  loose_selling_price numeric(12,2), -- per-piece price for pack-based products
  quantity_per_pack integer default 1, -- e.g. 20 cigarettes per pack
  is_loose_saleable boolean not null default false, -- enables loose/manual selling in POS
  minimum_stock integer not null default 5,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_brand on products(brand_id);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_barcode on products(barcode);

-- ----------------------------------------------------------------------------
-- BRANCH INVENTORY (per-branch stock levels)
-- ----------------------------------------------------------------------------
create table if not exists branch_inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  stock integer not null default 0, -- units in pack terms
  loose_stock integer not null default 0, -- individual pieces broken out of packs
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id)
);

create index if not exists idx_branch_inventory_branch on branch_inventory(branch_id);
create index if not exists idx_branch_inventory_product on branch_inventory(product_id);

-- ----------------------------------------------------------------------------
-- INVENTORY LOGS (full audit trail of stock movement)
-- ----------------------------------------------------------------------------
create table if not exists inventory_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  movement_type inventory_movement_type not null,
  quantity integer not null, -- positive or negative delta
  stock_before integer not null,
  stock_after integer not null,
  reference_id uuid, -- e.g. sale id or transfer id
  transfer_to_branch_id uuid references branches(id),
  reason text,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_logs_branch on inventory_logs(branch_id);
create index if not exists idx_inventory_logs_product on inventory_logs(product_id);

-- ----------------------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  branch_id uuid references branches(id),
  total_spent numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SALES (invoices)
-- ----------------------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  branch_id uuid not null references branches(id),
  cashier_id uuid references profiles(id),
  customer_id uuid references customers(id),
  customer_name text, -- free-text walk-in customer name, optional, no record required
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0, -- for profit calc
  profit numeric(12,2) not null default 0,
  paid_amount numeric(12,2), -- amount tendered by the customer
  change_amount numeric(12,2) not null default 0, -- change returned
  payment_method payment_method not null default 'cash',
  payment_breakdown jsonb, -- for mixed payments: {"cash": 500, "card": 300}
  status sale_status not null default 'completed',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_branch on sales(branch_id);
create index if not exists idx_sales_cashier on sales(cashier_id);
create index if not exists idx_sales_created_at on sales(created_at);

-- ----------------------------------------------------------------------------
-- SALE ITEMS
-- ----------------------------------------------------------------------------
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  item_type sale_item_type not null default 'unit', -- unit or loose (per-piece)
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_sale_items_product on sale_items(product_id);

-- ----------------------------------------------------------------------------
-- EXPENSE CATEGORIES
-- ----------------------------------------------------------------------------
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- Rent, Salary, Electricity, Internet, Marketing, Miscellaneous
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- EXPENSES
-- ----------------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  category_id uuid references expense_categories(id),
  title text not null,
  amount numeric(12,2) not null,
  description text,
  expense_date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_branch on expenses(branch_id);
create index if not exists idx_expenses_date on expenses(expense_date);

-- ----------------------------------------------------------------------------
-- ACTIVITY LOGS
-- ----------------------------------------------------------------------------
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  branch_id uuid references branches(id),
  action text not null, -- e.g. "Added Product", "Updated Stock", "Deleted Brand"
  entity_type text, -- e.g. "product", "sale", "branch"
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_actor on activity_logs(actor_id);
create index if not exists idx_activity_logs_branch on activity_logs(branch_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  recipient_id uuid references profiles(id), -- null = broadcast to role scope
  type text not null, -- low_stock, out_of_stock, expired, target
  title text not null,
  message text,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on notifications(recipient_id);

-- ----------------------------------------------------------------------------
-- SETTINGS (single row, shop-wide configuration)
-- ----------------------------------------------------------------------------
create table if not exists settings (
  id int primary key default 1,
  shop_name text not null default 'Foggy Nook',
  logo_url text,
  address text,
  phone text,
  whatsapp text,
  tax_percent numeric(5,2) not null default 0,
  currency text not null default 'PKR',
  receipt_footer text,
  daily_target numeric(12,2),
  monthly_target numeric(12,2),
  -- default receipt/printer preferences, used when a branch has no override
  -- in branch_printers
  default_paper_width paper_width not null default '80mm',
  default_auto_print boolean not null default true,
  default_print_preview boolean not null default true,
  default_font_size smallint not null default 0, -- 0 normal, 1 large
  default_left_margin smallint not null default 0, -- spaces / px
  default_show_qr_code boolean not null default false,
  default_qr_value text,
  default_open_cash_drawer boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id, shop_name, currency)
values (1, 'Foggy Nook', 'PKR')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- BRANCH PRINTERS — one printer configuration per branch
-- ----------------------------------------------------------------------------
create table if not exists branch_printers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null unique references branches(id) on delete cascade,
  printer_name text, -- friendly label, e.g. "XPrinter XP-80C"
  connection_type printer_connection_type not null default 'browser',
  paper_width paper_width not null default '80mm',
  auto_print boolean not null default true,
  print_preview boolean not null default true,
  open_cash_drawer boolean not null default false,
  header_logo_url text,
  footer_message text,
  show_qr_code boolean not null default false,
  qr_value text,
  font_size smallint not null default 0, -- 0 normal, 1 large
  left_margin smallint not null default 0,
  store_address text,
  phone text,
  whatsapp text,
  -- USB (WebUSB) pairing
  usb_vendor_id integer,
  usb_product_id integer,
  -- Bluetooth (Web Bluetooth) pairing — browser-assigned device id, not a MAC
  bluetooth_device_id text,
  bluetooth_device_name text,
  -- Network (LAN) ESC/POS printers, typically port 9100
  network_ip text,
  network_port integer default 9100,
  updated_at timestamptz not null default now()
);

create index if not exists idx_branch_printers_branch on branch_printers(branch_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

create or replace function current_profile_role()
returns user_role
language sql stable security definer
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_profile_branch()
returns uuid
language sql stable security definer
as $$
  select branch_id from profiles where id = auth.uid();
$$;

create or replace function is_admin_or_above()
returns boolean
language sql stable security definer
as $$
  select current_profile_role() in ('super_admin', 'admin');
$$;

-- Auto-create profile row when a new auth user is created (metadata-driven)
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.profiles (id, full_name, email, role, branch_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'manager'),
    nullif(new.raw_user_meta_data->>'branch_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table branches enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table branch_inventory enable row level security;
alter table inventory_logs enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table activity_logs enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;
alter table branch_printers enable row level security;

-- PROFILES: everyone signed-in can read profiles; only super_admin/admin can write others
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (auth.uid() is not null);

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid() or is_admin_or_above());

drop policy if exists "profiles_insert_admin" on profiles;
create policy "profiles_insert_admin" on profiles for insert
  with check (is_admin_or_above() or id = auth.uid());

drop policy if exists "profiles_delete_admin" on profiles;
create policy "profiles_delete_admin" on profiles for delete
  using (current_profile_role() = 'super_admin');

-- BRANCHES: everyone can read; only super_admin can write
drop policy if exists "branches_select" on branches;
create policy "branches_select" on branches for select
  using (auth.uid() is not null);

drop policy if exists "branches_write" on branches;
create policy "branches_write" on branches for all
  using (current_profile_role() = 'super_admin')
  with check (current_profile_role() = 'super_admin');

-- BRANDS / CATEGORIES: everyone can read; admin+ can write
drop policy if exists "brands_select" on brands;
create policy "brands_select" on brands for select using (auth.uid() is not null);
drop policy if exists "brands_write" on brands;
create policy "brands_write" on brands for all
  using (is_admin_or_above()) with check (is_admin_or_above());

drop policy if exists "categories_select" on categories;
create policy "categories_select" on categories for select using (auth.uid() is not null);
drop policy if exists "categories_write" on categories;
create policy "categories_write" on categories for all
  using (is_admin_or_above()) with check (is_admin_or_above());

-- PRODUCTS: everyone can read; admin+ can write (managers can update stock via branch_inventory, not product master)
drop policy if exists "products_select" on products;
create policy "products_select" on products for select using (auth.uid() is not null);
drop policy if exists "products_write" on products;
create policy "products_write" on products for all
  using (is_admin_or_above()) with check (is_admin_or_above());

-- BRANCH INVENTORY: admin+ see all; manager sees/updates only their branch
drop policy if exists "branch_inventory_select" on branch_inventory;
create policy "branch_inventory_select" on branch_inventory for select
  using (is_admin_or_above() or branch_id = current_profile_branch());

drop policy if exists "branch_inventory_write" on branch_inventory;
create policy "branch_inventory_write" on branch_inventory for all
  using (is_admin_or_above() or branch_id = current_profile_branch())
  with check (is_admin_or_above() or branch_id = current_profile_branch());

-- INVENTORY LOGS: same visibility as branch_inventory
drop policy if exists "inventory_logs_select" on inventory_logs;
create policy "inventory_logs_select" on inventory_logs for select
  using (is_admin_or_above() or branch_id = current_profile_branch());

drop policy if exists "inventory_logs_insert" on inventory_logs;
create policy "inventory_logs_insert" on inventory_logs for insert
  with check (is_admin_or_above() or branch_id = current_profile_branch());

-- CUSTOMERS: admin+ all; manager own branch
drop policy if exists "customers_select" on customers;
create policy "customers_select" on customers for select
  using (is_admin_or_above() or branch_id = current_profile_branch());
drop policy if exists "customers_write" on customers;
create policy "customers_write" on customers for all
  using (is_admin_or_above() or branch_id = current_profile_branch())
  with check (is_admin_or_above() or branch_id = current_profile_branch());

-- SALES: admin+ all; manager own branch only
drop policy if exists "sales_select" on sales;
create policy "sales_select" on sales for select
  using (is_admin_or_above() or branch_id = current_profile_branch());
drop policy if exists "sales_write" on sales;
create policy "sales_write" on sales for all
  using (is_admin_or_above() or branch_id = current_profile_branch())
  with check (is_admin_or_above() or branch_id = current_profile_branch());

-- SALE ITEMS: inherit visibility through parent sale's branch
drop policy if exists "sale_items_select" on sale_items;
create policy "sale_items_select" on sale_items for select
  using (
    exists (
      select 1 from sales s where s.id = sale_items.sale_id
      and (is_admin_or_above() or s.branch_id = current_profile_branch())
    )
  );
drop policy if exists "sale_items_write" on sale_items;
create policy "sale_items_write" on sale_items for all
  using (
    exists (
      select 1 from sales s where s.id = sale_items.sale_id
      and (is_admin_or_above() or s.branch_id = current_profile_branch())
    )
  )
  with check (
    exists (
      select 1 from sales s where s.id = sale_items.sale_id
      and (is_admin_or_above() or s.branch_id = current_profile_branch())
    )
  );

-- EXPENSE CATEGORIES: everyone reads; admin+ writes
drop policy if exists "expense_categories_select" on expense_categories;
create policy "expense_categories_select" on expense_categories for select using (auth.uid() is not null);
drop policy if exists "expense_categories_write" on expense_categories;
create policy "expense_categories_write" on expense_categories for all
  using (is_admin_or_above()) with check (is_admin_or_above());

-- EXPENSES: admin+ all; manager own branch
drop policy if exists "expenses_select" on expenses;
create policy "expenses_select" on expenses for select
  using (is_admin_or_above() or branch_id = current_profile_branch());
drop policy if exists "expenses_write" on expenses;
create policy "expenses_write" on expenses for all
  using (is_admin_or_above() or branch_id = current_profile_branch())
  with check (is_admin_or_above() or branch_id = current_profile_branch());

-- ACTIVITY LOGS: admin+ read all; manager reads own branch; everyone (incl. manager) can insert their own actions
drop policy if exists "activity_logs_select" on activity_logs;
create policy "activity_logs_select" on activity_logs for select
  using (is_admin_or_above() or branch_id = current_profile_branch());
drop policy if exists "activity_logs_insert" on activity_logs;
create policy "activity_logs_insert" on activity_logs for insert
  with check (auth.uid() is not null);

-- NOTIFICATIONS: admin+ all; manager own branch or direct recipient
drop policy if exists "notifications_select" on notifications;
create policy "notifications_select" on notifications for select
  using (is_admin_or_above() or branch_id = current_profile_branch() or recipient_id = auth.uid());
drop policy if exists "notifications_write" on notifications;
create policy "notifications_write" on notifications for all
  using (is_admin_or_above() or recipient_id = auth.uid())
  with check (is_admin_or_above() or recipient_id = auth.uid());

-- SETTINGS: everyone reads; only super_admin/admin update
drop policy if exists "settings_select" on settings;
create policy "settings_select" on settings for select using (auth.uid() is not null);
drop policy if exists "settings_write" on settings;
create policy "settings_write" on settings for update
  using (is_admin_or_above()) with check (is_admin_or_above());

-- BRANCH PRINTERS: admin+ see/manage all; manager can only read their own branch's printer
drop policy if exists "branch_printers_select" on branch_printers;
create policy "branch_printers_select" on branch_printers for select
  using (is_admin_or_above() or branch_id = current_profile_branch());
drop policy if exists "branch_printers_write" on branch_printers;
create policy "branch_printers_write" on branch_printers for all
  using (is_admin_or_above())
  with check (is_admin_or_above());

-- ============================================================================
-- SEED DATA (optional starting data — safe to edit/remove)
-- ============================================================================

insert into expense_categories (name) values
  ('Rent'), ('Salary'), ('Electricity'), ('Internet'), ('Marketing'), ('Miscellaneous')
on conflict (name) do nothing;

insert into branches (name, code, city) values
  ('Foggy Nook - Vehari', 'VHR', 'Vehari'),
  ('Foggy Nook - Multan', 'MUL', 'Multan'),
  ('Foggy Nook - Lahore', 'LHR', 'Lahore')
on conflict do nothing;

insert into brands (name) values
  ('SMOK'), ('Vaporesso'), ('GeekVape'), ('OXVA'), ('Voopoo'), ('Lost Vape'), ('Elf Bar'), ('Uwell')
on conflict (name) do nothing;

insert into categories (name) values
  ('Disposable'), ('Pod'), ('Device'), ('Mod'), ('Tank'), ('Coil'),
  ('E-Liquid'), ('Salt Nic'), ('Cigarette'), ('Accessories'), ('Battery'), ('Charger')
on conflict (name) do nothing;

-- Example per-branch printer configuration (matches the spec's example:
-- Vehari → XPrinter XP-80C, Multan → Epson TM-T20). Connection type defaults
-- to 'browser' (plain browser print) until an Admin pairs a real device via
-- Settings → Printer Settings.
insert into branch_printers (branch_id, printer_name, connection_type, paper_width)
select id, 'XPrinter XP-80C', 'browser', '80mm' from branches where code = 'VHR'
on conflict (branch_id) do nothing;

insert into branch_printers (branch_id, printer_name, connection_type, paper_width)
select id, 'Epson TM-T20', 'browser', '80mm' from branches where code = 'MUL'
on conflict (branch_id) do nothing;

insert into branch_printers (branch_id, printer_name, connection_type, paper_width)
select id, 'Generic 58mm Thermal', 'browser', '58mm' from branches where code = 'LHR'
on conflict (branch_id) do nothing;

-- ============================================================================
-- CHECKOUT RPC — atomically creates a sale + items and decrements stock
-- ============================================================================
-- p_items shape: [{ "product_id": "...", "item_type": "unit"|"loose",
--                    "quantity": 2, "unit_price": 800, "unit_cost": 600, "discount": 0 }]
create or replace function checkout_sale(
  p_branch_id uuid,
  p_cashier_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_discount numeric,
  p_tax numeric,
  p_payment_method payment_method,
  p_payment_breakdown jsonb,
  p_notes text,
  p_customer_name text default null,
  p_paid_amount numeric default null
)
returns sales
language plpgsql
security definer
as $$
declare
  v_sale sales;
  v_invoice_no text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total_cost numeric := 0;
  v_total numeric := 0;
  v_paid numeric := 0;
  v_change numeric := 0;
  v_stock_row branch_inventory;
  v_qty numeric;
  v_item_type sale_item_type;
  v_stock_before integer;
  v_stock_after integer;
begin
  -- generate invoice number
  v_invoice_no := 'FN-' || to_char(now(), 'YYMMDD') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  -- compute subtotal / cost from items
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (v_item->>'unit_price')::numeric * (v_item->>'quantity')::numeric - coalesce((v_item->>'discount')::numeric, 0);
    v_total_cost := v_total_cost + (v_item->>'unit_cost')::numeric * (v_item->>'quantity')::numeric;
  end loop;

  v_total := v_subtotal - coalesce(p_discount, 0);
  v_total := v_total + (v_total * coalesce(p_tax, 0) / 100);

  -- if no explicit tendered amount is given (e.g. card/EasyPaisa/JazzCash,
  -- or cash paid exactly), assume paid = total and change = 0
  v_paid := coalesce(p_paid_amount, v_total);
  v_change := greatest(v_paid - v_total, 0);

  insert into sales (
    invoice_no, branch_id, cashier_id, customer_id, customer_name, subtotal, discount, tax,
    total, total_cost, profit, paid_amount, change_amount, payment_method, payment_breakdown, notes
  ) values (
    v_invoice_no, p_branch_id, p_cashier_id, p_customer_id, p_customer_name, v_subtotal, coalesce(p_discount,0), coalesce(p_tax,0),
    v_total, v_total_cost, v_total - v_total_cost, v_paid, v_change, p_payment_method, p_payment_breakdown, p_notes
  ) returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    v_item_type := (v_item->>'item_type')::sale_item_type;

    insert into sale_items (sale_id, product_id, item_type, quantity, unit_price, unit_cost, discount, total)
    values (
      v_sale.id,
      (v_item->>'product_id')::uuid,
      v_item_type,
      v_qty,
      (v_item->>'unit_price')::numeric,
      (v_item->>'unit_cost')::numeric,
      coalesce((v_item->>'discount')::numeric, 0),
      (v_item->>'unit_price')::numeric * v_qty - coalesce((v_item->>'discount')::numeric, 0)
    );

    -- lock and fetch current stock row
    select * into v_stock_row from branch_inventory
      where branch_id = p_branch_id and product_id = (v_item->>'product_id')::uuid
      for update;

    if not found then
      insert into branch_inventory (branch_id, product_id, stock, loose_stock)
      values (p_branch_id, (v_item->>'product_id')::uuid, 0, 0)
      returning * into v_stock_row;
    end if;

    if v_item_type = 'loose' then
      v_stock_before := v_stock_row.loose_stock;
      v_stock_after := v_stock_before - v_qty::int;
      update branch_inventory set loose_stock = v_stock_after, updated_at = now()
        where id = v_stock_row.id;
    else
      v_stock_before := v_stock_row.stock;
      v_stock_after := v_stock_before - v_qty::int;
      update branch_inventory set stock = v_stock_after, updated_at = now()
        where id = v_stock_row.id;
    end if;

    insert into inventory_logs (
      branch_id, product_id, movement_type, quantity, stock_before, stock_after, reference_id, performed_by
    ) values (
      p_branch_id, (v_item->>'product_id')::uuid, 'sale', -v_qty::int, v_stock_before, v_stock_after, v_sale.id, p_cashier_id
    );
  end loop;

  insert into activity_logs (actor_id, branch_id, action, entity_type, entity_id)
  values (p_cashier_id, p_branch_id, 'Created Sale ' || v_invoice_no, 'sale', v_sale.id);

  return v_sale;
end;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. After running this, create your first Super Admin:
--    a) Sign up a user normally via Supabase Auth (or the app's /login -> sign up flow if enabled).
--    b) Run: update profiles set role = 'super_admin' where email = 'you@example.com';
-- 2. Managers MUST have a branch_id set on their profile — enforce this in the app UI.
-- 3. sale totals / profit / inventory decrement should be written via a single
--    Postgres function or app-level transaction (see src/services/sales.ts) to
--    keep branch_inventory, inventory_logs, sales and sale_items consistent.
