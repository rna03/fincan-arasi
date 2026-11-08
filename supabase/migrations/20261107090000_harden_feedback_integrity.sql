-- Security audit hardening: preserve audit rows when an Auth user is removed,
-- and return a real HTTP 409 for optimistic concurrency conflicts.

alter table public.feedback_status_history
  drop constraint if exists feedback_status_history_check;

alter table public.feedback_status_history
  add constraint feedback_status_history_actor_consistency_check
  check (
    (actor_kind = 'system' and changed_by is null)
    or actor_kind = 'admin'
  );

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
    raise exception 'FEEDBACK_CONFLICT' using errcode = 'PT409';
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
    raise exception 'FEEDBACK_CONFLICT' using errcode = 'PT409';
  end if;

  delete from public.feedback where id = p_feedback_id;
  return true;
end;
$$;
