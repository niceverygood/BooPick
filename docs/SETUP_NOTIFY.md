# 알림 시스템 셋업 (V2 Phase 1.5)

부픽 V2의 임차인 컨택 알림은 다음 우선순위로 발송됩니다:

1. **카카오 알림톡** (`KAKAO_ALIMTALK_API_KEY`) — Phase 2 발급 후
2. **SMS** (`SOLAPI_API_KEY`) — 현재 메인
3. **이메일** (`RESEND_API_KEY`) — 보조
4. **console** — 모두 미설정 시 (개발 환경)

미설정 채널은 자동 skip되고 다음 채널로 fallback. 모두 실패해도 inquiry는 큐에 남고 5분/30분/2시간 간격 재시도.

---

## 1. Solapi SMS 셋업 (필수, 검증 단계 메인 채널)

### 1-1. 가입
1. https://solapi.com 접속 → 회원가입 (사업자 인증 필수)
2. 사업자등록번호 + 통신판매신고증 (없으면 생성 절차 안내) 제출
3. 발신번호 등록 신청 → 통신사 검토 (1~2일)

### 1-2. API Key 발급
1. Solapi 콘솔 → **개발 → API Key 관리** → 새 API Key 생성
2. 권한: `messages:write`, `senderid:read` 충분
3. **API Key**와 **API Secret** 복사 (Secret은 발급 시 한 번만 보임)

### 1-3. 발신 번호 등록
1. **메시지 → 발신번호 관리** → 등록할 번호 입력 (사업자 번호 또는 본인 휴대폰)
2. 본인 인증 → 통신사 검토 통과 (1~2일)

### 1-4. 환경변수 설정 (`.env.local` + Vercel)

```bash
SOLAPI_API_KEY=NCSXXXXXXXXXXXX
SOLAPI_API_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SOLAPI_FROM_NUMBER=01012345678
```

### 1-5. 비용
- SMS (90byte 이내, 한글 ~45자): **9원/건**
- LMS (90byte 초과): **33원/건**
- 검증 단계 월 1만 건 가정 시 약 **33만원/월**

부픽 코드는 90byte 초과 시 자동 LMS 전환. 발송 결과의 `cost` 필드에 추정 금액 기록.

---

## 2. Resend 이메일 셋업 (선택, fallback)

### 2-1. 가입
1. https://resend.com 접속 → GitHub 계정으로 로그인
2. 무료 플랜: 일 100건 / 월 3,000건 (개발 충분)
3. 유료: 월 $20부터

### 2-2. 도메인 인증 (production 권장)
1. **Domains** → 도메인 추가 (예: `boopick.com`)
2. DNS에 SPF/DKIM 레코드 등록
3. 검증 완료 후 발신 주소 사용 가능 (`noreply@boopick.com` 등)

> 도메인 인증 전엔 `onboarding@resend.dev` 발신 주소만 사용 가능 (테스트용).

### 2-3. API Key 발급
1. **API Keys** → Create API Key
2. 권한: Sending access 충분

### 2-4. 환경변수

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
RESEND_FROM=부픽 <noreply@boopick.com>
```

---

## 3. 카카오 알림톡 (Phase 2)

알림톡은 **사업자 카카오톡 채널 + 비즈센터 인증 + 템플릿 사전 승인**이 필요. 검수 1~2주 소요.

검증 단계에서는 SMS로 충분. 알림톡 발급 완료 시 환경변수에 추가하면 자동 우선 채널로 전환.

```bash
KAKAO_ALIMTALK_API_KEY=
KAKAO_ALIMTALK_SENDER_KEY=
```

발급 절차는 [docs/SETUP_KAKAO.md](./SETUP_KAKAO.md) 참조.

---

## 4. Vercel Cron 등록 (재시도 큐)

`vercel.json`에 cron 추가:

```json
{
  "crons": [
    {
      "path": "/api/cron/retry-notifications",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/admin/content/cron?limit=10",
      "schedule": "0 0 * * *"
    }
  ]
}
```

각 cron 호출 시 `x-cron-secret` 헤더 검증. Vercel Cron은 자동으로 `CRON_SECRET` env에 따라 헤더 부착하므로 환경변수 추가:

```bash
ADMIN_CRON_SECRET=<랜덤 문자열>
```

---

## 5. 어드민 알림 받기

부픽 운영자 본인 (한 대표)에게 일일 리포트 + 알림 실패 alert 받기:

```bash
ADMIN_EMAIL=hello@bottle-inc.com
NEXT_PUBLIC_KAKAO_CHANNEL_URL=http://pf.kakao.com/_xxxxxxx
```

---

## 6. 검증 체크리스트

- [ ] Solapi 발신번호 등록 완료
- [ ] `.env.local`에 `SOLAPI_*` 3종 입력
- [ ] Vercel Production env에 동일 등록
- [ ] 임차인이 `/find/[id]`에서 inquiry 던지면 SMS 도착하는지 본인 폰으로 확인
- [ ] inquiry row의 `notification_sent_at`, `notification_channel`, `notification_cost` 채워지는지 확인
- [ ] (옵션) Resend 도메인 인증 + `RESEND_*` 등록

알림 발송 실패가 잦으면 `/api/cron/retry-notifications`를 직접 호출해 큐 상태 확인.
