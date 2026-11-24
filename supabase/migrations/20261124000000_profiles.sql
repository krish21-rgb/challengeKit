-- Only the authentication trigger creates profiles and assigns roles. Client
-- updates are restricted to display_name; future roles need a trusted workflow.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  role text not null default 'teacher' check (role in ('teacher', 'school_admin', 'platform_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.set_profile_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_profile_updated_at();

create function public.create_teacher_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  teacher_name text;
begin
  teacher_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if char_length(teacher_name) < 1 or char_length(teacher_name) > 80 then
    teacher_name := 'Teacher';
  end if;
  insert into public.profiles (id, display_name, role)
  values (new.id, teacher_name, 'teacher');
  return new;
end;
$$;
revoke all on function public.create_teacher_profile() from public;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_teacher_profile();
