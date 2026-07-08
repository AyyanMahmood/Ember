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
  invoice_brand_color text not null default '#2563eb',
  invoice_footer text not null default 'Thank you for your business.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  total numeric(12, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

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

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null,
  client_name text not null,
  title text not null,
  project_summary text not null,
  scope text not null,
  timeline text not null,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
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
create index if not exists proposals_user_id_idx on public.proposals(user_id);
create index if not exists proposals_created_at_idx on public.proposals(created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
before update on public.proposals
for each row execute function public.set_updated_at();

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
        full_name = excluded.full_name,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
