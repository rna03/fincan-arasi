begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'ordinary-user@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'admin-user@example.test'),
  ('00000000-0000-4000-8000-000000000003', 'removed-admin@example.test');

insert into private.admin_allowlist (user_id)
values ('00000000-0000-4000-8000-000000000002');

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', now(), now()),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', now(), now());

insert into public.feedback (
  id, type, category, title, message, created_at, updated_at
) values (
  '10000000-0000-4000-8000-000000000001',
  'suggestion',
  'menu',
  'Kurgusal test kaydı',
  'Bu kayıt yalnızca veritabanı güvenlik testi için oluşturulmuştur.',
  '2026-11-06T18:00:00Z',
  '2026-11-06T18:00:00Z'
);

insert into public.feedback (
  id, type, category, title, message, created_at, updated_at
) values (
  '10000000-0000-4000-8000-000000000002',
  'issue',
  'other',
  'Silinen yönetici geçmişi',
  'Bu ikinci kayıt yalnızca aktör geçmişinin korunmasını sınar.',
  '2026-11-06T18:00:00Z',
  '2026-11-06T18:00:00Z'
);

insert into public.feedback_status_history (
  id, feedback_id, previous_status, new_status, changed_by, actor_kind, created_at
) values (
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'new',
  'reviewing',
  '00000000-0000-4000-8000-000000000003',
  'admin',
  '2026-11-06T18:05:00Z'
);

insert into public.feedback_status_history (
  id, feedback_id, previous_status, new_status, changed_by, actor_kind, created_at
) values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  null,
  'new',
  null,
  'system',
  '2026-11-06T18:00:00Z'
);

select ok((select relrowsecurity from pg_class where oid = 'public.feedback'::regclass), 'feedback RLS etkindir');
select ok((select relrowsecurity from pg_class where oid = 'public.feedback_status_history'::regclass), 'history RLS etkindir');
select ok((select relrowsecurity from pg_class where oid = 'private.admin_allowlist'::regclass), 'allowlist RLS etkindir');

select ok(not has_table_privilege('anon', 'public.feedback', 'select'), 'anon feedback okuyamaz');
select ok(not has_table_privilege('anon', 'public.feedback', 'insert'), 'anon feedback ekleyemez');
select ok(not has_table_privilege('anon', 'public.feedback', 'update'), 'anon feedback güncelleyemez');
select ok(not has_table_privilege('anon', 'public.feedback', 'delete'), 'anon feedback silemez');

select ok(not has_table_privilege('authenticated', 'public.feedback', 'select'), 'authenticated doğrudan feedback okuyamaz');
select ok(not has_table_privilege('authenticated', 'public.feedback', 'insert'), 'authenticated doğrudan feedback ekleyemez');
select ok(not has_table_privilege('authenticated', 'public.feedback', 'update'), 'authenticated özgün müşteri metnini doğrudan güncelleyemez');
select ok(not has_table_privilege('authenticated', 'public.feedback', 'delete'), 'authenticated doğrudan feedback silemez');
select ok(not has_table_privilege('authenticated', 'public.feedback_status_history', 'select'), 'authenticated geçmişi doğrudan okuyamaz');
select ok(not has_table_privilege('authenticated', 'private.admin_allowlist', 'select'), 'authenticated allowlist okuyamaz');
select ok(not has_table_privilege('authenticated', 'private.admin_allowlist', 'insert'), 'authenticated kendini allowlist içine ekleyemez');

select ok(
  not has_function_privilege(
    'authenticated',
    'public.submit_feedback_from_edge(uuid,text,public.feedback_type,public.feedback_category,text,text)',
    'execute'
  ),
  'authenticated service-role gönderim RPC işlevini çağıramaz'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_feedback_rate_limit(text,integer,integer)',
    'execute'
  ),
  'authenticated hız sınırı RPC işlevini çağıramaz'
);
select ok(
  not has_function_privilege('anon', 'public.admin_feedback_summary()', 'execute'),
  'anon yönetici RPC işlevini çağıramaz'
);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"30000000-0000-4000-8000-000000000001"}';

select is(public.is_current_user_admin(), false, 'allowlist dışındaki oturum yönetici değildir');
select throws_ok(
  $$ select public.admin_feedback_summary() $$,
  '42501',
  'ADMIN_REQUIRED',
  'allowlist dışındaki kullanıcı yönetici özetini alamaz'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"30000000-0000-4000-8000-000000000099"}';

select is(public.is_current_user_admin(), false, 'allowlist yöneticisi aktif Auth oturumu olmadan yetkili değildir');

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"30000000-0000-4000-8000-000000000002"}';

select is(public.is_current_user_admin(), true, 'allowlist yöneticisi doğrulanır');
select is(
  (public.admin_list_feedback() ->> 'total')::integer,
  2,
  'yetkili yönetici sınırlı liste RPC ile kayıtları okuyabilir'
);
select is(
  public.admin_update_feedback(
    '10000000-0000-4000-8000-000000000001',
    'reviewing',
    'Kurgusal test notu.',
    '2026-11-06T18:00:00Z'
  ) ->> 'status',
  'reviewing',
  'yetkili yönetici izin verilen alanları güncelleyebilir'
);
select is(
  public.admin_get_feedback('10000000-0000-4000-8000-000000000001') ->> 'title',
  'Kurgusal test kaydı',
  'yönetici güncellemesi özgün müşteri başlığını değiştirmez'
);
select is(
  jsonb_array_length(public.admin_get_feedback('10000000-0000-4000-8000-000000000001') -> 'history'),
  2,
  'durum değişikliği tek geçmiş kaydı ekler'
);
select throws_ok(
  $$
    select public.admin_update_feedback(
      '10000000-0000-4000-8000-000000000001',
      'planned',
      'Eski zaman damgasıyla yazılmamalı.',
      '2026-11-06T18:00:00Z'
    )
  $$,
  'PT409',
  'FEEDBACK_CONFLICT',
  'eski updated_at ile eşzamanlı güncelleme 409 çakışması üretir'
);
select lives_ok(
  $$
    select public.admin_update_feedback(
      '10000000-0000-4000-8000-000000000001',
      'reviewing',
      'Aynı durumla güncellenen ikinci kurgusal not.',
      (public.admin_get_feedback('10000000-0000-4000-8000-000000000001') ->> 'updated_at')::timestamptz
    )
  $$,
  'aynı durumla iç not güncellenebilir'
);
select is(
  jsonb_array_length(public.admin_get_feedback('10000000-0000-4000-8000-000000000001') -> 'history'),
  2,
  'aynı durum yeniden kaydedildiğinde geçmiş çoğalmaz'
);
select is(
  public.admin_delete_feedback(
    '10000000-0000-4000-8000-000000000001',
    (public.admin_get_feedback('10000000-0000-4000-8000-000000000001') ->> 'updated_at')::timestamptz
  ),
  true,
  'yetkili yönetici özel kurgusal test kaydını silebilir'
);

reset role;
delete from auth.users where id = '00000000-0000-4000-8000-000000000003';
select is(
  (
    select actor_kind || ':' || coalesce(changed_by::text, 'null')
    from public.feedback_status_history
    where id = '20000000-0000-4000-8000-000000000002'
  ),
  'admin:null',
  'Auth kullanıcısı silinse de yönetici geçmişi aktör türüyle korunur'
);
select is(
  (select count(*) from public.feedback where id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'silinen kurgusal kayıt kalmaz'
);
select is(
  (select count(*) from public.feedback_status_history where feedback_id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'silinen kaydın geçmişi cascade ile kaldırılır'
);

do $$
declare
  v_failure text;
begin
  select string_agg(message, E'\n')
  into v_failure
  from finish() as output(message);

  if v_failure is not null then
    raise exception 'PGTAP_FAILED: %', v_failure;
  end if;
end;
$$;

select '32/32 pgTAP kontrolü başarılı' as pgtap_result;
rollback;
