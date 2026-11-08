create index if not exists admin_allowlist_created_by_idx
on private.admin_allowlist (created_by);

create index if not exists feedback_submission_receipts_feedback_id_idx
on private.feedback_submission_receipts (feedback_id);

create index if not exists feedback_status_history_changed_by_idx
on public.feedback_status_history (changed_by);
