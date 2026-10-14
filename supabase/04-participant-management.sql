-- Add organizer-only participant listing and deletion. Existing records remain.
-- Run in Supabase SQL Editor AFTER 01-setup.sql and 02-organizer.sql.
begin;
create or replace function public.gift_admin_participants()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare output jsonb; event office_private.event;
begin
  perform office_private.require_organizer();
  perform office_private.draw_if_due();
  select * into event from office_private.event where id=1;
  select jsonb_build_object(
    'participants',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'created_at',created_at) order by created_at,id),'[]'::jsonb),
    'canDelete',not event.drawn and (event.deadline is null or event.deadline>clock_timestamp())
  ) into output from office_private.participants;
  return output;
end $$;

create or replace function public.gift_delete_registration(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare event office_private.event;
begin
  perform office_private.require_organizer();
  select * into event from office_private.event where id=1 for update;
  if event.drawn or event.deadline<=clock_timestamp() then
    raise exception 'Kayıtlar kapandıktan sonra silme yapılamaz.';
  end if;
  delete from office_private.participants where id=p_id;
  if not found then raise exception 'Kayıt bulunamadı.'; end if;
  return public.gift_admin_participants();
end $$;

revoke all on function public.gift_admin_participants(),public.gift_delete_registration(uuid) from public,anon,authenticated;
grant execute on function public.gift_admin_participants(),public.gift_delete_registration(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
