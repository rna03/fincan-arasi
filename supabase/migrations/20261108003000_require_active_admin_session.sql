create or replace function private.has_active_session(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and nullif(auth.jwt() ->> 'session_id', '') is not null
    and exists (
      select 1
      from auth.sessions as session
      where session.id::text = auth.jwt() ->> 'session_id'
        and session.user_id = p_user_id
        and (session.not_after is null or session.not_after > now())
    );
$$;

revoke execute on function private.has_active_session(uuid) from public, anon, authenticated;

create or replace function private.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_active_session(p_user_id)
    and exists (
      select 1
      from private.admin_allowlist as allowlist
      where allowlist.user_id = p_user_id
    );
$$;

comment on function private.has_active_session(uuid) is
  'Requires the JWT session_id to match a current auth.sessions row for the same user.';
