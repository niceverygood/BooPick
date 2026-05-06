# 카카오 OAuth 셋업 (V2 Phase 1.5)

부픽 V2는 임차인·중개사 모두 카카오 로그인을 사용합니다. 이 문서는 사용자(한 대표)가 한 번만 진행하면 되는 외부 발급 절차입니다.

---

## 1. 카카오 디벨로퍼스 앱 생성

1. https://developers.kakao.com 접속 → "내 애플리케이션" → "애플리케이션 추가하기"
2. 앱 이름: **부픽 (BooPick)**
3. 사업자명: **Bottle Inc. (주식회사 바틀)**
4. 카테고리: **부동산**

생성 완료 후 **앱 키**가 발급됩니다:
- REST API 키 (`KAKAO_REST_API_KEY`)
- Client Secret (보안 → "Client Secret" 발급)

---

## 2. 동의 항목 설정

**카카오 로그인** → **동의 항목** 메뉴:

| 항목 | 사용 | 필수 / 선택 | 사유 |
|---|---|---|---|
| 닉네임 | ✅ | 필수 | 사용자 표시명 |
| 이메일 | ✅ | 선택 | 안내 메일 발송용 |
| 카카오톡 채널 추가 상태 | ✅ | 선택 | 부픽 채널 연결 유도 |
| 휴대폰 번호 | ❌ | — | 가입 후 onboarding에서 직접 입력 |
| 친구 목록 | ❌ | — | **수집하지 말 것** |
| 프로필 사진 | ❌ | — | **수집하지 말 것** |

⚠️ 과수집은 정보통신망법·개인정보보호법 위반 + 사용자 신뢰 손상.

---

## 3. Redirect URI 등록

**카카오 로그인** → **활성화 설정** → **Redirect URI** 추가:

```
https://ocwhdztmleptwemapnga.supabase.co/auth/v1/callback
```

(Supabase URL은 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`과 동일)

production·preview 모두 같은 URI 사용 (Supabase가 중간에서 처리).

---

## 4. Supabase Kakao Provider 활성화

[Supabase Dashboard → Authentication → Providers](https://supabase.com/dashboard/project/ocwhdztmleptwemapnga/auth/providers) → **Kakao**:

1. **Enable Kakao provider** ✅
2. **Kakao Client ID**: 카카오 디벨로퍼스의 **REST API 키**
3. **Kakao Client Secret**: 위에서 발급받은 Client Secret
4. **Save**

---

## 5. 카카오톡 채널 개설 (선택, Phase 2 알림톡 준비)

부픽 카카오톡 채널 (사용자가 1:1 채팅 받는 곳):

1. https://center-pf.kakao.com 접속 (카카오톡 채널 관리자센터)
2. **새 채널 만들기** — 이름: "부픽" 또는 "BooPick"
3. 채널 검색용 ID 설정 (예: `boopick`)
4. **알림톡** 사용 신청 (Phase 2 — 1~2주 검수)

채널 URL을 환경변수에 등록:
```
NEXT_PUBLIC_KAKAO_CHANNEL_URL=http://pf.kakao.com/_xxxxxxx
```

이 URL은 매물 상세 페이지 "이 자리 문의하기" 후 노출되는 1:1 채팅 deep link로 사용.

---

## 6. 환경변수 정리

`.env.local` (로컬) + Vercel Production:

```bash
# 카카오 OAuth — Supabase Provider에서 처리하므로 별도 키 불필요
# 카카오 채널 (1:1 채팅 deep link)
NEXT_PUBLIC_KAKAO_CHANNEL_URL=http://pf.kakao.com/_xxxxxxx

# 사이트 URL (OAuth redirect용 — production에선 실제 도메인)
NEXT_PUBLIC_SITE_URL=https://boopick.com
```

---

## 7. 검증

1. `/agent/login` 접속 → "카카오로 시작" 버튼 클릭
2. 카카오 로그인 화면 → 동의 → Supabase 콜백 → 부픽 `/agent/onboarding` 이동 확인
3. onboarding 완료 후 `/agent` 대시보드 진입 확인

문제 시:
- Redirect URI 미등록: 카카오 디벨로퍼스에서 정확히 `https://[supabase-url]/auth/v1/callback` 등록 확인
- Client Secret 불일치: Supabase Provider 설정 다시 저장
- Provider 비활성화: Supabase Dashboard에서 Kakao 토글 ON

---

## 안전 메모

- 카카오 Client Secret은 **절대 공개 저장소·클라이언트 코드에 포함 X**
- Supabase Auth가 중간에서 처리하므로 Next.js 코드에선 키 직접 다룰 필요 없음
- 동의 항목 변경 시 기존 사용자에게 재동의 요청 발생 — 신중히
