-- =====================================================================
-- Phase 4 — reports Storage 버킷 + RLS 정책
-- Migration: 0002_storage.sql
-- =====================================================================
--
-- 정책:
--   - 버킷: reports (private, signed URL로만 접근)
--   - 경로: {user_id}/{report_id}.pdf
--   - 사용자는 본인 user_id 폴더 내 파일만 INSERT/SELECT/DELETE 가능
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- 기존 정책 정리 (재실행 안전)
DROP POLICY IF EXISTS "reports_self_select" ON storage.objects;
DROP POLICY IF EXISTS "reports_self_insert" ON storage.objects;
DROP POLICY IF EXISTS "reports_self_update" ON storage.objects;
DROP POLICY IF EXISTS "reports_self_delete" ON storage.objects;

-- 본인 폴더 내 파일만 SELECT
CREATE POLICY "reports_self_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 본인 폴더 내 INSERT
CREATE POLICY "reports_self_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 본인 폴더 내 UPDATE (덮어쓰기 시)
CREATE POLICY "reports_self_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 본인 폴더 내 DELETE
CREATE POLICY "reports_self_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

NOTIFY pgrst, 'reload schema';
