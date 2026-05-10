# Phase 4: PDF 리포트 생성 (베이직 + Pro 공통 베이스)

> **목표**: 검색 결과 5건을 우리가 검증한 v7 PDF 형식으로 자동 생성
> **소요 시간**: 2~3일
> **선행 조건**: Phase 1, 2, 3 완료

---

## 📌 클로드 코드에게 줄 프롬프트

```
@CLAUDE.md @assets/proposal_v7_template.html 두 파일을 정독해줘.

# Phase 4: PDF 리포트 생성

## 핵심 시나리오

Phase 3에서 검색 결과 5건이 나오면, 사용자가 "PDF 리포트 생성" 버튼 클릭:
1. /assets/proposal_v7_template.html 템플릿 사용
2. Handlebars 또는 단순 문자열 치환으로 데이터 주입
3. Puppeteer로 HTML → PDF 변환
4. Supabase Storage에 업로드
5. 사용자에게 다운로드 링크 제공

## 작업 1: HTML 템플릿 (이미 있음)

`assets/proposal_v7_template.html` 파일을 `lib/pdf-templates/proposal.html` 로 복사.

이 파일은 9페이지 한국어 PDF 템플릿이며 다음 placeholder 지원:
- {{TITLE}}, {{DATE}}, {{INDUSTRY}}
- {{LISTINGS[0].article_no}}, {{LISTINGS[0].면적}} 등
- {{QR_CODE_BASE64_1}} ~ {{QR_CODE_BASE64_5}}
- {{INDUSTRY_CONTEXT_PAGE}} (Pro 전용 섹션, 베이직은 빈 문자열)
- {{BIZ_ANALYSIS_1}} ~ {{BIZ_ANALYSIS_5}} (Pro 전용)

## 작업 2: PDF 생성기 (lib/pdf-generator.ts)

```typescript
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export interface PDFGenInput {
  title: string;
  date: string;
  industry?: string;        // Pro 티어만
  query: ParsedQuery;
  listings: ScoredListing[];
  tier: 'basic' | 'pro';
  industry_analysis?: any;  // Phase 5에서 채움
}

export async function generatePDF(input: PDFGenInput): Promise<Buffer> {
  // 1. 템플릿 읽기
  const templatePath = path.join(process.cwd(), 'lib/pdf-templates/proposal.html');
  let html = await fs.readFile(templatePath, 'utf-8');

  // 2. QR 코드 생성 (Pro 티어만)
  const qrCodes: string[] = [];
  if (input.tier === 'pro') {
    for (const listing of input.listings) {
      const url = `https://new.land.naver.com/?articleNo=${listing.article_no}`;
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 200,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
      qrCodes.push(dataUrl.replace(/^data:image\/png;base64,/, ''));
    }
  } else {
    // 베이직은 빈 QR
    qrCodes.push(...Array(5).fill(''));
  }

  // 3. 데이터 치환
  html = html.replace(/{{TITLE}}/g, input.title);
  html = html.replace(/{{DATE}}/g, input.date);
  html = html.replace(/{{INDUSTRY}}/g, input.industry || '');
  html = html.replace(/{{TIER}}/g, input.tier);

  // 매물별 데이터 치환
  input.listings.forEach((l, i) => {
    const idx = i + 1;
    html = html.replace(new RegExp(`{{LISTING_${idx}_ARTICLE_NO}}`, 'g'), l.article_no || '');
    html = html.replace(new RegExp(`{{LISTING_${idx}_TITLE}}`, 'g'),
      `${l.지역 ?? '강남'} / ${l.해당층}/${l.전체층}층 / ${Math.round(l.공급_평)}평`);
    html = html.replace(new RegExp(`{{LISTING_${idx}_AREA_평}}`, 'g'), Math.round(l.공급_평) + '평');
    html = html.replace(new RegExp(`{{LISTING_${idx}_AREA_TRANSPORT_평}}`, 'g'), `전용 ${Math.round(l.전용_평)}평`);
    html = html.replace(new RegExp(`{{LISTING_${idx}_FLOOR}}`, 'g'), `${l.해당층}/${l.전체층}층`);
    html = html.replace(new RegExp(`{{LISTING_${idx}_DEPOSIT}}`, 'g'),
      l.보증금 ? formatPrice(l.보증금) : '-');
    html = html.replace(new RegExp(`{{LISTING_${idx}_RENT}}`, 'g'),
      l.월세 ? `${Math.round(l.월세 / 10000)}만 +α` : '-');
    html = html.replace(new RegExp(`{{LISTING_${idx}_AGE}}`, 'g'),
      l.사용승인일 ?
        `${l.사용승인일.slice(0, 7)} (${2026 - new Date(l.사용승인일).getFullYear()}년차)` : '-');
    html = html.replace(new RegExp(`{{LISTING_${idx}_AGENCY}}`, 'g'), l.중개사무소명 ?? '-');
    html = html.replace(new RegExp(`{{LISTING_${idx}_QR_BASE64}}`, 'g'), qrCodes[i] || '');

    // Pro 전용: URL + 클릭 링크
    if (input.tier === 'pro') {
      html = html.replace(new RegExp(`{{LISTING_${idx}_URL}}`, 'g'),
        `https://new.land.naver.com/?articleNo=${l.article_no}`);
      html = html.replace(new RegExp(`{{LISTING_${idx}_QR_VISIBLE}}`, 'g'), 'block');
    } else {
      html = html.replace(new RegExp(`{{LISTING_${idx}_URL}}`, 'g'), '#');
      html = html.replace(new RegExp(`{{LISTING_${idx}_QR_VISIBLE}}`, 'g'), 'none');
    }
  });

  // Pro: 산업 분석 페이지/박스 (Phase 5에서 처리)
  if (input.tier === 'pro' && input.industry_analysis) {
    html = html.replace(/{{INDUSTRY_CONTEXT_PAGE}}/g, input.industry_analysis.context_page);
    input.listings.forEach((_, i) => {
      const idx = i + 1;
      html = html.replace(
        new RegExp(`{{LISTING_${idx}_BIZ_ANALYSIS}}`, 'g'),
        input.industry_analysis.per_listing[i] || ''
      );
    });
  } else {
    // 베이직: 산업 분석 박스 모두 빈 문자열로
    html = html.replace(/{{INDUSTRY_CONTEXT_PAGE}}/g, '');
    for (let i = 1; i <= 5; i++) {
      html = html.replace(new RegExp(`{{LISTING_${i}_BIZ_ANALYSIS}}`, 'g'), '');
    }
  }

  // 4. Puppeteer 실행
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
    printBackground: true,
  });

  await browser.close();
  return pdf;
}

function formatPrice(won: number): string {
  if (won >= 100_000_000) return `${(won / 100_000_000).toFixed(1)}억`;
  return `${Math.round(won / 10000).toLocaleString()}만`;
}
```

## 작업 3: PDF API (app/api/generate-pdf/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePDF } from '@/lib/pdf-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { report_id } = await req.json();

  // 리포트 + 매물 + 사용자 티어 가져오기
  const { data: report } = await supabase.from('reports')
    .select('*, profiles!inner(tier)')
    .eq('id', report_id)
    .eq('user_id', user.id)
    .single();
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: listings } = await supabase.from('listings')
    .select('*')
    .in('id', report.selected_listings);

  // 매물 순서를 selected_listings 순서로
  const orderedListings = report.selected_listings.map((id: number) =>
    listings?.find((l: any) => l.id === id)).filter(Boolean);

  // 산업 분석 (Pro 티어 + industry 있으면)
  let industry_analysis;
  if (report.tier_used === 'pro' && report.industry) {
    // Phase 5에서 구현
    const { generateIndustryAnalysis } = await import('@/lib/industries');
    industry_analysis = await generateIndustryAnalysis(report.industry, orderedListings, report.query_parsed);
  }

  // PDF 생성
  const pdfBuffer = await generatePDF({
    title: '매물 제안서',
    date: new Date().toLocaleDateString('ko-KR'),
    industry: report.industry,
    query: report.query_parsed,
    listings: orderedListings,
    tier: report.tier_used,
    industry_analysis,
  });

  // Supabase Storage 업로드
  const fileName = `${user.id}/${report.id}.pdf`;
  const { error: upError } = await supabase.storage
    .from('reports')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (upError) return NextResponse.json({ error: upError.message }, { status: 500 });

  // public URL 생성
  const { data: urlData } = await supabase.storage.from('reports').createSignedUrl(fileName, 60 * 60 * 24 * 7);

  // reports 테이블 업데이트
  await supabase.from('reports').update({ pdf_url: urlData?.signedUrl }).eq('id', report.id);

  return NextResponse.json({
    pdf_url: urlData?.signedUrl,
    file_name: `${report.industry || '매물'}_제안서_${new Date().toISOString().slice(0, 10)}.pdf`,
  });
}
```

## 작업 4: Supabase Storage 버킷 생성

Supabase Studio에서 또는 마이그레이션으로:
```sql
-- supabase/migrations/0002_storage.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: 자기 폴더만 접근
CREATE POLICY "users access own reports"
ON storage.objects FOR ALL
USING (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 작업 5: 베이직 vs 프로 차이

베이직 PDF에서는:
- ❌ 산업 운영 특성 페이지 (Phase 5) — 빈 div
- ❌ 매물별 산업 분석 박스 — 빈 div
- ❌ QR 코드 — 숨김 (display: none)
- ❌ 클릭 가능한 URL — 표시만 하고 링크 비활성
- ✅ 매물 5건 비교표 + 상세 정보 + 적합도 체크 + 점수

프로 PDF는 우리가 만든 v7 그대로:
- ✅ 결혼정보회사 운영 특성 페이지 (Phase 5)
- ✅ 매물별 결혼정보회사 관점 분석 박스 (Phase 5)
- ✅ QR 코드 + 매물번호 + 클릭 가능 URL
- ✅ 모든 섹션 풀 활성화

## 작업 6: 다운로드 UI

검색 결과 페이지에서 PDF 생성 버튼 클릭 → 로딩 → 다운로드:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function GenerateReportButton({ reportId, fileName }: { reportId: string; fileName: string }) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });
      const data = await res.json();

      // 자동 다운로드
      const link = document.createElement('a');
      link.href = data.pdf_url;
      link.download = data.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full">
      {loading ? (
        <><Loader2 className="mr-2 animate-spin" />PDF 생성 중... (30초)</>
      ) : (
        <><Download className="mr-2" />PDF 리포트 다운로드</>
      )}
    </Button>
  );
}
```

## 작업 7: HTML 템플릿 베이직/프로 분기

assets/proposal_v7_template.html 의 핵심 분기 처리:

```html
<!-- 페이지 1: 표지 (공통) -->

<!-- 페이지 2: 결혼정보회사 운영 특성 (Pro만) -->
{{INDUSTRY_CONTEXT_PAGE}}
<!-- ↑ 베이직: 빈 문자열 / Pro: 5가지 기준 페이지 풀 컨텐츠 -->

<!-- 페이지 3: 검토 요약 + 비교표 (공통) -->

<!-- 페이지 4-8: 매물 1~5 상세 -->
<div class="page">
  <!-- 매물 정보 + 면적/임대료/주차 (공통) -->

  <!-- QR 박스: tier에 따라 display 분기 -->
  <div style="display: {{LISTING_1_QR_VISIBLE}}">
    <img src="data:image/png;base64,{{LISTING_1_QR_BASE64}}" />
  </div>

  <!-- 산업 분석 박스 (Pro만) -->
  {{LISTING_1_BIZ_ANALYSIS}}

  <!-- 적합도 체크 (공통) -->
</div>

<!-- 페이지 9: 다음 단계 (공통) -->
```

## 검증 체크리스트

- [ ] 베이직 PDF 생성 30초 이내
- [ ] Pro PDF 생성 60초 이내 (산업 분석 포함)
- [ ] 한국어 폰트 깨지지 않음 (Noto Sans KR 포함)
- [ ] 9페이지 (Pro), 8페이지 (베이직) 정상 출력
- [ ] QR 코드 모바일 카메라로 스캔 시 네이버부동산 페이지로 이동
- [ ] PDF 파일 5MB 미만 (이메일/카톡 첨부 가능)
- [ ] Supabase Storage URL은 7일간 유효한 signed URL
- [ ] 다운로드 후 브라우저에서 자동 PDF 열기

위 통과하면 Phase 5 진행 가능.

진행해줘.
```

---

## ✅ 완료 후 다음 단계

→ `Phase 5: 산업 관점 분석 (Pro)`
