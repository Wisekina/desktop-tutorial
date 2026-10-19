begin;
create function pg_temp.check_reopen(ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Reopen assertion failed'; end if; end $$;
insert into office_private.organizers values('00000000-0000-0000-0000-000000000001');
create temporary table reopen_tokens(token text);
grant all on reopen_tokens to anon,authenticated;
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
select public.gift_configure(now()+interval '1 day',1000);
reset role;
set role anon;
insert into reopen_tokens select public.gift_register('Reopen Ada')->>'token';
insert into reopen_tokens select public.gift_register('Reopen Ece')->>'token';
do $$begin
  perform public.gift_reopen(now()+interval '2 days',2000); raise exception 'Anonymous reopen allowed';
exception when insufficient_privilege then null; end $$;
reset role;
update office_private.event set deadline=clock_timestamp()-interval '1 second';
select public.gift_status();
create temporary table original_participants as select id,name,token_hash,created_at from office_private.participants;
select pg_temp.check_reopen((select drawn from office_private.event));
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000002"}';
do $$begin
  perform public.gift_reopen(now()+interval '2 days',2000); raise exception 'Outsider reopen allowed';
exception when insufficient_privilege then null; end $$;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
do $$begin
  perform public.gift_reopen(now()-interval '1 day',2000); raise exception 'Past date allowed';
exception when raise_exception then if sqlerrm <> 'Gelecekte bir kapanış tarihi seçin.' then raise; end if; end $$;
do $$begin
  perform public.gift_reopen(now()+interval '2 days',0); raise exception 'Invalid budget allowed';
exception when raise_exception then if sqlerrm <> 'Bütçe 1 ile 1.000.000 TL arasında olmalı.' then raise; end if; end $$;
reset role;
select pg_temp.check_reopen((select drawn from office_private.event));
select pg_temp.check_reopen((select count(*)=2 from office_private.participants where recipient is not null));
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
select public.gift_reopen(now()+interval '2 days',2000);
reset role;
select pg_temp.check_reopen((select not drawn and budget=2000 from office_private.event));
select pg_temp.check_reopen((select count(*)=2 from office_private.participants where recipient is null));
select pg_temp.check_reopen(not exists(select * from original_participants except select id,name,token_hash,created_at from office_private.participants));
set role anon;
select pg_temp.check_reopen(public.gift_result(token)->>'recipient' is null) from reopen_tokens;
select public.gift_register('Reopen new member');
reset role;
update office_private.event set deadline=clock_timestamp()-interval '1 second';
select public.gift_status();
select pg_temp.check_reopen((select count(distinct recipient)=3 and bool_and(recipient<>id) from office_private.participants));
rollback;
select 'PASS: Reopen ACL, validation atomicity, retained records/tokens, revoked results and new draw.';
