-- Profiles, bookings, admin role assignment, RLS and realtime for the portfolio site.

-- Helpers live in a schema the Data API does not expose.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create policy "Users read own profile, admin reads all"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

-- Clients can read profiles but never write them; the trigger below is the only writer.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- ---------- Admin role assignment ----------
-- Admin is granted only once the address is confirmed, so an unconfirmed
-- signup using the admin email cannot claim the role.
create or replace function private.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_admin_email boolean :=
    lower(new.email) = 'ehabmontasser@gmail.com' and new.email_confirmed_at is not null;
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when is_admin_email then 'admin' else 'user' end)
  on conflict (id) do update
    set email = excluded.email,
        role = case when is_admin_email then 'admin' else public.profiles.role end;
  return new;
end;
$$;

revoke all on function private.handle_auth_user() from public;

create trigger on_auth_user_changed
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.handle_auth_user();

-- Backfill any users that existed before this migration.
insert into public.profiles (id, email, role)
select id, email,
       case when lower(email) = 'ehabmontasser@gmail.com' and email_confirmed_at is not null
            then 'admin' else 'user' end
from auth.users
where email is not null
on conflict (id) do nothing;

-- ---------- Bookings ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 100),
  email text not null check (char_length(email) <= 254 and position('@' in email) > 1),
  phone text not null check (phone ~ '^[+0-9 ()-]{7,20}$'),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index bookings_created_at_idx on public.bookings (created_at desc);

alter table public.bookings enable row level security;

create policy "Anyone can submit a booking"
  on public.bookings for insert
  to anon, authenticated
  with check (status = 'new');

create policy "Admin reads bookings"
  on public.bookings for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admin updates bookings"
  on public.bookings for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admin deletes bookings"
  on public.bookings for delete
  to authenticated
  using ((select private.is_admin()));

-- Visitors may only write the form fields; id, status and created_at use defaults.
revoke all on public.bookings from anon, authenticated;
grant insert (first_name, last_name, email, phone) on public.bookings to anon, authenticated;
grant select, delete on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.bookings;
