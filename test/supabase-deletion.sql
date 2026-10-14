begin;
create function pg_temp.assert_delete(condition boolean,message text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
insert into office_private.organizers values('00000000-0000-0000-0000-000000000001');
create temporary table deletion_test(id uuid,token text);
grant all on deletion_test to anon,authenticated;
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
select public.gift_configure(now()+interval '10 minutes',1000);
reset role;
set role anon;
insert into deletion_test(token) select public.gift_register('Deletion fixture')->>'token';
do $$begin
  perform public.gift_admin_participants();raise exception 'Anonymous roster access';
exception when insufficient_privilege then null;end $$;
do $$begin
  perform public.gift_delete_registration(gen_random_uuid());raise exception 'Anonymous deletion access';
exception when insufficient_privilege then null;end $$;
reset role;
update deletion_test set id=(select id from office_private.participants where name='Deletion fixture');
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000002"}';
do $$begin
  perform public.gift_admin_participants();raise exception 'Non-organizer roster access';
exception when insufficient_privilege then null;end $$;
do $$begin
  perform public.gift_delete_registration((select id from deletion_test));raise exception 'Non-organizer deletion access';
exception when insufficient_privilege then null;end $$;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
select pg_temp.assert_delete(jsonb_array_length(public.gift_admin_participants()->'participants')=1,'Organizer sees roster');
select pg_temp.assert_delete(not (public.gift_admin_participants()->'participants'->0 ? 'token_hash'),'Roster does not leak token hashes');
select pg_temp.assert_delete(not (public.gift_admin_participants()->'participants'->0 ? 'recipient'),'Roster does not leak results');
select pg_temp.assert_delete(jsonb_array_length(public.gift_delete_registration((select id from deletion_test))->'participants')=0,'Organizer can delete');
reset role;
set role anon;
do $$begin
  perform public.gift_result((select token from deletion_test));raise exception 'Deleted token still valid';
exception when raise_exception then if sqlerrm <> 'Kişisel bağlantı geçersiz.' then raise;end if;end $$;
do $$begin perform public.gift_register('Deletion fixture'); perform public.gift_register('Other fixture'); end $$;
reset role;
update office_private.event set deadline=clock_timestamp()-interval '1 second';
set role authenticated;
set request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001"}';
select pg_temp.assert_delete(public.gift_admin_participants()->>'canDelete'='false','Deletion closed after deadline');
do $$begin
  perform public.gift_delete_registration((select (public.gift_admin_participants()->'participants'->0->>'id')::uuid));raise exception 'Post-draw deletion allowed';
exception when raise_exception then if sqlerrm <> 'Kayıtlar kapandıktan sonra silme yapılamaz.' then raise;end if;end $$;
reset role;
select pg_temp.assert_delete((select count(*)=2 from office_private.participants),'Drawn participants preserved');
rollback;
select 'PASS: Organizer-only roster/deletion, invalidated tokens, closed-event protection.';
