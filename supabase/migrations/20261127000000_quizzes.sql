-- Quiz content remains teacher-only, including published answer keys. Live
-- games will need their own carefully scoped, server-side student projections.
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  subject text not null default '' check (char_length(subject) <= 80),
  grade text not null default '' check (char_length(grade) <= 80),
  topic text not null default '' check (char_length(topic) <= 120),
  cover_url text not null default '' check (char_length(cover_url) <= 2048 and (cover_url = '' or cover_url ~ '^https://[^[:space:]]+$')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quizzes_owner_updated_idx on public.quizzes (owner_id, updated_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null check (char_length(btrim(question_text)) between 1 and 500),
  explanation text not null default '' check (char_length(explanation) <= 1000),
  time_limit integer not null check (time_limit between 5 and 300),
  points integer not null check (points between 0 and 10000),
  position integer not null check (position between 0 and 49),
  unique (quiz_id, position)
);
create table public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null check (char_length(btrim(option_text)) between 1 and 250),
  position integer not null check (position between 0 and 3),
  is_correct boolean not null default false,
  unique (question_id, position)
);
create unique index one_correct_answer_per_question on public.answer_options (question_id) where is_correct;

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
revoke all on public.quizzes, public.questions, public.answer_options from anon, authenticated;
grant select on public.quizzes, public.questions, public.answer_options to authenticated;
create policy "Teachers read their quizzes" on public.quizzes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Teachers read their questions" on public.questions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())));
create policy "Teachers read their answer options" on public.answer_options for select to authenticated
  using (exists (select 1 from public.questions x join public.quizzes q on q.id = x.quiz_id
    where x.id = question_id and q.owner_id = (select auth.uid())));

-- All writes are atomic and authorized here, including calls made directly to
-- PostgREST. Direct table writes are deliberately not granted to clients.
create function public.save_teacher_quiz(p_quiz_id uuid, p_expected_updated_at timestamptz, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  teacher_id uuid := auth.uid();
  saved_id uuid;
  saved_at timestamptz;
  item jsonb;
  opt jsonb;
  q_id uuid;
  q_pos integer := 0;
  opt_pos integer;
  question_count integer;
  title_value text;
  status_value text;
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 250000 then
    raise exception 'Invalid quiz payload';
  end if;
  title_value := btrim(coalesce(p_payload->>'title', ''));
  status_value := coalesce(p_payload->>'status', '');
  if char_length(title_value) not between 1 and 120 or status_value not in ('draft', 'published')
    or char_length(coalesce(p_payload->>'description', '')) > 1000
    or char_length(coalesce(p_payload->>'subject', '')) > 80
    or char_length(coalesce(p_payload->>'grade', '')) > 80
    or char_length(coalesce(p_payload->>'topic', '')) > 120
    or char_length(coalesce(p_payload->>'coverUrl', '')) > 2048
    or (coalesce(p_payload->>'coverUrl', '') <> '' and (p_payload->>'coverUrl') !~ '^https://[^[:space:]]+$')
    or jsonb_typeof(p_payload->'questions') is distinct from 'array' then
    raise exception 'Invalid quiz details';
  end if;
  question_count := jsonb_array_length(p_payload->'questions');
  if question_count > 50 or (status_value = 'published' and question_count = 0) then
    raise exception 'Invalid number of questions';
  end if;
  for item in select value from jsonb_array_elements(p_payload->'questions') loop
    if jsonb_typeof(item) <> 'object'
      or char_length(btrim(coalesce(item->>'text', ''))) not between 1 and 500
      or char_length(coalesce(item->>'explanation', '')) > 1000
      or coalesce(item->>'timeLimit', '') !~ '^[0-9]{1,3}$'
      or coalesce(item->>'points', '') !~ '^[0-9]{1,5}$'
      or coalesce(item->>'correctIndex', '') !~ '^[0-3]$'
      or jsonb_typeof(item->'options') is distinct from 'array' then
      raise exception 'Invalid question';
    end if;
    if (item->>'timeLimit')::integer not between 5 and 300
      or (item->>'points')::integer not between 0 and 10000
      or jsonb_array_length(item->'options') <> 4 then
      raise exception 'Invalid question settings';
    end if;
    for opt in select value from jsonb_array_elements(item->'options') loop
      if jsonb_typeof(opt) <> 'string' or char_length(btrim(opt #>> '{}')) not between 1 and 250 then
        raise exception 'Invalid answer option';
      end if;
    end loop;
  end loop;

  if p_quiz_id is null then
    insert into public.quizzes (owner_id, title, description, subject, grade, topic, cover_url, status)
    values (teacher_id, title_value, coalesce(p_payload->>'description', ''), coalesce(p_payload->>'subject', ''),
      coalesce(p_payload->>'grade', ''), coalesce(p_payload->>'topic', ''), coalesce(p_payload->>'coverUrl', ''), status_value)
    returning id, updated_at into saved_id, saved_at;
  else
    -- Optimistic locking prevents a stale tab from silently overwriting changes.
    update public.quizzes set title = title_value, description = coalesce(p_payload->>'description', ''),
      subject = coalesce(p_payload->>'subject', ''), grade = coalesce(p_payload->>'grade', ''),
      topic = coalesce(p_payload->>'topic', ''), cover_url = coalesce(p_payload->>'coverUrl', ''),
      status = status_value, updated_at = clock_timestamp()
    where id = p_quiz_id and owner_id = teacher_id and updated_at = p_expected_updated_at
    returning id, updated_at into saved_id, saved_at;
    if saved_id is null then raise exception 'Quiz not found or changed since it was opened'; end if;
    delete from public.questions where quiz_id = saved_id;
  end if;
  for item in select value from jsonb_array_elements(p_payload->'questions') loop
    insert into public.questions (quiz_id, question_text, explanation, time_limit, points, position)
    values (saved_id, btrim(item->>'text'), coalesce(item->>'explanation', ''),
      (item->>'timeLimit')::integer, (item->>'points')::integer, q_pos) returning id into q_id;
    opt_pos := 0;
    for opt in select value from jsonb_array_elements(item->'options') loop
      insert into public.answer_options (question_id, option_text, position, is_correct)
      values (q_id, btrim(opt #>> '{}'), opt_pos, opt_pos = (item->>'correctIndex')::integer);
      opt_pos := opt_pos + 1;
    end loop;
    q_pos := q_pos + 1;
  end loop;
  return jsonb_build_object('id', saved_id, 'updatedAt', saved_at);
end;
$$;
revoke all on function public.save_teacher_quiz(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.save_teacher_quiz(uuid, timestamptz, jsonb) to authenticated;

create function public.delete_teacher_quiz(p_quiz_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare teacher_id uuid := auth.uid(); removed_id uuid;
begin
  if teacher_id is null or not exists (select 1 from public.profiles where id = teacher_id and role = 'teacher') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  delete from public.quizzes where id = p_quiz_id and owner_id = teacher_id returning id into removed_id;
  return removed_id is not null;
end;
$$;
revoke all on function public.delete_teacher_quiz(uuid) from public, anon;
grant execute on function public.delete_teacher_quiz(uuid) to authenticated;
