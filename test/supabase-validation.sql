begin;
create function pg_temp.assert_ok(condition boolean,message text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create temporary table tokens(token text);
grant all on tokens to anon,authenticated;
insert into office_private.organizers values('00000000-0000-0000-0000-000000000001');

set role anon;
do $$begin
  perform public.gift_register('Too early'); raise exception 'Registration before configuration accepted';
exception when raise_exception then if sqlerrm <> 'Organizatör henüz çekiliş tarihini belirlemedi.' then raise; end if; end $$;
do $$begin
  perform count(*) from office_private.participants; raise exception 'Participant table exposed';
exception when insufficient_privilege then null; end $$;
do $$begin
  perform office_private.draw_if_due(); raise exception 'Internal function exposed';
exception when insufficient_privilege then null; end $$;
do $$begin
  perform public.gift_configure(now()+interval '10 minutes',1000); raise exception 'Anonymous administrator accepted';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000002"}';
do $$begin
  perform public.gift_admin_status(); raise exception 'Non-organizer login accepted';
exception when insufficient_privilege then null; end $$;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
select pg_temp.assert_ok(public.gift_admin_status()->>'count'='0','Organizer verified');
select public.gift_configure(now()+interval '10 minutes',1000);
reset role;

set role anon;
insert into tokens select public.gift_register('Participant '||i)->>'token' from generate_series(1,25) i;
insert into tokens select public.gift_register('İpek Yılmaz')->>'token';
do $$begin
  perform public.gift_register('ipek yılmaz'); raise exception 'Duplicate name accepted';
exception when raise_exception then if sqlerrm <> 'Bu isim zaten kayıtlı. Aynı isimdeyseniz ayırt edici bir ek kullanın.' then raise; end if; end $$;
select pg_temp.assert_ok((public.gift_status()->>'count')::integer=26,'All participants registered');
select pg_temp.assert_ok(public.gift_result(token)->'recipient'='null'::jsonb,'No early disclosure') from tokens;
do $$begin
  perform public.gift_result(repeat('x',43)); raise exception 'Invalid token accepted';
exception when raise_exception then if sqlerrm <> 'Kişisel bağlantı geçersiz.' then raise; end if; end $$;
reset role;
select pg_temp.assert_ok(not exists(select 1 from tokens t join office_private.participants p on p.token_hash=t.token),'Only token hashes stored');
update office_private.event set deadline=clock_timestamp()-interval '1 second';

set role anon;
do $$begin
  perform public.gift_register('Late participant'); raise exception 'Late registration accepted';
exception when raise_exception then if sqlerrm <> 'Kayıt süresi sona erdi.' then raise; end if; end $$;
select pg_temp.assert_ok(public.gift_status()->>'drawn'='true','Automatic draw');
select pg_temp.assert_ok(public.gift_result(token)->>'recipient' is not null,'Private card available') from tokens;
reset role;
select pg_temp.assert_ok(count(distinct recipient)=26,'Every recipient appears exactly once') from office_private.participants;
select pg_temp.assert_ok(not exists(select 1 from office_private.participants where id=recipient),'No self matches');
create temporary table original_matches as select id,recipient from office_private.participants;
select office_private.draw_if_due();
select pg_temp.assert_ok(not exists(select 1 from original_matches o join office_private.participants p using(id) where o.recipient<>p.recipient),'Results stable on repeat');

set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
do $$begin
  perform public.gift_configure(now()+interval '1 day',2000); raise exception 'Closed configuration changed';
exception when raise_exception then if sqlerrm <> 'Kapanmış çekilişin ayarları değiştirilemez.' then raise; end if; end $$;
reset role;
rollback;
select 'PASS: PostgreSQL privacy, organizer authorization, 26 registrations, deadline, unique derangement and result stability.';
