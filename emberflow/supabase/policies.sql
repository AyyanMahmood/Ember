alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner" on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner" on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Clients are viewable by owner" on public.clients;
create policy "Clients are viewable by owner" on public.clients for select
using (auth.uid() = user_id);

drop policy if exists "Clients are insertable by owner" on public.clients;
create policy "Clients are insertable by owner" on public.clients for insert
with check (auth.uid() = user_id);

drop policy if exists "Clients are updateable by owner" on public.clients;
create policy "Clients are updateable by owner" on public.clients for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Clients are deletable by owner" on public.clients;
create policy "Clients are deletable by owner" on public.clients for delete
using (auth.uid() = user_id);

drop policy if exists "Invoices are viewable by owner" on public.invoices;
create policy "Invoices are viewable by owner" on public.invoices for select
using (auth.uid() = user_id);

drop policy if exists "Invoices are insertable by owner" on public.invoices;
create policy "Invoices are insertable by owner" on public.invoices for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.clients
    where clients.id = invoices.client_id
      and clients.user_id = auth.uid()
  )
);

drop policy if exists "Invoices are updateable by owner" on public.invoices;
create policy "Invoices are updateable by owner" on public.invoices for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.clients
    where clients.id = invoices.client_id
      and clients.user_id = auth.uid()
  )
);

drop policy if exists "Invoices are deletable by owner" on public.invoices;
create policy "Invoices are deletable by owner" on public.invoices for delete
using (auth.uid() = user_id);

drop policy if exists "Invoice items are viewable by invoice owner" on public.invoice_items;
create policy "Invoice items are viewable by invoice owner" on public.invoice_items for select
using (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
  )
);

drop policy if exists "Invoice items are insertable by invoice owner" on public.invoice_items;
create policy "Invoice items are insertable by invoice owner" on public.invoice_items for insert
with check (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
  )
);

drop policy if exists "Invoice items are updateable by invoice owner" on public.invoice_items;
create policy "Invoice items are updateable by invoice owner" on public.invoice_items for update
using (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
  )
);

drop policy if exists "Invoice items are deletable by invoice owner" on public.invoice_items;
create policy "Invoice items are deletable by invoice owner" on public.invoice_items for delete
using (
  exists (
    select 1 from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
  )
);

drop policy if exists "Payments are viewable by owner" on public.payments;
create policy "Payments are viewable by owner" on public.payments for select
using (auth.uid() = user_id);

drop policy if exists "Payments are insertable by owner" on public.payments;
create policy "Payments are insertable by owner" on public.payments for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.invoices
    where invoices.id = payments.invoice_id
      and invoices.user_id = auth.uid()
  )
);

drop policy if exists "Payments are deletable by owner" on public.payments;
create policy "Payments are deletable by owner" on public.payments for delete
using (auth.uid() = user_id);

drop policy if exists "Proposals are viewable by owner" on public.proposals;
create policy "Proposals are viewable by owner" on public.proposals for select
using (auth.uid() = user_id);

drop policy if exists "Proposals are insertable by owner" on public.proposals;
create policy "Proposals are insertable by owner" on public.proposals for insert
with check (auth.uid() = user_id);

drop policy if exists "Proposals are updateable by owner" on public.proposals;
create policy "Proposals are updateable by owner" on public.proposals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Proposals are deletable by owner" on public.proposals;
create policy "Proposals are deletable by owner" on public.proposals for delete
using (auth.uid() = user_id);

drop policy if exists "Proposal items are viewable by proposal owner" on public.proposal_items;
create policy "Proposal items are viewable by proposal owner" on public.proposal_items for select
using (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items are insertable by proposal owner" on public.proposal_items;
create policy "Proposal items are insertable by proposal owner" on public.proposal_items for insert
with check (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items are deletable by proposal owner" on public.proposal_items;
create policy "Proposal items are deletable by proposal owner" on public.proposal_items for delete
using (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Subscriptions are viewable by owner" on public.subscriptions;
create policy "Subscriptions are viewable by owner" on public.subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "Logos are readable" on storage.objects;
create policy "Logos are readable" on storage.objects for select
using (bucket_id = 'logos');

drop policy if exists "Users can upload own logos" on storage.objects;
create policy "Users can upload own logos" on storage.objects for insert
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own logos" on storage.objects;
create policy "Users can update own logos" on storage.objects for update
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own logos" on storage.objects;
create policy "Users can delete own logos" on storage.objects for delete
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Avatars are readable" on storage.objects;
create policy "Avatars are readable" on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars" on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars" on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars" on storage.objects for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
