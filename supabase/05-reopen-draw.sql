-- Run once in Supabase SQL Editor. Installing this function changes no records.
-- Only an authorized organizer can reopen an event from the admin screen.
begin;
create or replace function public.gift_reopen(p_deadline timestamptz,p_budget integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform office_private.require_organizer();
  perform 1 from office_private.event where id=1 for update;
  if p_deadline is null or p_deadline <= clock_timestamp() then
    raise exception 'Gelecekte bir kapanış tarihi seçin.';
  end if;
  if p_budget is null or p_budget not between 1 and 1000000 then
    raise exception 'Bütçe 1 ile 1.000.000 TL arasında olmalı.';
  end if;
  update office_private.participants set recipient=null;
  update office_private.event set deadline=p_deadline,budget=p_budget,drawn=false where id=1;
  return public.gift_status();
end $$;
revoke all on function public.gift_reopen(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.gift_reopen(timestamptz,integer) to authenticated;
notify pgrst,'reload schema';
commit;
