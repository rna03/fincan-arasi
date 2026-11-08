create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create type public.feedback_type as enum ('suggestion', 'issue', 'thanks');
create type public.feedback_category as enum ('menu', 'service', 'atmosphere', 'other');
create type public.feedback_status as enum ('new', 'reviewing', 'planned', 'resolved');

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  type public.feedback_type not null,
  category public.feedback_category not null,
  title text not null check (char_length(btrim(title)) between 5 and 100),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status public.feedback_status not null default 'new',
  admin_note text not null default '' check (char_length(btrim(admin_note)) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback_status_history (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  previous_status public.feedback_status,
  new_status public.feedback_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  actor_kind text not null check (actor_kind in ('system', 'admin')),
  created_at timestamptz not null default now(),
  check (
    (actor_kind = 'system' and changed_by is null)
    or (actor_kind = 'admin' and changed_by is not null)
  )
);

create table private.admin_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table private.feedback_submission_receipts (
  idempotency_key uuid primary key,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  feedback_id uuid references public.feedback(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at > created_at)
);

create table private.feedback_rate_limits (
  rate_key_hash text primary key check (rate_key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc, id desc);
create index feedback_status_created_at_idx on public.feedback (status, created_at desc);
create index feedback_type_created_at_idx on public.feedback (type, created_at desc);
create index feedback_category_created_at_idx on public.feedback (category, created_at desc);
create index feedback_history_feedback_created_idx on public.feedback_status_history (feedback_id, created_at, id);
create index feedback_receipts_expires_idx on private.feedback_submission_receipts (expires_at);
create index feedback_rate_limits_expires_idx on private.feedback_rate_limits (expires_at);

alter table public.feedback enable row level security;
alter table public.feedback_status_history enable row level security;
alter table private.admin_allowlist enable row level security;
alter table private.feedback_submission_receipts enable row level security;
alter table private.feedback_rate_limits enable row level security;

revoke all on table public.feedback from public, anon, authenticated;
revoke all on table public.feedback_status_history from public, anon, authenticated;
revoke all on table private.admin_allowlist from public, anon, authenticated;
revoke all on table private.feedback_submission_receipts from public, anon, authenticated;
revoke all on table private.feedback_rate_limits from public, anon, authenticated;

grant all on table public.feedback to service_role;
grant all on table public.feedback_status_history to service_role;
grant all on table private.admin_allowlist to service_role;
grant all on table private.feedback_submission_receipts to service_role;
grant all on table private.feedback_rate_limits to service_role;

create or replace function private.set_feedback_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger feedback_set_updated_at
before update on public.feedback
for each row execute function private.set_feedback_updated_at();

create or replace function private.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and exists (
      select 1
      from private.admin_allowlist as allowlist
      where allowlist.user_id = p_user_id
    );
$$;

create or replace function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_admin(v_user_id) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

create or replace function private.require_service_role()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.feedback_record_json(p_feedback_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', feedback.id,
    'type', feedback.type,
    'category', feedback.category,
    'title', feedback.title,
    'message', feedback.message,
    'status', feedback.status,
    'admin_note', feedback.admin_note,
    'created_at', feedback.created_at,
    'updated_at', feedback.updated_at,
    'history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', history.id,
          'feedback_id', history.feedback_id,
          'previous_status', history.previous_status,
          'new_status', history.new_status,
          'changed_by', history.changed_by,
          'actor_kind', history.actor_kind,
          'created_at', history.created_at
        ) order by history.created_at, history.id
      )
      from public.feedback_status_history as history
      where history.feedback_id = feedback.id
    ), '[]'::jsonb)
  )
  from public.feedback as feedback
  where feedback.id = p_feedback_id;
$$;

create policy feedback_admin_select
on public.feedback
for select
to authenticated
using ((select private.is_admin((select auth.uid()))));

create policy feedback_admin_delete
on public.feedback
for delete
to authenticated
using ((select private.is_admin((select auth.uid()))));

create policy feedback_history_admin_select
on public.feedback_status_history
for select
to authenticated
using ((select private.is_admin((select auth.uid()))));

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin(auth.uid());
$$;

create or replace function public.admin_list_feedback(
  p_search text default '',
  p_type public.feedback_type default null,
  p_category public.feedback_category default null,
  p_status public.feedback_status default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();
  if p_page < 1 or p_page_size < 1 or p_page_size > 50 or char_length(coalesce(p_search, '')) > 100 then
    raise exception 'INVALID_LIST_PARAMETERS' using errcode = '22023';
  end if;

  with filtered as (
    select feedback.id, feedback.created_at
    from public.feedback as feedback
    where (p_type is null or feedback.type = p_type)
      and (p_category is null or feedback.category = p_category)
      and (p_status is null or feedback.status = p_status)
      and (
        btrim(coalesce(p_search, '')) = ''
        or feedback.title ilike '%' || btrim(p_search) || '%'
        or feedback.message ilike '%' || btrim(p_search) || '%'
      )
  ), paged as (
    select filtered.id, filtered.created_at
    from filtered
    order by filtered.created_at desc, filtered.id desc
    limit p_page_size
    offset ((p_page - 1) * p_page_size)
  )
  select jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(private.feedback_record_json(paged.id) order by paged.created_at desc, paged.id desc)
      from paged
    ), '[]'::jsonb),
    'total', (select count(*) from filtered)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_get_feedback(p_feedback_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();
  v_result := private.feedback_record_json(p_feedback_id);
  if v_result is null then
    raise exception 'FEEDBACK_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.admin_feedback_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'total', count(*),
    'statuses', jsonb_build_object(
      'new', count(*) filter (where status = 'new'),
      'reviewing', count(*) filter (where status = 'reviewing'),
      'planned', count(*) filter (where status = 'planned'),
      'resolved', count(*) filter (where status = 'resolved')
    ),
    'categories', jsonb_build_object(
      'menu', count(*) filter (where category = 'menu'),
      'service', count(*) filter (where category = 'service'),
      'atmosphere', count(*) filter (where category = 'atmosphere'),
      'other', count(*) filter (where category = 'other')
    )
  ) into v_result
  from public.feedback;
  return v_result;
end;
$$;

create or replace function public.admin_update_feedback(
  p_feedback_id uuid,
  p_status public.feedback_status,
  p_admin_note text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_current public.feedback%rowtype;
  v_note text := btrim(coalesce(p_admin_note, ''));
begin
  v_admin_id := private.require_admin();
  if char_length(v_note) > 2000 or p_status is null or p_expected_updated_at is null then
    raise exception 'INVALID_ADMIN_FIELDS' using errcode = '22023';
  end if;

  select * into v_current
  from public.feedback
  where id = p_feedback_id
  for update;

  if not found then
    raise exception 'FEEDBACK_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_current.updated_at <> p_expected_updated_at then
    raise exception 'FEEDBACK_CONFLICT' using errcode = '40001';
  end if;
  if v_current.status = p_status and v_current.admin_note = v_note then
    return private.feedback_record_json(p_feedback_id);
  end if;

  update public.feedback
  set status = p_status, admin_note = v_note
  where id = p_feedback_id;

  if v_current.status <> p_status then
    insert into public.feedback_status_history (
      feedback_id, previous_status, new_status, changed_by, actor_kind
    ) values (
      p_feedback_id, v_current.status, p_status, v_admin_id, 'admin'
    );
  end if;

  return private.feedback_record_json(p_feedback_id);
end;
$$;

create or replace function public.admin_delete_feedback(
  p_feedback_id uuid,
  p_expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
begin
  perform private.require_admin();
  select updated_at into v_updated_at
  from public.feedback
  where id = p_feedback_id
  for update;

  if not found then
    raise exception 'FEEDBACK_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is null or v_updated_at <> p_expected_updated_at then
    raise exception 'FEEDBACK_CONFLICT' using errcode = '40001';
  end if;

  delete from public.feedback where id = p_feedback_id;
  return true;
end;
$$;

create or replace function public.submission_idempotency_status(
  p_idempotency_key uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_receipt private.feedback_submission_receipts%rowtype;
begin
  perform private.require_service_role();
  select * into v_receipt
  from private.feedback_submission_receipts
  where idempotency_key = p_idempotency_key and expires_at > now();

  if not found then return jsonb_build_object('state', 'missing'); end if;
  if v_receipt.request_hash <> p_request_hash then
    return jsonb_build_object('state', 'conflict');
  end if;
  return jsonb_build_object('state', 'duplicate');
end;
$$;

create or replace function public.consume_feedback_rate_limit(
  p_rate_key_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_record private.feedback_rate_limits%rowtype;
begin
  perform private.require_service_role();
  if p_rate_key_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_window_seconds < 60 then
    raise exception 'INVALID_RATE_LIMIT_PARAMETERS' using errcode = '22023';
  end if;

  delete from private.feedback_rate_limits
  where ctid in (
    select ctid from private.feedback_rate_limits where expires_at < v_now limit 100
  );
  delete from private.feedback_submission_receipts
  where ctid in (
    select ctid from private.feedback_submission_receipts where expires_at < v_now limit 100
  );

  insert into private.feedback_rate_limits (
    rate_key_hash, window_started_at, request_count, expires_at, updated_at
  ) values (
    p_rate_key_hash, v_now, 1, v_now + make_interval(secs => p_window_seconds), v_now
  )
  on conflict (rate_key_hash) do update
  set
    window_started_at = case
      when private.feedback_rate_limits.expires_at <= v_now then v_now
      else private.feedback_rate_limits.window_started_at
    end,
    request_count = case
      when private.feedback_rate_limits.expires_at <= v_now then 1
      else private.feedback_rate_limits.request_count + 1
    end,
    expires_at = case
      when private.feedback_rate_limits.expires_at <= v_now then v_now + make_interval(secs => p_window_seconds)
      else private.feedback_rate_limits.expires_at
    end,
    updated_at = v_now
  returning * into v_record;

  return jsonb_build_object(
    'allowed', v_record.request_count <= p_limit,
    'retry_after', greatest(1, ceil(extract(epoch from (v_record.expires_at - v_now)))::integer)
  );
end;
$$;

create or replace function public.submit_feedback_from_edge(
  p_idempotency_key uuid,
  p_request_hash text,
  p_type public.feedback_type,
  p_category public.feedback_category,
  p_title text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feedback_id uuid;
  v_existing private.feedback_submission_receipts%rowtype;
begin
  perform private.require_service_role();
  if p_request_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_REQUEST_HASH' using errcode = '22023';
  end if;

  begin
    insert into private.feedback_submission_receipts (idempotency_key, request_hash)
    values (p_idempotency_key, p_request_hash);
  exception when unique_violation then
    select * into v_existing
    from private.feedback_submission_receipts
    where idempotency_key = p_idempotency_key;
    if v_existing.request_hash <> p_request_hash then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return jsonb_build_object('accepted', true, 'duplicate', true);
  end;

  insert into public.feedback (type, category, title, message)
  values (p_type, p_category, btrim(p_title), btrim(p_message))
  returning id into v_feedback_id;

  insert into public.feedback_status_history (
    feedback_id, previous_status, new_status, changed_by, actor_kind
  ) values (
    v_feedback_id, null, 'new', null, 'system'
  );

  update private.feedback_submission_receipts
  set feedback_id = v_feedback_id
  where idempotency_key = p_idempotency_key;

  return jsonb_build_object('accepted', true, 'duplicate', false);
end;
$$;

revoke execute on function private.set_feedback_updated_at() from public, anon, authenticated;
revoke execute on function private.is_admin(uuid) from public, anon, authenticated;
revoke execute on function private.require_admin() from public, anon, authenticated;
revoke execute on function private.require_service_role() from public, anon, authenticated;
revoke execute on function private.feedback_record_json(uuid) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;

revoke execute on function public.is_current_user_admin() from public, anon;
revoke execute on function public.admin_list_feedback(text, public.feedback_type, public.feedback_category, public.feedback_status, integer, integer) from public, anon;
revoke execute on function public.admin_get_feedback(uuid) from public, anon;
revoke execute on function public.admin_feedback_summary() from public, anon;
revoke execute on function public.admin_update_feedback(uuid, public.feedback_status, text, timestamptz) from public, anon;
revoke execute on function public.admin_delete_feedback(uuid, timestamptz) from public, anon;

grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.admin_list_feedback(text, public.feedback_type, public.feedback_category, public.feedback_status, integer, integer) to authenticated;
grant execute on function public.admin_get_feedback(uuid) to authenticated;
grant execute on function public.admin_feedback_summary() to authenticated;
grant execute on function public.admin_update_feedback(uuid, public.feedback_status, text, timestamptz) to authenticated;
grant execute on function public.admin_delete_feedback(uuid, timestamptz) to authenticated;

revoke execute on function public.submission_idempotency_status(uuid, text) from public, anon, authenticated;
revoke execute on function public.consume_feedback_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.submit_feedback_from_edge(uuid, text, public.feedback_type, public.feedback_category, text, text) from public, anon, authenticated;
grant execute on function public.submission_idempotency_status(uuid, text) to service_role;
grant execute on function public.consume_feedback_rate_limit(text, integer, integer) to service_role;
grant execute on function public.submit_feedback_from_edge(uuid, text, public.feedback_type, public.feedback_category, text, text) to service_role;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
