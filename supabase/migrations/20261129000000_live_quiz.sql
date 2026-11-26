-- Phase 4b: server-owned quiz snapshots, progression, answers, and results.
alter table public.game_sessions drop constraint game_sessions_status_check;
alter table public.game_sessions add constraint game_sessions_status_check check (status in ('waiting', 'question', 'reveal', 'finished', 'ended'));
alter table public.game_sessions add column current_question integer;
alter table public.game_sessions add column question_started_at timestamptz;
alter table public.game_sessions add column question_closes_at timestamptz;
alter table public.game_sessions add column started_at timestamptz;
alter table public.game_sessions add column finished_at timestamptz;
alter table public.game_sessions add column finish_reason text check (finish_reason in ('completed', 'stopped'));
alter table public.game_players add column participating boolean not null default false;
alter table public.game_players add constraint game_players_id_session_unique unique (id, session_id);
drop index public.game_sessions_open_pin;
drop index public.game_sessions_one_open_per_quiz;
create unique index game_sessions_open_pin on public.game_sessions(pin) where status in ('waiting', 'question', 'reveal');
create unique index game_sessions_one_open_per_quiz on public.game_sessions(quiz_id) where status in ('waiting', 'question', 'reveal');

create table public.game_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  position integer not null check (position between 0 and 49),
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null,
  time_limit integer not null check (time_limit between 5 and 300),
  points integer not null check (points between 0 and 10000),
  unique (session_id, position), unique (id, session_id)
);
create table public.game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id uuid not null,
  question_id uuid not null,
  selected_index integer not null check (selected_index between 0 and 3),
  is_correct boolean not null,
  points_awarded integer not null check (points_awarded >= 0),
  answered_at timestamptz not null default now(),
  foreign key (player_id, session_id) references public.game_players(id, session_id) on delete cascade,
  foreign key (question_id, session_id) references public.game_session_questions(id, session_id) on delete cascade,
  unique (player_id, question_id)
);
create index game_answers_session_question_idx on public.game_answers(session_id, question_id);
create table public.game_results (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id uuid not null,
  nickname text not null,
  score integer not null,
  correct_count integer not null,
  incorrect_count integer not null,
  unanswered_count integer not null,
  created_at timestamptz not null default now(),
  primary key (session_id, player_id),
  foreign key (player_id, session_id) references public.game_players(id, session_id) on delete cascade
);
alter table public.game_session_questions enable row level security;
alter table public.game_answers enable row level security;
alter table public.game_results enable row level security;
revoke all on public.game_session_questions, public.game_answers, public.game_results from public, anon, authenticated;

-- Preserve quiz integrity while the host has an active session. Snapshots also
-- keep completed-game history independent of later quiz edits or deletion.
create or replace function public.lock_quiz_in_lobby() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.game_sessions where quiz_id = old.id and status in ('waiting', 'question', 'reveal') and expires_at > now()) then
    raise exception 'End the waiting lobby or active game before editing or deleting this quiz';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Internal helper; callers must already hold the session row lock. All result
-- totals are calculated from recorded server-validated answers in one transaction.
create function public.finalize_game_internal(p_session_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare total_questions integer;
begin
  if p_reason not in ('completed', 'stopped') then raise exception 'Invalid finish reason'; end if;
  select count(*) into total_questions from public.game_session_questions where session_id = p_session_id;
  insert into public.game_results (session_id, player_id, nickname, score, correct_count, incorrect_count, unanswered_count)
    select p_session_id, p.id, p.nickname, coalesce(sum(a.points_awarded), 0)::integer,
      count(a.id) filter (where a.is_correct)::integer, count(a.id) filter (where not a.is_correct)::integer,
      total_questions - count(a.id)::integer
    from public.game_players p left join public.game_answers a on a.session_id = p.session_id and a.player_id = p.id
    where p.session_id = p_session_id and p.participating group by p.id, p.nickname
    on conflict (session_id, player_id) do nothing;
  update public.game_sessions set status = 'finished', finished_at = clock_timestamp(), ended_at = clock_timestamp(), finish_reason = p_reason
    where id = p_session_id;
end;
$$;
revoke all on function public.finalize_game_internal(uuid, text) from public, anon, authenticated;

-- Resuming an existing active game is idempotent. Expired sessions for this
-- quiz are finalized/released before allocating a fresh lobby.
create or replace function public.create_teacher_lobby(p_quiz_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare teacher_id uuid := auth.uid(); existing public.game_sessions%rowtype; new_id uuid; new_pin text; quiz_title_value text; tries integer := 0;
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select title into quiz_title_value from public.quizzes where id = p_quiz_id and owner_id = teacher_id and status = 'published' for update;
  if not found or not exists (select 1 from public.questions where quiz_id = p_quiz_id) then raise exception 'A published quiz with questions is required'; end if;
  select * into existing from public.game_sessions where quiz_id = p_quiz_id and status in ('waiting', 'question', 'reveal') for update;
  if found then
    if existing.expires_at > clock_timestamp() then return jsonb_build_object('id', existing.id); end if;
    if existing.status = 'waiting' then update public.game_sessions set status = 'ended', ended_at = clock_timestamp() where id = existing.id;
    else perform public.finalize_game_internal(existing.id, 'stopped'); end if;
  end if;
  -- Release expired waiting PINs. Expired active games are finalized when the
  -- owning teacher resumes or ends them; their PINs are never reused early.
  update public.game_sessions set status = 'ended', ended_at = clock_timestamp() where status = 'waiting' and expires_at <= clock_timestamp();
  loop
    tries := tries + 1;
    if tries > 30 then raise exception 'Could not allocate a game PIN'; end if;
    new_pin := (100000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 900000))::text;
    begin
      insert into public.game_sessions (quiz_id, quiz_title, host_id, pin) values (p_quiz_id, quiz_title_value, teacher_id, new_pin) returning id into new_id;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('id', new_id);
end;
$$;

create function public.teacher_game_command(p_session_id uuid, p_command text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare teacher_id uuid := auth.uid(); s public.game_sessions%rowtype; total integer; next_limit integer; q public.game_session_questions%rowtype;
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into s from public.game_sessions where id = p_session_id and host_id = teacher_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p_command not in ('start', 'reveal', 'next', 'end') then return jsonb_build_object('error', 'invalid'); end if;
  if p_command = 'end' then
    if s.status = 'waiting' then update public.game_sessions set status = 'ended', ended_at = clock_timestamp() where id = s.id;
    elsif s.status in ('question', 'reveal') then perform public.finalize_game_internal(s.id, 'stopped');
    else return jsonb_build_object('error', 'invalid_state'); end if;
    return jsonb_build_object('ok', true);
  end if;
  if s.expires_at <= clock_timestamp() then return jsonb_build_object('error', 'expired'); end if;
  if p_command = 'start' then
    if s.status <> 'waiting' then return jsonb_build_object('error', 'invalid_state'); end if;
    if not exists (select 1 from public.quizzes where id = s.quiz_id and owner_id = teacher_id and status = 'published') then return jsonb_build_object('error', 'quiz_unavailable'); end if;
    -- Lock active player rows before snapshotting, so a concurrent leave
    -- cannot start a game with no participants.
    update public.game_players set participating = true where session_id = s.id and left_at is null;
    get diagnostics total = row_count;
    if total = 0 then return jsonb_build_object('error', 'no_players'); end if;
    -- Snapshot only a complete four-option quiz. These rows are private and
    -- never returned directly to guests or sent over Realtime.
    insert into public.game_session_questions (session_id, position, question_text, options, correct_index, explanation, time_limit, points)
      select s.id, qn.position, qn.question_text, jsonb_agg(to_jsonb(o.option_text) order by o.position),
        max(o.position) filter (where o.is_correct), qn.explanation, qn.time_limit, qn.points
      from public.questions qn join public.answer_options o on o.question_id = qn.id
      where qn.quiz_id = s.quiz_id group by qn.id having count(*) = 4 and count(*) filter (where o.is_correct) = 1
      order by qn.position;
    select count(*) into total from public.game_session_questions where session_id = s.id;
    if total = 0 or total <> (select count(*) from public.questions where quiz_id = s.quiz_id) then raise exception 'Invalid quiz questions'; end if;
    select * into q from public.game_session_questions where session_id = s.id and position = 0;
    if not found then raise exception 'Invalid question order'; end if;
    update public.game_sessions set status = 'question', current_question = 0, started_at = clock_timestamp(),
      question_started_at = clock_timestamp(), question_closes_at = clock_timestamp() + make_interval(secs => q.time_limit) where id = s.id;
    return jsonb_build_object('ok', true);
  elsif p_command = 'reveal' then
    if s.status <> 'question' then return jsonb_build_object('error', 'invalid_state'); end if;
    update public.game_sessions set status = 'reveal', question_closes_at = least(question_closes_at, clock_timestamp()) where id = s.id;
    return jsonb_build_object('ok', true);
  elsif p_command = 'next' then
    if s.status <> 'reveal' then return jsonb_build_object('error', 'invalid_state'); end if;
    select time_limit into next_limit from public.game_session_questions where session_id = s.id and position = s.current_question + 1;
    if not found then perform public.finalize_game_internal(s.id, 'completed');
    else update public.game_sessions set status = 'question', current_question = s.current_question + 1,
      question_started_at = clock_timestamp(), question_closes_at = clock_timestamp() + make_interval(secs => next_limit) where id = s.id; end if;
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('error', 'invalid');
end;
$$;
revoke all on function public.teacher_game_command(uuid, text) from public, anon;
grant execute on function public.teacher_game_command(uuid, text) to authenticated;

-- A sanitized, internal projection: never returns future questions or correct
-- answers/explanations during the question state. Guest identity is verified by
-- the wrappers before they call it; it cannot be called directly by clients.
create function public.game_view_internal(p_session_id uuid, p_player_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; visible_status text; result jsonb; question_data jsonb; ranking jsonb; q public.game_session_questions%rowtype; own_answer integer; own_score integer;
begin
  select * into s from public.game_sessions where id = p_session_id;
  if not found then return null; end if;
  visible_status := case when s.status in ('waiting', 'question', 'reveal') and s.expires_at <= clock_timestamp() then 'expired' else s.status end;
  result := jsonb_build_object('id', s.id, 'code', s.pin, 'channelId', s.channel_id, 'title', s.quiz_title,
    'status', visible_status, 'expiresAt', s.expires_at, 'serverNow', clock_timestamp(), 'finishReason', s.finish_reason,
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nickname', p.nickname,
      'online', p.left_at is null and p.last_seen_at > clock_timestamp() - interval '45 seconds') order by p.joined_at)
      from public.game_players p where p.session_id = s.id and (case when s.started_at is null then p.left_at is null else p.participating end)), '[]'::jsonb));
  if p_player_id is not null then
    select coalesce(sum(a.points_awarded), 0)::integer into own_score from public.game_answers a
      join public.game_session_questions sq on sq.id = a.question_id
      where a.session_id = s.id and a.player_id = p_player_id and (s.status <> 'question' or sq.position < s.current_question);
    result := result || jsonb_build_object('score', own_score);
  end if;
  if visible_status in ('question', 'reveal') then
    select * into q from public.game_session_questions where session_id = s.id and position = s.current_question;
    if found then
      select selected_index into own_answer from public.game_answers where question_id = q.id and player_id = p_player_id;
      question_data := jsonb_build_object('index', q.position, 'total', (select count(*) from public.game_session_questions where session_id = s.id),
        'text', q.question_text, 'options', q.options, 'points', q.points, 'closesAt', s.question_closes_at,
        'canAnswer', visible_status = 'question' and clock_timestamp() < s.question_closes_at,
        'answerCount', (select count(*) from public.game_answers where question_id = q.id));
      if p_player_id is not null then question_data := question_data || jsonb_build_object('selectedIndex', own_answer); end if;
      if visible_status = 'reveal' then question_data := question_data || jsonb_build_object('correctIndex', q.correct_index, 'explanation', q.explanation); end if;
      result := result || jsonb_build_object('question', question_data);
    end if;
  end if;
  if visible_status in ('reveal', 'finished') then
    if visible_status = 'finished' then
      select coalesce(jsonb_agg(jsonb_build_object('id', r.player_id, 'nickname', r.nickname, 'score', r.score,
        'correct', r.correct_count, 'incorrect', r.incorrect_count, 'unanswered', r.unanswered_count) order by r.score desc, lower(r.nickname), r.player_id), '[]'::jsonb)
        into ranking from public.game_results r where r.session_id = s.id;
    else
      select coalesce(jsonb_agg(jsonb_build_object('id', ranked.id, 'nickname', ranked.nickname, 'score', ranked.score) order by ranked.score desc, lower(ranked.nickname), ranked.id), '[]'::jsonb)
      into ranking from (select p.id, p.nickname, coalesce(sum(a.points_awarded), 0)::integer as score
        from public.game_players p left join public.game_answers a on a.session_id = p.session_id and a.player_id = p.id
        where p.session_id = s.id and p.participating group by p.id, p.nickname) ranked;
    end if;
    result := result || jsonb_build_object('leaderboard', ranking);
  end if;
  return result;
end;
$$;
revoke all on function public.game_view_internal(uuid, uuid) from public, anon, authenticated, service_role;

create or replace function public.teacher_lobby_state(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare teacher_id uuid := auth.uid();
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.game_sessions where id = p_session_id and host_id = teacher_id) then return null; end if;
  return public.game_view_internal(p_session_id, null);
end;
$$;
create or replace function public.guest_lobby_state(p_pin text, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s_id uuid; p_id uuid; name_value text; result jsonb;
begin
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then return null; end if;
  select s.id, p.id, p.nickname into s_id, p_id, name_value from public.game_sessions s
    join public.game_players p on p.session_id = s.id where s.pin = p_pin and p.token_hash = p_token_hash and p.left_at is null
    order by s.created_at desc limit 1;
  if s_id is null then return null; end if;
  result := public.game_view_internal(s_id, p_id);
  return result || jsonb_build_object('nickname', name_value, 'playerId', p_id);
end;
$$;

create or replace function public.touch_guest_lobby(p_pin text, p_token_hash text, p_leave boolean default false) returns boolean
language plpgsql security definer set search_path = '' as $$
declare player_id uuid;
begin
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.game_players p set last_seen_at = clock_timestamp(), left_at = case when p_leave then clock_timestamp() else null end
    from public.game_sessions s where p.session_id = s.id and s.pin = p_pin and p.token_hash = p_token_hash
      and p.left_at is null and s.status in ('waiting', 'question', 'reveal') and s.expires_at > clock_timestamp() returning p.id into player_id;
  return player_id is not null;
end;
$$;

-- Atomic check-and-insert: the session row lock serializes submissions against
-- host progression, and wall-clock time is checked after acquiring that lock.
create function public.submit_guest_answer(p_pin text, p_token_hash text, p_question_index integer, p_option_index integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; q public.game_session_questions%rowtype; v_player_id uuid; received_at timestamptz;
begin
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' or p_option_index is null or p_option_index not between 0 and 3 or p_question_index is null then return jsonb_build_object('error', 'invalid'); end if;
  select gs.* into s from public.game_sessions gs join public.game_players p on p.session_id = gs.id
    where gs.pin = p_pin and p.token_hash = p_token_hash and p.left_at is null and p.participating
      and gs.status in ('question', 'reveal') order by gs.created_at desc limit 1 for update of gs;
  if not found then return jsonb_build_object('error', 'unavailable'); end if;
  received_at := clock_timestamp();
  if s.status <> 'question' or s.current_question <> p_question_index or received_at >= s.question_closes_at or received_at >= s.expires_at then return jsonb_build_object('error', 'closed'); end if;
  select id into v_player_id from public.game_players where session_id = s.id and token_hash = p_token_hash and left_at is null and participating for update;
  if v_player_id is null then return jsonb_build_object('error', 'unavailable'); end if;
  select * into q from public.game_session_questions where session_id = s.id and position = s.current_question;
  if not found then return jsonb_build_object('error', 'unavailable'); end if;
  insert into public.game_answers(session_id, player_id, question_id, selected_index, is_correct, points_awarded, answered_at)
    values (s.id, v_player_id, q.id, p_option_index, p_option_index = q.correct_index, case when p_option_index = q.correct_index then q.points else 0 end, received_at)
    on conflict (player_id, question_id) do nothing;
  if not found then return jsonb_build_object('error', 'already_answered'); end if;
  update public.game_players set last_seen_at = received_at where id = v_player_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.submit_guest_answer(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.submit_guest_answer(text, text, integer, integer) to service_role;

-- Existing participants can reconnect to an active game with their original
-- guest token. New players cannot join after the teacher starts.
create or replace function public.join_guest_lobby(p_pin text, p_nickname text, p_token_hash text, p_rate_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; player_id uuid; player_active boolean; is_participating boolean; attempts_now integer; current_bucket bigint := floor(extract(epoch from now()) / 300)::bigint;
begin
  if coalesce(p_rate_key, '') !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error', 'unavailable'); end if;
  insert into public.lobby_join_limits(rate_key, bucket) values (p_rate_key, current_bucket)
    on conflict (rate_key, bucket) do update set attempts = public.lobby_join_limits.attempts + 1 returning attempts into attempts_now;
  if random() < 0.01 then delete from public.lobby_join_limits where bucket < current_bucket - 3; end if;
  if attempts_now > 120 then return jsonb_build_object('error', 'rate_limit'); end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$'
    or char_length(btrim(coalesce(p_nickname, ''))) not between 2 and 24 or coalesce(p_nickname, '') ~ '[[:cntrl:]]' then return jsonb_build_object('error', 'invalid'); end if;
  select * into s from public.game_sessions where pin = p_pin and status in ('waiting', 'question', 'reveal') and expires_at > clock_timestamp() for update;
  if not found then return jsonb_build_object('error', 'unavailable'); end if;
  select id, left_at is null, participating into player_id, player_active, is_participating
    from public.game_players where session_id = s.id and token_hash = p_token_hash;
  if s.status <> 'waiting' then
    if player_id is null or not coalesce(player_active, false) or not coalesce(is_participating, false) then return jsonb_build_object('error', 'unavailable'); end if;
    update public.game_players set last_seen_at = clock_timestamp() where id = player_id;
    return jsonb_build_object('ok', true);
  end if;
  if exists (select 1 from public.game_players where session_id = s.id and left_at is null
      and lower(btrim(nickname)) = lower(btrim(p_nickname)) and id is distinct from player_id) then return jsonb_build_object('error', 'nickname'); end if;
  if not coalesce(player_active, false) and (select count(*) from public.game_players where session_id = s.id and left_at is null) >= 100 then return jsonb_build_object('error', 'full'); end if;
  if player_id is null then insert into public.game_players(session_id, nickname, token_hash) values (s.id, btrim(p_nickname), p_token_hash);
  else update public.game_players set nickname = btrim(p_nickname), last_seen_at = clock_timestamp(), left_at = null where id = player_id; end if;
  return jsonb_build_object('ok', true);
end;
$$;
