-- Phase 4a: waiting lobbies only. No quiz questions or answers are exposed.
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete set null,
  quiz_title text not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{6}$'),
  channel_id uuid not null default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting', 'ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours'),
  ended_at timestamptz
);
create unique index game_sessions_open_pin on public.game_sessions(pin) where status = 'waiting';
create unique index game_sessions_one_open_per_quiz on public.game_sessions(quiz_id) where status = 'waiting';
create index game_sessions_host_created on public.game_sessions(host_id, created_at desc);
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 24 and nickname !~ '[[:cntrl:]]'),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  unique (session_id, token_hash)
);
create unique index game_players_nickname_active on public.game_players(session_id, lower(btrim(nickname))) where left_at is null;
create index game_players_session_idx on public.game_players(session_id, joined_at);
create table public.lobby_join_limits (
  rate_key text not null check (rate_key ~ '^[0-9a-f]{64}$'),
  bucket bigint not null,
  attempts integer not null default 1,
  primary key (rate_key, bucket)
);
alter table public.game_sessions enable row level security;
alter table public.game_players enable row level security;
alter table public.lobby_join_limits enable row level security;
-- No direct client reads or writes: RPCs expose only authorized projections.
revoke all on public.game_sessions, public.game_players, public.lobby_join_limits from public, anon, authenticated;

create function public.lock_quiz_in_lobby() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.game_sessions where quiz_id = old.id and status = 'waiting' and expires_at > now()) then
    raise exception 'End the waiting lobby before editing or deleting this quiz';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger lock_quiz_in_lobby before update or delete on public.quizzes
for each row execute function public.lock_quiz_in_lobby();
revoke all on function public.lock_quiz_in_lobby() from public;

create function public.create_teacher_lobby(p_quiz_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare teacher_id uuid := auth.uid(); existing_id uuid; new_id uuid; new_pin text; quiz_title_value text; tries integer := 0;
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  -- Serialize quiz editing/deletion and lobby creation against the same row.
  select title into quiz_title_value from public.quizzes where id = p_quiz_id and owner_id = teacher_id and status = 'published' for update;
  if not found or not exists (select 1 from public.questions where quiz_id = p_quiz_id) then
    raise exception 'A published quiz with questions is required';
  end if;
  update public.game_sessions set status = 'ended', ended_at = now()
    where status = 'waiting' and expires_at <= now();
  select id into existing_id from public.game_sessions where quiz_id = p_quiz_id and status = 'waiting';
  if existing_id is not null then return jsonb_build_object('id', existing_id); end if;
  loop
    tries := tries + 1;
    if tries > 30 then raise exception 'Could not allocate a game PIN'; end if;
    new_pin := (100000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 900000))::text;
    begin
      insert into public.game_sessions (quiz_id, quiz_title, host_id, pin) values (p_quiz_id, quiz_title_value, teacher_id, new_pin) returning id into new_id;
      exit;
    exception when unique_violation then
      -- An active PIN collided. Generate another one.
    end;
  end loop;
  return jsonb_build_object('id', new_id);
end;
$$;
revoke all on function public.create_teacher_lobby(uuid) from public, anon;
grant execute on function public.create_teacher_lobby(uuid) to authenticated;

create function public.teacher_lobby_state(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; teacher_id uuid := auth.uid();
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select jsonb_build_object('id', s.id, 'code', s.pin, 'channelId', s.channel_id, 'title', s.quiz_title,
    'status', case when s.status = 'waiting' and s.expires_at <= now() then 'expired' else s.status end,
    'expiresAt', s.expires_at,
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname,
      'online', p.last_seen_at > now() - interval '45 seconds') order by p.joined_at)
      from public.game_players p where p.session_id = s.id and p.left_at is null), '[]'::jsonb))
    into result from public.game_sessions s
    where s.id = p_session_id and s.host_id = teacher_id;
  return result;
end;
$$;
revoke all on function public.teacher_lobby_state(uuid) from public, anon;
grant execute on function public.teacher_lobby_state(uuid) to authenticated;

create function public.end_teacher_lobby(p_session_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare teacher_id uuid := auth.uid(); ended_id uuid;
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.game_sessions set status = 'ended', ended_at = now() where id = p_session_id and host_id = teacher_id and status = 'waiting' returning id into ended_id;
  return ended_id is not null;
end;
$$;
revoke all on function public.end_teacher_lobby(uuid) from public, anon;
grant execute on function public.end_teacher_lobby(uuid) to authenticated;

-- Guest RPCs are service-role only. Student cookies never enter a browser
-- Supabase client; the server submits a one-way token hash over HTTPS.
create function public.join_guest_lobby(p_pin text, p_nickname text, p_token_hash text, p_rate_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; player_id uuid; player_active boolean; attempts_now integer; current_bucket bigint := floor(extract(epoch from now()) / 300)::bigint;
begin
  if coalesce(p_rate_key, '') !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error', 'unavailable'); end if;
  insert into public.lobby_join_limits(rate_key, bucket) values (p_rate_key, current_bucket)
    on conflict (rate_key, bucket) do update set attempts = public.lobby_join_limits.attempts + 1 returning attempts into attempts_now;
  if random() < 0.01 then delete from public.lobby_join_limits where bucket < current_bucket - 3; end if;
  if attempts_now > 120 then return jsonb_build_object('error', 'rate_limit'); end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$'
    or char_length(btrim(coalesce(p_nickname, ''))) not between 2 and 24 or coalesce(p_nickname, '') ~ '[[:cntrl:]]' then
    return jsonb_build_object('error', 'invalid');
  end if;
  select * into s from public.game_sessions where pin = p_pin and status = 'waiting' and expires_at > now() for update;
  if not found then return jsonb_build_object('error', 'unavailable'); end if;
  select id, left_at is null into player_id, player_active from public.game_players where session_id = s.id and token_hash = p_token_hash;
  if exists (select 1 from public.game_players where session_id = s.id and left_at is null
      and lower(btrim(nickname)) = lower(btrim(p_nickname)) and id is distinct from player_id) then
    return jsonb_build_object('error', 'nickname');
  end if;
  if coalesce(player_active, false) = false and (select count(*) from public.game_players where session_id = s.id and left_at is null) >= 100 then
    return jsonb_build_object('error', 'full');
  end if;
  if player_id is null then
    insert into public.game_players(session_id, nickname, token_hash) values (s.id, btrim(p_nickname), p_token_hash);
  else
    update public.game_players set nickname = btrim(p_nickname), last_seen_at = now(), left_at = null where id = player_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.join_guest_lobby(text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_guest_lobby(text, text, text, text) to service_role;

create function public.guest_lobby_state(p_pin text, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then return null; end if;
  select jsonb_build_object('code', s.pin, 'channelId', s.channel_id, 'title', s.quiz_title, 'nickname', me.nickname,
    'status', case when s.status = 'waiting' and s.expires_at <= now() then 'expired' else s.status end,
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname,
      'online', p.last_seen_at > now() - interval '45 seconds') order by p.joined_at)
      from public.game_players p where p.session_id = s.id and p.left_at is null), '[]'::jsonb))
    into result from public.game_sessions s
      join public.game_players me on me.session_id = s.id
    where s.pin = p_pin and me.token_hash = p_token_hash and me.left_at is null
    order by s.created_at desc limit 1;
  return result;
end;
$$;
revoke all on function public.guest_lobby_state(text, text) from public, anon, authenticated;
grant execute on function public.guest_lobby_state(text, text) to service_role;

create function public.touch_guest_lobby(p_pin text, p_token_hash text, p_leave boolean default false) returns boolean
language plpgsql security definer set search_path = '' as $$
declare player_id uuid;
begin
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.game_players p set last_seen_at = now(), left_at = case when p_leave then now() else null end
    from public.game_sessions s where p.session_id = s.id and s.pin = p_pin and p.token_hash = p_token_hash
      and p.left_at is null and s.status = 'waiting' and s.expires_at > now() returning p.id into player_id;
  return player_id is not null;
end;
$$;
revoke all on function public.touch_guest_lobby(text, text, boolean) from public, anon, authenticated;
grant execute on function public.touch_guest_lobby(text, text, boolean) to service_role;
