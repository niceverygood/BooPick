-- =====================================================================
-- BooPick MVP — User Signup Trigger
-- Migration: 0005_user_signup_trigger.sql
--
-- 카카오 OAuth로 신규 가입 시 자동으로 agency + user 레코드 생성
-- =====================================================================

create or replace function handle_new_user()
returns trigger as $$
declare
  v_agency_id uuid;
  v_name text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    '미입력'
  );

  -- 1인 agency 자동 생성 (14일 무료체험 시작)
  insert into agencies (name, plan, trial_ends_at)
  values (v_name || '의 사무소', 'starter', now() + interval '14 days')
  returning id into v_agency_id;

  -- user 레코드 생성 (자동으로 admin 권한)
  insert into users (id, agency_id, kakao_id, email, name, role)
  values (
    new.id,
    v_agency_id,
    new.raw_user_meta_data->>'sub',
    new.email,
    v_name,
    'admin'
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- Done. 모든 마이그레이션 완료.
-- =====================================================================
