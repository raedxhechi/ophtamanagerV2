-- Add profile fields to user_data and let co-workers in the same office read
-- each other's rows.

-- New columns. `email` mirrors the auth.users email (populated by the trigger
-- below); first_name / last_name are plain profile fields.
alter table public.user_data
    add column email text,
    add column first_name text,
    add column last_name text;

-- Default `email` from auth.users. A plain column DEFAULT can't read another
-- table, and rows are typically inserted by the service_role (where auth.uid()
-- is null), so we key off the row's own id (which is the auth.users id) in a
-- BEFORE INSERT trigger. SECURITY DEFINER lets it read auth.users; it only
-- fills the value when the caller didn't supply one.
create or replace function public.user_data_set_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.email is null then
        select email into new.email
        from auth.users
        where id = new.id;
    end if;
    return new;
end;
$$;

create trigger user_data_set_email_before_insert
    before insert on public.user_data
    for each row
    execute function public.user_data_set_email();

-- Backfill existing rows from auth.users.
update public.user_data ud
set email = u.email
from auth.users u
where u.id = ud.id
  and ud.email is null;

-- Office users may read every user_data row belonging to their own office.
-- current_office_id() is SECURITY DEFINER, so it reads user_data without
-- recursing into this policy. This is additive to "Users can view their own
-- data" (permissive policies OR together), so a user with no office still sees
-- their own row.
create policy "Office users can view their office's users"
    on public.user_data
    for select
    to authenticated
    using (doctor_office_id = public.current_office_id());
