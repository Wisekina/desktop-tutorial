-- Run once in Supabase SQL Editor. Safe to rerun: existing registrations remain.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists office_private;
revoke all on schema office_private from public, anon, authenticated;

create table if not exists office_private.event (
  id integer primary key check (id = 1),
  deadline timestamptz,
  budget integer check (budget between 1 and 1000000),
  drawn boolean not null default false
);
insert into office_private.event(id) values (1) on conflict do nothing;
create table if not exists office_private.organizers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists office_private.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  normalized_name text generated always as (lower(translate(name, 'Iİ', 'ıi'))) stored unique,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  recipient uuid unique references office_private.participants(id),
  check (recipient is null or recipient <> id)
);
alter table office_private.event enable row level security;
alter table office_private.organizers enable row level security;
alter table office_private.participants enable row level security;
revoke all on all tables in schema office_private from public, anon, authenticated;

create or replace function office_private.random_below(n integer)
returns integer language plpgsql set search_path = '' as $$
declare bytes bytea; value bigint; cutoff bigint;
begin
  if n < 1 then raise exception 'Invalid random bound'; end if;
  cutoff := (4294967296 / n)::bigint * n;
  loop
    bytes := extensions.gen_random_bytes(4);
    value := get_byte(bytes,0)::bigint * 16777216 + get_byte(bytes,1)::bigint * 65536 + get_byte(bytes,2)::bigint * 256 + get_byte(bytes,3);
    exit when value < cutoff;
  end loop;
  return (value % n)::integer;
end $$;

create or replace function office_private.draw_if_due()
returns void language plpgsql security definer set search_path = '' as $$
declare event office_private.event; ids uuid[]; recipients uuid[]; n integer; i integer; j integer; temp uuid; valid boolean;
begin
  select * into event from office_private.event where id=1 for update;
  if event.deadline is null or event.drawn or clock_timestamp() < event.deadline then return; end if;
  select array_agg(id order by created_at,id) into ids from office_private.participants;
  n := coalesce(array_length(ids,1),0);
  if n < 2 then return; end if;
  loop
    recipients := ids;
    for i in reverse n..2 loop
      j := office_private.random_below(i) + 1;
      temp := recipients[i]; recipients[i] := recipients[j]; recipients[j] := temp;
    end loop;
    valid := true;
    for i in 1..n loop
      if ids[i] = recipients[i] then valid := false; exit; end if;
    end loop;
    exit when valid;
  end loop;
  for i in 1..n loop
    update office_private.participants set recipient=recipients[i] where id=ids[i];
  end loop;
  update office_private.event set drawn=true where id=1;
end $$;

create or replace function office_private.require_organizer()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from office_private.organizers where user_id=auth.uid()) then
    raise exception 'Yönetici erişimi gerekli.' using errcode='42501';
  end if;
end $$;

create or replace function public.gift_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare output jsonb;
begin
  perform office_private.draw_if_due();
  select jsonb_build_object('deadline',deadline,'budget',budget,'drawn',drawn,'count',(select count(*) from office_private.participants),'serverTime',floor(extract(epoch from clock_timestamp())*1000))
  into output from office_private.event where id=1;
  return output;
end $$;

create or replace function public.gift_register(p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare event office_private.event; clean_name text; token text;
begin
  select * into event from office_private.event where id=1 for update;
  if event.deadline is null then raise exception 'Organizatör henüz çekiliş tarihini belirlemedi.'; end if;
  if event.deadline <= clock_timestamp() then raise exception 'Kayıt süresi sona erdi.'; end if;
  clean_name := trim(regexp_replace(p_name,'\s+',' ','g'));
  if clean_name is null or length(clean_name) not between 2 and 80 or clean_name ~ '[[:cntrl:]]' then raise exception 'İsim 2–80 karakter olmalı.'; end if;
  token := rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'),'+/','-_'),'=');
  begin
    insert into office_private.participants(name,token_hash) values (clean_name,encode(extensions.digest(token,'sha256'),'hex'));
  exception when unique_violation then
    raise exception 'Bu isim zaten kayıtlı. Aynı isimdeyseniz ayırt edici bir ek kullanın.';
  end;
  return jsonb_build_object('token',token);
end $$;

create or replace function public.gift_result(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare output jsonb;
begin
  if p_token is null or length(p_token) not between 32 and 128 then raise exception 'Kişisel bağlantı geçersiz.'; end if;
  perform office_private.draw_if_due();
  select jsonb_build_object('name',p.name,'recipient',r.name) into output
  from office_private.participants p left join office_private.participants r on r.id=p.recipient
  where p.token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  if output is null then raise exception 'Kişisel bağlantı geçersiz.'; end if;
  return output;
end $$;

create or replace function public.gift_admin_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform office_private.require_organizer();
  return public.gift_status();
end $$;

create or replace function public.gift_configure(p_deadline timestamptz,p_budget integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare event office_private.event;
begin
  perform office_private.require_organizer();
  select * into event from office_private.event where id=1 for update;
  if event.drawn or event.deadline <= clock_timestamp() then raise exception 'Kapanmış çekilişin ayarları değiştirilemez.'; end if;
  if p_deadline is null or p_deadline <= clock_timestamp() then raise exception 'Gelecekte bir kapanış tarihi seçin.'; end if;
  if p_budget is null or p_budget not between 1 and 1000000 then raise exception 'Bütçe 1 ile 1.000.000 TL arasında olmalı.'; end if;
  update office_private.event set deadline=p_deadline,budget=p_budget where id=1;
  return public.gift_status();
end $$;

revoke all on all functions in schema office_private from public, anon, authenticated;
revoke all on function public.gift_status(), public.gift_register(text), public.gift_result(text), public.gift_admin_status(), public.gift_configure(timestamptz,integer) from public, anon, authenticated;
grant execute on function public.gift_status(), public.gift_register(text), public.gift_result(text) to anon, authenticated;
grant execute on function public.gift_admin_status(), public.gift_configure(timestamptz,integer) to authenticated;
notify pgrst, 'reload schema';

commit;
