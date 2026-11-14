-- Run with psql against a disposable Supabase development project after the migration.
-- Everything is rolled back, including the two synthetic users.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','duewise-test-a@example.com'),
 ('22222222-2222-4222-8222-222222222222','duewise-test-b@example.com');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if public.duewise_save(0,'{}'::jsonb) is distinct from 1 then raise exception 'Initial CAS failed'; end if;
 if public.duewise_save(0,'{}'::jsonb) is not null then raise exception 'Stale insert allowed'; end if;
 if public.duewise_save(99,'{}'::jsonb) is not null then raise exception 'Stale update allowed'; end if;
 if public.duewise_save(1,'{}'::jsonb) is distinct from 2 then raise exception 'Revision update failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.duewise_cloud) then raise exception 'Cross-user data leak'; end if;
 if public.duewise_save(2,'{}'::jsonb) is not null then raise exception 'Cross-user write allowed'; end if;
 if public.duewise_save(0,'{}'::jsonb) is distinct from 1 then raise exception 'Second owner insert failed'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin
  perform public.duewise_save(0,'{}'::jsonb);
  raise exception 'Anonymous RPC allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
