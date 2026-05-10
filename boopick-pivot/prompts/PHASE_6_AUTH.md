# Phase 6: 인증 + 티어 시스템 + 사용량 제한

> **목표**: 이메일 회원가입/로그인 + Basic/Pro 티어 + 월 사용량 제한
> **소요 시간**: 1일
> **선행 조건**: Phase 1~5 완료

---

## 📌 클로드 코드에게 줄 프롬프트

```
@CLAUDE.md 정독하고 시작해줘.

# Phase 6: 인증 + 티어 시스템

## 핵심 시나리오

1. 이메일/비밀번호 회원가입 (Supabase Auth)
2. 회원가입 즉시 profile 생성 (tier='basic')
3. 베이직: 월 5건 리포트 / 산업 분석 X / QR X
4. 프로: 월 50건 / 모든 기능 / 베타는 무료
5. 어드민이 수동으로 Pro 승격 가능 (V1)
6. V2에 카카오페이 정기결제 자동화

## 작업 1: 인증 페이지

### app/(auth)/signup/page.tsx
```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSignup() {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="이름" value={name} onChange={e => setName(e.target.value)} />
          <Input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} />
          <Input type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleSignup} disabled={loading} className="w-full">
            {loading ? '가입 중...' : '회원가입'}
          </Button>
          <p className="text-sm text-center">
            이미 계정이 있으신가요? <a href="/login" className="text-primary underline">로그인</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### app/(auth)/login/page.tsx
- 위와 동일한 구조, signInWithPassword 사용
- 카카오 OAuth 버튼 X (V1에서 빠짐)

### middleware.ts
보호 라우트 설정:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // /dashboard/* 는 인증 필수
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 로그인된 사용자가 /login 접근 시 /dashboard로
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
```

## 작업 2: 티어 체크 라이브러리 (lib/tier-check.ts)

```typescript
import { createClient } from '@/lib/supabase/server';

export type Tier = 'basic' | 'pro';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  reports_used_month: number;
  reports_reset_at: string;
}

export const TIER_LIMITS: Record<Tier, {
  monthly_reports: number;
  industry_analysis: boolean;
  qr_codes: boolean;
  industries_supported: string[];
}> = {
  basic: {
    monthly_reports: 5,
    industry_analysis: false,
    qr_codes: false,
    industries_supported: ['일반'],
  },
  pro: {
    monthly_reports: 50,
    industry_analysis: true,
    qr_codes: true,
    industries_supported: ['결혼정보회사', '일반'],  // V1 기준
  },
};

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  // 월간 카운터 리셋 (한 달이 지났으면)
  const lastReset = new Date(profile.reports_reset_at);
  const now = new Date();
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    await supabase.from('profiles').update({
      reports_used_month: 0,
      reports_reset_at: now.toISOString().slice(0, 10),
    }).eq('id', user.id);
    profile.reports_used_month = 0;
  }

  return profile;
}

export async function checkReportLimit(profile: UserProfile): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const limit = TIER_LIMITS[profile.tier].monthly_reports;
  const remaining = limit - profile.reports_used_month;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit,
  };
}

export async function incrementReportCount(userId: string) {
  const supabase = createClient();
  await supabase.rpc('increment_report_count', { p_user_id: userId });
}
```

## 작업 3: PostgreSQL 함수 (supabase/migrations/0003_functions.sql)

```sql
CREATE OR REPLACE FUNCTION increment_report_count(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET reports_used_month = reports_used_month + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 작업 4: 검색/PDF API에 티어 체크 통합

`app/api/search/route.ts`:
```typescript
import { getCurrentProfile, checkReportLimit, TIER_LIMITS } from '@/lib/tier-check';

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 사용량 체크
  const limit = await checkReportLimit(profile);
  if (!limit.allowed) {
    return NextResponse.json({
      error: 'Monthly limit reached',
      message: `이번 달 ${limit.limit}건의 리포트 한도에 도달했습니다. 다음 달 1일에 초기화됩니다.`,
    }, { status: 429 });
  }

  // 산업 분석 요청 시 Pro 체크
  const { query } = await req.json();
  if (query.industry && query.industry !== '일반' && !TIER_LIMITS[profile.tier].industry_analysis) {
    return NextResponse.json({
      error: 'Pro tier required',
      message: '산업 관점 분석은 Pro 티어부터 이용 가능합니다.',
    }, { status: 403 });
  }

  // ... 기존 검색 로직
}
```

`app/api/generate-pdf/route.ts`:
```typescript
// PDF 생성 성공 시 카운터 증가
await incrementReportCount(user.id);
```

## 작업 5: 대시보드 사용량 표시

app/(dashboard)/dashboard/page.tsx 상단에 사용량 표시:

```tsx
<div className="border rounded-lg p-4 mb-6 bg-amber-50">
  <div className="flex justify-between items-center">
    <div>
      <span className="text-sm text-muted-foreground">이번 달 리포트</span>
      <div className="text-2xl font-bold">
        {profile.reports_used_month} / {limit.limit}건
      </div>
      <span className="text-xs text-muted-foreground">
        {profile.tier === 'basic' ? '베이직 티어' : 'Pro 티어'}
      </span>
    </div>
    {profile.tier === 'basic' && (
      <Button variant="outline" asChild>
        <a href="/pricing">Pro 업그레이드</a>
      </Button>
    )}
  </div>
</div>
```

## 작업 6: 가격 페이지 (app/(marketing)/pricing/page.tsx)

```
┌─────────────────────────────────────────────────┐
│              부픽 가격 안내                          │
└─────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐
│   베이직 무료     │  │   프로 (베타)      │
│                  │  │                  │
│   월 0원          │  │   월 0원 (베타)    │
│                  │  │   향후 49,000원    │
│                  │  │                  │
│  ✅ 매물 업로드    │  │  ✅ 모든 베이직    │
│  ✅ 매물 검색      │  │  ✅ 산업 관점 분석  │
│  ✅ 단순 리스트 PDF│  │  ✅ QR 코드 + 링크 │
│  ✅ 월 5건         │  │  ✅ 월 50건        │
│  ❌ 산업 분석      │  │  ✅ 결혼정보회사 등 │
│  ❌ QR 코드        │  │                  │
│                  │  │                  │
│  [무료 시작]      │  │  [베타 신청]      │
└──────────────────┘  └──────────────────┘

* 베타 기간 동안 Pro 티어도 무료입니다
* 정식 출시 시 1개월 미리 안내드립니다
```

## 작업 7: Pro 베타 신청 폼

베이직 사용자가 "Pro 업그레이드" 클릭 시:

```
┌──────────────────────────────────────┐
│  Pro 베타 신청                          │
├──────────────────────────────────────┤
│  소속: [____________________]          │
│  업력: [____________________]          │
│  현재 사용 중인 의뢰 도구:               │
│  [                                  ] │
│  [                                  ] │
│                                      │
│  [신청하기]                            │
└──────────────────────────────────────┘

신청 시 카톡으로 한승수 대표와 직접 컨택
약 24시간 내 Pro 승격 처리
```

API: app/api/pro-beta-request/route.ts
```typescript
// 한대표 카톡으로 알림 (또는 Slack webhook)
// 또는 reports 테이블에 별도로 신청 기록
```

## 작업 8: 어드민 페이지 (수동 Pro 승격용)

app/(admin)/admin/users/page.tsx:
- 한승수 대표 이메일만 접근 가능
- 사용자 목록 + 검색
- 각 사용자 옆 [Basic ↔ Pro] 토글 버튼
- 사용량 리셋 버튼

```typescript
// 관리자 체크
if (profile.email !== 'seungsoo@bottle.kr') {
  return notFound();
}
```

## 검증 체크리스트

- [ ] 이메일 회원가입 정상
- [ ] 회원가입 시 profiles 자동 생성 (트리거 작동)
- [ ] 미인증 사용자가 /dashboard 접근 시 /login 리다이렉트
- [ ] 베이직 사용자가 결혼정보회사 분석 요청 시 403 에러
- [ ] 월 5건 초과 시 429 에러
- [ ] 사용량 카운터가 매월 1일 자동 리셋
- [ ] 어드민(한승수)이 다른 사용자 Pro 승격 가능
- [ ] PDF 생성 성공 시 카운터 +1
- [ ] PDF 생성 실패 시 카운터 변경 안 됨

위 통과하면 V1 MVP 완성.

진행해줘.
```

---

## 🎯 V1 출시 후 다음 단계

### V1.5 (출시 후 1~2주)
- 김예나님 외 베타 사용자 5~10명 모집
- 피드백 수집 + 버그 수정
- 사용량 패턴 분석

### V2 (출시 후 1~2개월)
- 카카오페이 정기결제 자동화
- 음식점/병원/학원 산업 추가
- 부동산 중개사 협업 기능 (옵션)
- 매물 가격 트렌드 차트
