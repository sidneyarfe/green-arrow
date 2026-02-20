-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. INSTANCES
create table public.instances (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    url text not null,
    secret_key text not null,
    status text default 'idle',
    last_tested timestamptz,
    created_at timestamptz default now()
);

alter table public.instances enable row level security;

create policy "Users can see only their own instances" 
on public.instances for all 
using (auth.uid() = user_id);

-- 2. TEMPLATES
create table public.templates (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    assunto text not null,
    corpo text not null,
    created_at timestamptz default now()
);

alter table public.templates enable row level security;

create policy "Users can see only their own templates" 
on public.templates for all 
using (auth.uid() = user_id);

-- 3. LISTS
create table public.lists (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    created_at timestamptz default now()
);

alter table public.lists enable row level security;

create policy "Users can see only their own lists" 
on public.lists for all 
using (auth.uid() = user_id);

-- 4. LEADS
create table public.leads (
    id uuid default uuid_generate_v4() primary key,
    list_id uuid references public.lists(id) on delete cascade not null,
    nome text not null,
    email text not null,
    extra_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Users can see only their own leads through lists" 
on public.leads for all 
using (exists (
    select 1 from public.lists 
    where lists.id = leads.list_id 
    and lists.user_id = auth.uid()
));

-- 5. CAMPAIGNS
create table public.campaigns (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    config jsonb not null,
    status text default 'draft',
    stats jsonb default '{"total": 0, "sent": 0, "failed": 0, "pending": 0}'::jsonb,
    created_at timestamptz default now()
);

alter table public.campaigns enable row level security;

create policy "Users can see only their own campaigns" 
on public.campaigns for all 
using (auth.uid() = user_id);

-- AUTOMATIC UPDATED_AT (OPTIONAL)
-- We can add triggers if needed for updated_at columns.
