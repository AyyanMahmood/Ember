--
-- PostgreSQL database dump
--

\restrict sR42XQkdLp379nMqynseWL7p3e0fqqUmKvBxFDidCRjXR2qRN1bSiYagSmbgxee

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: create_invoice_with_items(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_invoice_id uuid;
  v_user_id uuid := auth.uid();
  v_inserted_items integer;
  v_plan text;
  v_usage_month date := date_trunc('month', now())::date;
  v_invoice_count integer;
begin

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;


  select plan
  into v_plan
  from public.subscriptions
  where user_id = v_user_id
  limit 1;


  if coalesce(v_plan, 'free') = 'free' then

    insert into public.invoice_usage (
      user_id,
      usage_month,
      invoice_count
    )
    values (
      v_user_id,
      v_usage_month,
      0
    )
    on conflict (user_id, usage_month)
    do nothing;


    select invoice_count
    into v_invoice_count
    from public.invoice_usage
    where user_id = v_user_id
    and usage_month = v_usage_month
    for update;


    if v_invoice_count >= 5 then
      raise exception 'Free plan invoice limit reached.';
    end if;


    update public.invoice_usage
    set invoice_count = invoice_count + 1,
        updated_at = now()
    where user_id = v_user_id
    and usage_month = v_usage_month;

  end if;


  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
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
    nullif(p_invoice ->> 'invoice_number',''),
    (p_invoice ->> 'invoice_date')::date,
    (p_invoice ->> 'due_date')::date,
    coalesce(nullif(p_invoice ->> 'currency',''),'USD'),
    coalesce(nullif(p_invoice ->> 'subtotal','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'tax_total','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'discount_total','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'total','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'status',''),'draft'),
    nullif(p_invoice ->> 'notes','')
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
    coalesce(item.tax_rate,0),
    coalesce(item.position,row_number() over ())
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


ALTER FUNCTION public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) OWNER TO postgres;

--
-- Name: enforce_client_limit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_client_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_plan text;
  v_client_count integer;
begin

  select plan
  into v_plan
  from public.subscriptions
  where user_id = new.user_id
  limit 1;


  if coalesce(v_plan, 'free') = 'free' then

    select count(*)
    into v_client_count
    from public.clients
    where user_id = new.user_id;


    if v_client_count >= 10 then
      raise exception 'Free plan client limit reached.';
    end if;

  end if;


  return new;

end;
$$;


ALTER FUNCTION public.enforce_client_limit() OWNER TO postgres;

--
-- Name: enforce_proposals_pro_only(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_proposals_pro_only() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_plan text;
begin

  select plan
  into v_plan
  from public.subscriptions
  where user_id = new.user_id
  limit 1;

  if coalesce(v_plan, 'free') = 'free' then
    raise exception 'Pro subscription required for proposals.';
  end if;

  return new;

end;
$$;


ALTER FUNCTION public.enforce_proposals_pro_only() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    email,
    full_name
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();

  insert into public.subscriptions (
    user_id,
    plan,
    status
  )
  values (
    new.id,
    'free',
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text,
    phone text,
    country text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(12,2) NOT NULL,
    price numeric(12,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT invoice_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT invoice_items_tax_rate_check CHECK ((tax_rate >= (0)::numeric))
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoice_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    usage_month date NOT NULL,
    invoice_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invoice_usage OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    tax_total numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    discount_total numeric DEFAULT 0,
    notes text,
    sent_at timestamp with time zone,
    paid_at timestamp with time zone,
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text])))
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    user_id uuid,
    amount numeric DEFAULT 0,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    business_name text DEFAULT ''::text NOT NULL,
    invoice_brand_color text DEFAULT '#2563eb'::text NOT NULL,
    invoice_footer text DEFAULT 'Thank you for your business.'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    address text,
    phone text,
    country text,
    currency text DEFAULT 'USD'::text,
    payment_instructions text,
    invoice_prefix text DEFAULT 'INV'::text,
    logo_url text
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: proposal_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proposal_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    "position" integer
);


ALTER TABLE public.proposal_items OWNER TO postgres;

--
-- Name: proposals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template text NOT NULL,
    client_name text NOT NULL,
    title text NOT NULL,
    project_summary text NOT NULL,
    scope text NOT NULL,
    timeline text NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.proposals OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    plan text DEFAULT 'free'::text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, user_id, name, email, company, phone, country, notes, created_at, updated_at) FROM stdin;
febfdefb-5ea5-43cd-a2e5-90ad3db9837c	0bb882a5-b78d-434d-a963-09e7cb79262f	ayyan	ayyan@gmail.com	ayyan.inc	04267886885	pkr		2026-07-09 14:57:12.434459+00	2026-07-09 14:57:12.434459+00
975f4e95-8953-40cc-ac4e-94bfb7150459	0bb882a5-b78d-434d-a963-09e7cb79262f	AYYAN Mahmood	ayyanmahmood978@gmail.com	ember.inc	03267885883	Pakistan	very imp vip vlient\n	2026-07-14 08:18:27.377854+00	2026-07-14 08:18:27.377854+00
c738be39-5714-4204-8e70-76a862da27d7	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	Ayyan	ayyan@gmail.com	ayyan.inc	03267885884	Australia	Software Testers	2026-07-14 13:35:34.16394+00	2026-07-14 13:35:34.16394+00
e367f044-475d-405b-bb9f-fb87a7cf27cb	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	ddhhdh	jsjsjs@gnail.xom	jsjsjs	jzjsjsj	jzjsj	\n\n\n\n\n\n\n	2026-07-14 14:03:00.577472+00	2026-07-14 14:03:00.577472+00
7b77d397-882e-4f1c-914e-e6328ae5a3b9	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	hwnsjsj	ksjsjs@gmail.ckm	dmmsmsm	mmsmss	msmsjm		2026-07-14 14:03:39.023928+00	2026-07-14 14:03:39.023928+00
377936ae-e4a7-44cf-b932-29ea92b23cae	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	uendnddn	nendnd@gmail.com	jdndj	ndndjd	nsndj	ndndn	2026-07-14 14:03:55.637899+00	2026-07-14 14:03:55.637899+00
27ad41f8-cfbf-47fa-9976-aa450618a1d8	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	ejdhdh	i@gmaik.ckm	bddjjdj	jdndjd	jxndn		2026-07-14 14:04:11.708488+00	2026-07-14 14:04:11.708488+00
4b834d81-41bc-4a3c-b4ff-2ec18d337a41	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	Mahmood	mehmood@gmail.ckm	mehmood.inc	mehmoods number	pak		2026-07-14 14:04:48.920966+00	2026-07-14 14:04:48.920966+00
a7bb2943-272a-428c-a1b3-92bf0408c8d1	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	Ahmad Ali	bnda@gmail.clm	bnda	bnda	bnda		2026-07-14 14:05:06.707473+00	2026-07-14 14:05:06.707473+00
fd407e2f-799e-4384-b750-99003d8cc0f0	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	hi	hi@gnaik.com	n	n	n		2026-07-14 14:05:21.979866+00	2026-07-14 14:05:21.979866+00
ac0c26da-34fc-4ad7-934c-145c9d2c0c46	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	usman	usman@gmail.com	usman	usman	usman		2026-07-14 14:06:01.682973+00	2026-07-14 14:06:01.682973+00
8cc74c52-b452-462b-bb5d-33414d40aecf	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	b	h@gmaio.com	n	n			2026-07-14 14:06:35.030834+00	2026-07-14 14:06:35.030834+00
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, description, quantity, price, tax_rate, "position", created_at) FROM stdin;
9106a838-8a44-41d8-a979-fff236a9b532	b2d86cdc-288d-4142-af9e-ec6d44283777	h	5.00	690.00	10.00	1	2026-07-09 15:09:46.363853+00
fc0e9555-f7b7-4959-b69e-84d9d2035870	968ca536-a444-415d-ae48-b8f34c572b35	dd	90.00	200.00	20.00	1	2026-07-09 17:24:47.356546+00
3782e5f3-a7c0-45bc-9bba-137a8a11c433	6df0f8c5-e21b-4b8b-a591-112b62e13630	Charges Additionals added.	10.00	495.00	0.25	1	2026-07-14 08:21:20.168467+00
8286304d-7e5c-4fdf-ba7d-be05c5a9d29c	7158ab95-4352-4495-96c0-40fd477b82f7	h	1.00	200.00	0.00	1	2026-07-14 11:37:40.667932+00
e115d9aa-88e8-46bb-a959-6434c3277c1b	e2c161a7-9b09-4e44-9aff-14e42949ea23	s	4.00	15.00	0.25	1	2026-07-14 13:29:08.714432+00
eb0ea5a2-068e-4732-af6b-9ee27075c6d5	de8d7eec-7245-4513-84f5-a5a32f997ff6	s	4.00	15.00	0.25	1	2026-07-14 13:29:51.933137+00
21dc6d31-e4db-46e3-95a8-78909d9fd9b5	47844d4f-a64a-48fd-bb72-b88d73dcba9d	h	1.00	0.00	0.00	1	2026-07-14 13:48:07.88908+00
\.


--
-- Data for Name: invoice_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_usage (id, user_id, usage_month, invoice_count, created_at, updated_at) FROM stdin;
80e324dd-7145-4656-9e47-bcfa502e153d	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	2026-07-01	1	2026-07-14 13:48:07.88908+00	2026-07-14 13:48:07.88908+00
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, user_id, client_id, invoice_number, invoice_date, due_date, currency, subtotal, tax_total, total, status, created_at, updated_at, discount_total, notes, sent_at, paid_at) FROM stdin;
b2d86cdc-288d-4142-af9e-ec6d44283777	0bb882a5-b78d-434d-a963-09e7cb79262f	febfdefb-5ea5-43cd-a2e5-90ad3db9837c	INV-20260709-7578	2026-07-09	2026-07-23	USD	3450.00	345.00	3558.00	paid	2026-07-09 15:09:46.010565+00	2026-07-09 16:06:15.136668+00	237	nn	\N	2026-07-09 16:06:14.649+00
968ca536-a444-415d-ae48-b8f34c572b35	0bb882a5-b78d-434d-a963-09e7cb79262f	febfdefb-5ea5-43cd-a2e5-90ad3db9837c	Invoice for Landing Page	2026-07-09	2026-07-23	USD	18000.00	3600.00	21033.01	paid	2026-07-09 15:14:56.218813+00	2026-07-09 17:24:46.5281+00	566.99	fffff	\N	2026-07-09 15:15:50.258+00
de8d7eec-7245-4513-84f5-a5a32f997ff6	0bb882a5-b78d-434d-a963-09e7cb79262f	975f4e95-8953-40cc-ac4e-94bfb7150459	INV-20260714-1805	2026-07-14	2026-07-28	USD	60.00	0.15	0.00	paid	2026-07-14 13:29:51.637946+00	2026-07-14 13:29:55.494998+00	60.15	buhhahahah	\N	2026-07-14 13:29:45.721+00
47844d4f-a64a-48fd-bb72-b88d73dcba9d	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	c738be39-5714-4204-8e70-76a862da27d7	INV-20260714-2221	2026-07-14	2026-07-28	USD	0.00	0.00	0.00	draft	2026-07-14 13:48:07.88908+00	2026-07-14 13:48:07.88908+00	0	\N	\N	\N
e2c161a7-9b09-4e44-9aff-14e42949ea23	0bb882a5-b78d-434d-a963-09e7cb79262f	975f4e95-8953-40cc-ac4e-94bfb7150459	INV-20260714-1524	2026-07-14	2026-07-28	USD	60.00	0.15	0.00	paid	2026-07-14 13:29:08.334474+00	2026-07-14 18:15:59.994532+00	60.15	buhhahahah	\N	2026-07-14 18:15:59.096+00
7158ab95-4352-4495-96c0-40fd477b82f7	0bb882a5-b78d-434d-a963-09e7cb79262f	975f4e95-8953-40cc-ac4e-94bfb7150459	INV-20260714-6130	2026-07-14	2026-07-28	USD	200.00	0.00	200.00	paid	2026-07-14 11:37:40.667932+00	2026-07-14 18:16:01.925019+00	0	\N	\N	2026-07-14 18:16:01.03+00
6df0f8c5-e21b-4b8b-a591-112b62e13630	0bb882a5-b78d-434d-a963-09e7cb79262f	975f4e95-8953-40cc-ac4e-94bfb7150459	Invoice for Ember.inc	2026-10-22	2026-10-31	PKR	4950.00	12.38	4957.38	paid	2026-07-14 08:21:20.168467+00	2026-07-14 18:16:03.501284+00	5	Work will be completed in 4 days time. Thanks for choosing ember.inc.	\N	2026-07-14 18:16:02.629+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, invoice_id, user_id, amount, status, created_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, email, full_name, business_name, invoice_brand_color, invoice_footer, created_at, updated_at, avatar_url, address, phone, country, currency, payment_instructions, invoice_prefix, logo_url) FROM stdin;
50aeb62b-d817-4a1f-8cdb-4bff481d4a87	ayyanmahmood431@gmail.com	Ayyan		#2563eb	Thank you for your business.	2026-07-14 13:34:36.10757+00	2026-07-14 13:34:36.10757+00	\N	\N	\N	\N	USD	\N	INV	\N
0bb882a5-b78d-434d-a963-09e7cb79262f	ayyanmahmood978@gmail.com	Ayyan	guigif	#69ebd9	Thank you for your business.	2026-07-09 14:49:57.948023+00	2026-07-14 18:17:41.390953+00	https://rzwgbrwjrzapbagbksof.supabase.co/storage/v1/object/public/avatars/0bb882a5-b78d-434d-a963-09e7cb79262f/1784053038444.png	ffjfhj	120309393	vhjfchfghm jyjf	USD	vhkvkh	INV	
\.


--
-- Data for Name: proposal_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proposal_items (id, proposal_id, title, description, amount, created_at, updated_at, "position") FROM stdin;
1287ca47-bb83-489a-afae-f15641c33659	8cbc37af-e22d-469c-9e67-f99da5380d97	Discovery and architecture	Project goals, sitemap, and page planning.	750	2026-07-14 18:15:03.722421+00	2026-07-14 18:15:03.722421+00	1
f6acb760-b650-439c-9a21-5b482d95bab3	8cbc37af-e22d-469c-9e67-f99da5380d97	Design and build	Responsive frontend implementation and launch handoff.	2750	2026-07-14 18:15:03.722421+00	2026-07-14 18:15:03.722421+00	2
\.


--
-- Data for Name: proposals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proposals (id, user_id, template, client_name, title, project_summary, scope, timeline, amount, currency, created_at, updated_at) FROM stdin;
c962e882-a042-4a11-bdf4-49e3620032ef	0bb882a5-b78d-434d-a963-09e7cb79262f	Website development	Ayyani bhai	Website build proposal	A responsive, conversion-focused website designed to present the brand clearly and generate leads.	Discovery, site architecture, visual design, responsive frontend build, CMS handoff, launch support.	4 weeks	3500.00	USD	2026-07-14 16:50:56.643054+00	2026-07-14 16:50:56.643054+00
31774aa1-879a-4d4d-85ff-a189b0b76b4b	0bb882a5-b78d-434d-a963-09e7cb79262f	Website development	Sultan Mehmed Ayyan Mahmood Ahmad Han	Web-Design Proposal	A responsive, conversion-focused website designed to present the brand clearly and generate leads.	Discovery, site architecture, visual design, responsive frontend build, CMS handoff, launch support.	4 weeks	4500.00	USD	2026-07-14 17:50:28.347628+00	2026-07-14 17:50:28.347628+00
08f71e02-ecf1-4605-9ef3-bfe1c6f45f16	0bb882a5-b78d-434d-a963-09e7cb79262f	Website development	Sultan Mehmed Ayyan Mahmood Ahmad Han	Web-Design Proposal	A responsive, conversion-focused website designed to present the brand clearly and generate leads.	Discovery, site architecture, visual design, responsive frontend build, CMS handoff, launch support.	4 weeks	4500.00	USD	2026-07-14 18:10:04.728607+00	2026-07-14 18:10:04.728607+00
8cbc37af-e22d-469c-9e67-f99da5380d97	0bb882a5-b78d-434d-a963-09e7cb79262f	Website development	hh	Website build proposal	A responsive, conversion-focused website designed to present the brand clearly and generate leads.	Discovery, site architecture, visual design, responsive frontend build, CMS handoff, launch support.	4 weeks	3500.00	USD	2026-07-14 18:15:03.430647+00	2026-07-14 18:15:03.430647+00
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, plan, status, created_at, updated_at) FROM stdin;
e64fa558-29e2-49a6-bbe0-fab34476f45c	0bb882a5-b78d-434d-a963-09e7cb79262f	pro_monthly	active	2026-07-14 10:38:41.067933+00	2026-07-14 10:38:41.067933+00
4401b2d8-30d8-4fb1-a524-a890201068a1	50aeb62b-d817-4a1f-8cdb-4bff481d4a87	free	active	2026-07-14 13:34:36.10757+00	2026-07-14 13:34:36.10757+00
\.


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_usage invoice_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_usage
    ADD CONSTRAINT invoice_usage_pkey PRIMARY KEY (id);


--
-- Name: invoice_usage invoice_usage_user_id_usage_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_usage
    ADD CONSTRAINT invoice_usage_user_id_usage_month_key UNIQUE (user_id, usage_month);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_user_id_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_invoice_number_key UNIQUE (user_id, invoice_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: proposal_items proposal_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: clients_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clients_created_at_idx ON public.clients USING btree (created_at DESC);


--
-- Name: clients_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clients_user_id_idx ON public.clients USING btree (user_id);


--
-- Name: invoice_items_invoice_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoice_items_invoice_id_idx ON public.invoice_items USING btree (invoice_id);


--
-- Name: invoices_client_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_client_id_idx ON public.invoices USING btree (client_id);


--
-- Name: invoices_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_created_at_idx ON public.invoices USING btree (created_at DESC);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: invoices_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_user_id_idx ON public.invoices USING btree (user_id);


--
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- Name: proposals_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX proposals_created_at_idx ON public.proposals USING btree (created_at DESC);


--
-- Name: proposals_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX proposals_user_id_idx ON public.proposals USING btree (user_id);


--
-- Name: subscriptions_user_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX subscriptions_user_id_unique ON public.subscriptions USING btree (user_id);


--
-- Name: clients clients_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: clients enforce_client_limit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER enforce_client_limit_trigger BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.enforce_client_limit();


--
-- Name: proposals enforce_proposals_pro_only_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER enforce_proposals_pro_only_trigger BEFORE INSERT ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.enforce_proposals_pro_only();


--
-- Name: invoices invoices_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: proposals proposals_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER proposals_set_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_usage invoice_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_usage
    ADD CONSTRAINT invoice_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: proposal_items proposal_items_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: clients Clients are deletable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients are deletable by owner" ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clients Clients are insertable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients are insertable by owner" ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clients Clients are updateable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients are updateable by owner" ON public.clients FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: clients Clients are viewable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients are viewable by owner" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invoice_items Invoice items are deletable by invoice owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoice items are deletable by invoice owner" ON public.invoice_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_items Invoice items are insertable by invoice owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoice items are insertable by invoice owner" ON public.invoice_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_items Invoice items are updateable by invoice owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoice items are updateable by invoice owner" ON public.invoice_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoice_items Invoice items are viewable by invoice owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoice items are viewable by invoice owner" ON public.invoice_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid())))));


--
-- Name: invoices Invoices are deletable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoices are deletable by owner" ON public.invoices FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: invoices Invoices are insertable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoices are insertable by owner" ON public.invoices FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = invoices.client_id) AND (clients.user_id = auth.uid()))))));


--
-- Name: invoices Invoices are updateable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoices are updateable by owner" ON public.invoices FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = invoices.client_id) AND (clients.user_id = auth.uid()))))));


--
-- Name: invoices Invoices are viewable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Invoices are viewable by owner" ON public.invoices FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Profiles are insertable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles are insertable by owner" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Profiles are updateable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles are updateable by owner" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Profiles are viewable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: proposal_items Proposal items deletable by active pro users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposal items deletable by active pro users" ON public.proposal_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.proposals
     JOIN public.subscriptions ON ((subscriptions.user_id = proposals.user_id)))
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid()) AND (subscriptions.plan = ANY (ARRAY['pro_monthly'::text, 'pro_yearly'::text])) AND (subscriptions.status = ANY (ARRAY['active'::text, 'trialing'::text]))))));


--
-- Name: proposal_items Proposal items insertable by proposal owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposal items insertable by proposal owner" ON public.proposal_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.proposals
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid())))));


--
-- Name: proposal_items Proposal items updateable by active pro users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposal items updateable by active pro users" ON public.proposal_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.proposals
     JOIN public.subscriptions ON ((subscriptions.user_id = proposals.user_id)))
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid()) AND (subscriptions.plan = ANY (ARRAY['pro_monthly'::text, 'pro_yearly'::text])) AND (subscriptions.status = ANY (ARRAY['active'::text, 'trialing'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.proposals
     JOIN public.subscriptions ON ((subscriptions.user_id = proposals.user_id)))
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid()) AND (subscriptions.plan = ANY (ARRAY['pro_monthly'::text, 'pro_yearly'::text])) AND (subscriptions.status = ANY (ARRAY['active'::text, 'trialing'::text]))))));


--
-- Name: proposal_items Proposal items viewable by proposal owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposal items viewable by proposal owner" ON public.proposal_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.proposals
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid())))));


--
-- Name: proposals Proposals are deletable by active pro users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposals are deletable by active pro users" ON public.proposals FOR DELETE USING (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.subscriptions
  WHERE ((subscriptions.user_id = auth.uid()) AND (subscriptions.plan = ANY (ARRAY['pro_monthly'::text, 'pro_yearly'::text])) AND (subscriptions.status = ANY (ARRAY['active'::text, 'trialing'::text])))))));


--
-- Name: proposals Proposals are insertable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposals are insertable by owner" ON public.proposals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: proposals Proposals are updateable by active pro users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposals are updateable by active pro users" ON public.proposals FOR UPDATE USING (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.subscriptions
  WHERE ((subscriptions.user_id = auth.uid()) AND (subscriptions.plan = ANY (ARRAY['pro_monthly'::text, 'pro_yearly'::text])) AND (subscriptions.status = ANY (ARRAY['active'::text, 'trialing'::text]))))))) WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.subscriptions
  WHERE ((subscriptions.user_id = auth.uid()) AND (subscriptions.plan = ANY (ARRAY['pro_monthly'::text, 'pro_yearly'::text])) AND (subscriptions.status = ANY (ARRAY['active'::text, 'trialing'::text])))))));


--
-- Name: proposals Proposals are viewable by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Proposals are viewable by owner" ON public.proposals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: invoice_usage Users can create their own invoice usage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own invoice usage" ON public.invoice_usage FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoice_usage Users can update their own invoice usage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own invoice usage" ON public.invoice_usage FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoice_usage Users can view their own invoice usage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own invoice usage" ON public.invoice_usage FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view their own subscription; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_usage; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoice_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

--
-- Name: proposals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION create_invoice_with_items(p_invoice jsonb, p_items jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) TO anon;
GRANT ALL ON FUNCTION public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) TO service_role;


--
-- Name: FUNCTION enforce_client_limit(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_client_limit() TO anon;
GRANT ALL ON FUNCTION public.enforce_client_limit() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_client_limit() TO service_role;


--
-- Name: FUNCTION enforce_proposals_pro_only(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_proposals_pro_only() TO anon;
GRANT ALL ON FUNCTION public.enforce_proposals_pro_only() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_proposals_pro_only() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;


--
-- Name: TABLE invoice_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoice_items TO anon;
GRANT ALL ON TABLE public.invoice_items TO authenticated;
GRANT ALL ON TABLE public.invoice_items TO service_role;


--
-- Name: TABLE invoice_usage; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoice_usage TO anon;
GRANT ALL ON TABLE public.invoice_usage TO authenticated;
GRANT ALL ON TABLE public.invoice_usage TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE proposal_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.proposal_items TO anon;
GRANT ALL ON TABLE public.proposal_items TO authenticated;
GRANT ALL ON TABLE public.proposal_items TO service_role;


--
-- Name: TABLE proposals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.proposals TO anon;
GRANT ALL ON TABLE public.proposals TO authenticated;
GRANT ALL ON TABLE public.proposals TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict sR42XQkdLp379nMqynseWL7p3e0fqqUmKvBxFDidCRjXR2qRN1bSiYagSmbgxee

