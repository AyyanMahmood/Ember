create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  business_name text not null default '',
  logo_url text,
  phone text,
  address text,
  country text,
  currency text not null default 'USD',
  invoice_brand_color text not null default '#3B82F6',
  invoice_footer text not null default 'Thank you for your business.',
  payment_instructions text not null default '',
  invoice_prefix text not null default 'INV',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists logo_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists currency text not null default 'USD';
alter table public.profiles add column if not exists payment_instructions text not null default '';
alter table public.profiles add column if not exists invoice_prefix text not null default 'INV';

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  company text,
  phone text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  invoice_number text not null,
  invoice_date date not null,
  due_date date not null,
  currency text not null default 'USD',
  subtotal numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  notes text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

alter table public.invoices add column if not exists discount_total numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists sent_at timestamptz;
alter table public.invoices add column if not exists paid_at timestamptz;

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  price numeric(12, 2) not null check (price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate >= 0),
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create or replace function public.create_invoice_with_items(
  p_invoice jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_user_id uuid := auth.uid();
  v_inserted_items integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one invoice item is required.';
  end if;

  insert into public.invoices (
    user_id,
    client_id,
    invoice_number,
    invoice_date,
    due_date,
    currency,
    subtotal,
    tax_total,
    discount_total,
    total,
    status,
    notes
  )
  values (
    v_user_id,
    (p_invoice ->> 'client_id')::uuid,
    nullif(p_invoice ->> 'invoice_number', ''),
    (p_invoice ->> 'invoice_date')::date,
    (p_invoice ->> 'due_date')::date,
    coalesce(nullif(p_invoice ->> 'currency', ''), 'USD'),
    coalesce(nullif(p_invoice ->> 'subtotal', '')::numeric, 0),
    coalesce(nullif(p_invoice ->> 'tax_total', '')::numeric, 0),
    coalesce(nullif(p_invoice ->> 'discount_total', '')::numeric, 0),
    coalesce(nullif(p_invoice ->> 'total', '')::numeric, 0),
    coalesce(nullif(p_invoice ->> 'status', ''), 'draft'),
    nullif(p_invoice ->> 'notes', '')
  )
  returning id into v_invoice_id;

  insert into public.invoice_items (
    invoice_id,
    description,
    quantity,
    price,
    tax_rate,
    position
  )
  select
    v_invoice_id,
    item.description,
    item.quantity,
    item.price,
    coalesce(item.tax_rate, 0),
    coalesce(item.position, (row_number() over ())::integer)
  from jsonb_to_recordset(p_items) as item(
    description text,
    quantity numeric,
    price numeric,
    tax_rate numeric,
    position integer
  );

  get diagnostics v_inserted_items = row_count;

  if v_inserted_items <> jsonb_array_length(p_items) then
    raise exception 'Every invoice item must be valid.';
  end if;

  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice_with_items(jsonb, jsonb) from public;
grant execute on function public.create_invoice_with_items(jsonb, jsonb) to authenticated;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD',
  payment_date date not null default current_date,
  method text not null default 'manual',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  template text not null,
  client_name text not null,
  title text not null,
  project_summary text not null,
  scope text not null,
  timeline text not null,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposals add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.proposals add column if not exists status text not null default 'draft';
alter table public.proposals add column if not exists valid_until date;

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  title text not null,
  description text,
  amount numeric(12, 2) not null default 0,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_yearly')),
  status text not null default 'active',
  billing_cycle text not null default 'free' check (billing_cycle in ('free', 'monthly', 'yearly')),
  paddle_customer_id text,
  paddle_subscription_id text unique,
  paddle_price_id text,
  paddle_product_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_created_at_idx on public.clients(created_at desc);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_created_at_idx on public.invoices(created_at desc);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
create index if not exists payments_payment_date_idx on public.payments(payment_date desc);
create index if not exists proposals_user_id_idx on public.proposals(user_id);
create index if not exists proposals_created_at_idx on public.proposals(created_at desc);
create index if not exists proposal_items_proposal_id_idx on public.proposal_items(proposal_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_paddle_customer_id_idx on public.subscriptions(paddle_customer_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at before update on public.proposals
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.user_has_pro(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = target_user_id
      and plan in ('pro_monthly', 'pro_yearly')
      and status in ('active', 'trialing', 'past_due')
  );
$$;

create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_count integer;
begin
  if public.user_has_pro(new.user_id) then
    return new;
  end if;

  select count(*) into client_count from public.clients where user_id = new.user_id;
  if client_count >= 10 then
    raise exception 'Free plan limit reached: upgrade to Pro for unlimited clients.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_invoice_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_count integer;
begin
  if public.user_has_pro(new.user_id) then
    return new;
  end if;

  select count(*) into invoice_count
  from public.invoices
  where user_id = new.user_id
    and created_at >= date_trunc('month', now());

  if invoice_count >= 5 then
    raise exception 'Free plan limit reached: upgrade to Pro for unlimited invoices.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_pro_feature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_has_pro(new.user_id) then
    raise exception 'This feature requires an active Pro subscription.';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_enforce_free_limit on public.clients;
create trigger clients_enforce_free_limit before insert on public.clients
for each row execute function public.enforce_client_limit();

drop trigger if exists invoices_enforce_free_limit on public.invoices;
create trigger invoices_enforce_free_limit before insert on public.invoices
for each row execute function public.enforce_invoice_limit();

drop trigger if exists proposals_enforce_pro_feature on public.proposals;
create trigger proposals_enforce_pro_feature before insert on public.proposals
for each row execute function public.enforce_pro_feature();

drop trigger if exists payments_enforce_pro_feature on public.payments;
create trigger payments_enforce_pro_feature before insert on public.payments
for each row execute function public.enforce_pro_feature();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();

  insert into public.subscriptions (user_id, plan, status, billing_cycle)
  values (new.id, 'free', 'active', 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.subscriptions (user_id, plan, status, billing_cycle)
select id, 'free', 'active', 'free' from public.profiles
on conflict (user_id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
