-- Apply in a new Supabase project. Only the current signed-in user owns a row.
begin;
create table public.duewise_cloud (
  user_id uuid primary key references auth.users(id) on delete cascade,
  protocol integer not null default 1 check (protocol = 1),
  revision bigint not null default 1 check (revision > 0),
  records jsonb not null default '{}'::jsonb check (jsonb_typeof(records) = 'object' and octet_length(records::text) <= 52428800),
  updated_at timestamptz not null default now()
);
alter table public.duewise_cloud enable row level security;
revoke all on public.duewise_cloud from public, anon, authenticated;
grant select on public.duewise_cloud to authenticated;
create policy own_cloud_read on public.duewise_cloud for select to authenticated using ((select auth.uid()) = user_id);

-- A compare-and-swap prevents a stale device overwriting a newer revision.
create function public.duewise_save(expected_revision bigint, new_records jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); result bigint;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  if expected_revision < 0 or jsonb_typeof(new_records) is distinct from 'object' or octet_length(new_records::text) > 52428800 then
    raise exception 'Invalid cloud payload';
  end if;
  if (select count(*) from jsonb_object_keys(new_records)) > 10000 then raise exception 'Too many reminders'; end if;
  if expected_revision = 0 then
    insert into public.duewise_cloud(user_id, revision, records) values (owner, 1, new_records)
    on conflict (user_id) do nothing returning revision into result;
  else
    update public.duewise_cloud set records = new_records, revision = revision + 1, updated_at = now()
    where user_id = owner and revision = expected_revision returning revision into result;
  end if;
  return result;
end;
$$;
revoke all on function public.duewise_save(bigint,jsonb) from public, anon;
grant execute on function public.duewise_save(bigint,jsonb) to authenticated;
commit;
