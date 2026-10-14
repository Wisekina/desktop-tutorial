-- First create your organizer account in Authentication > Users > Add user.
-- Replace ONLY the example email below with that account's email.
-- Do not put a password here or commit your personal email to the repository.
do $$
declare organizer_id uuid;
begin
  select id into organizer_id from auth.users where lower(email)=lower('organizer@example.com');
  if organizer_id is null then raise exception 'Önce Authentication > Users bölümünde yönetici hesabını oluşturun ve bu dosyadaki örnek e-postayı değiştirin.'; end if;
  insert into office_private.organizers(user_id) values(organizer_id) on conflict do nothing;
end $$;
