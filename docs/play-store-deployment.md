# 부픽 Google Play Store 배포 가이드 (TWA · Phase 1)

> Trusted Web Activity (TWA) 방식 — 부픽 웹앱을 안드로이드 네이티브 셸로 감싸 Play Store에 배포.
> 카카오페이 결제는 그대로 유지됨 (Google Play IAP 우회 가능 — Custom Tab 방식).

## 전체 흐름 (총 4~6시간 + 검수 1~7일)

```
[준비]    PWA manifest + 아이콘 (코드 ✅ 완료)
   ↓
[빌드]    Bubblewrap CLI 로 APK·AAB 생성 (사장님 30분)
   ↓
[검증]    SHA-256 fingerprint → assetlinks.json 업데이트 + 푸시 (10분)
   ↓
[등록]    Google Play Console $25 가입 + 메타데이터 (1~2시간)
   ↓
[제출]    AAB 업로드 → 내부 테스트 → 프로덕션
   ↓
[검수]    Google 1~7일
```

---

## Step 1 — 사전 준비물 (사장님 PC)

### 필수 설치
- **Node.js 18+** (이미 있을 거)
- **Java JDK 17** — `brew install openjdk@17` (macOS) 또는 https://adoptium.net
- **Android SDK** — Android Studio 설치 후 함께 (가장 쉬움)
  - https://developer.android.com/studio
  - 설치 후 SDK Manager에서 `Android SDK Platform 34`, `Android SDK Build-Tools 34.0.0` 다운로드

### 환경변수 (~/.zshrc 또는 ~/.bash_profile)
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

설치 검증:
```bash
java -version       # 17 확인
echo $ANDROID_HOME  # 경로 출력
sdkmanager --list   # SDK 패키지 목록
```

---

## Step 2 — Bubblewrap CLI로 TWA 프로젝트 생성

```bash
npm install -g @bubblewrap/cli
```

부픽 worktree 와 별도 폴더에서 (예: `~/Projects/boopick-twa`):
```bash
mkdir ~/Projects/boopick-twa
cd ~/Projects/boopick-twa
bubblewrap init --manifest=https://boo-pick.vercel.app/manifest.json
```

**프롬프트 답변 (권장값)**:
| 질문 | 답변 |
|---|---|
| Domain | `boo-pick.vercel.app` |
| URL path | `/dashboard` |
| Application name | `부픽` |
| Short name | `부픽` |
| Application ID (package name) | `kr.co.bottlecorp.boopick` |
| Starting version code | `1` |
| Display mode | `standalone` |
| Orientation | `portrait` |
| Theme color | `#0a2540` |
| Background color | `#faf7f2` |
| Splash screen icon | `icon-512.png` 사용 |
| Status bar color | `#0a2540` |
| Include monochrome icon? | Yes (Material You 대응) |
| Signing key | "Create a new one" 선택 (또는 기존 있으면 그것) |

→ 새 키스토어 비밀번호 설정. **꼭 안전한 곳에 백업** — 잃어버리면 같은 패키지로 업데이트 영원히 불가능.

### 생성된 파일
- `twa-manifest.json` — TWA 설정
- `app-release-signed.apk` — APK
- `app-release-bundle.aab` — Play Store 업로드용 (AAB 권장)
- `android.keystore` — 서명 키 (절대 잃어버리지 말 것!)

---

## Step 3 — SHA-256 fingerprint 추출 + assetlinks.json 갱신

```bash
bubblewrap fingerprint
```

또는:
```bash
keytool -list -v -keystore android.keystore -alias android
```

출력에서 **SHA-256 fingerprint** 값 복사 (예: `XX:XX:XX:...:XX`)

부픽 worktree로 가서 `public/.well-known/assetlinks.json` 수정:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "kr.co.bottlecorp.boopick",
      "sha256_cert_fingerprints": [
        "여기에 복사한 SHA-256 fingerprint 붙여넣기"
      ]
    }
  }
]
```

커밋·푸시:
```bash
cd /Users/seungsoohan/Projects/BooPick/.claude/worktrees/mystifying-bhabha-4d9948
export DEVELOPER_DIR=/Library/Developer/CommandLineTools
git add public/.well-known/assetlinks.json
git commit -m "[v3-play] assetlinks SHA-256 fingerprint"
git push origin HEAD:main
```

Vercel 배포 후 검증:
```bash
curl https://boo-pick.vercel.app/.well-known/assetlinks.json
# → 위 JSON 그대로 출력되면 OK
```

> ⚠️ `assetlinks.json`이 정확히 응답돼야 TWA가 URL 주소창 없이 풀스크린으로 뜸. 안 되면 주소창 보임.

---

## Step 4 — Google Play Console 등록

### 4-1. 개발자 계정 가입 ($25 1회)
1. https://play.google.com/console/signup
2. **개인** 또는 **조직** 선택 — 부픽은 **조직** (주식회사 바틀)
3. 사업자등록증 인증 (며칠 걸릴 수 있음)
4. $25 결제

### 4-2. 새 앱 만들기
**Console → 앱 만들기**:
- 앱 이름: `부픽 (BooPick)`
- 기본 언어: `한국어 (대한민국)`
- 앱 또는 게임: `앱`
- 무료 또는 유료: `무료`
- 선언: 모든 항목 동의

### 4-3. 메타데이터 입력 (좌측 메뉴)

**스토어 등록정보**:
- 짧은 설명 (80자):
  ```
  공인중개사 매물 분석 SaaS — 의뢰 조건으로 매물 자동 점수화 + PDF 리포트
  ```
- 자세한 설명 (4000자):
  ```
  부픽은 공인중개사가 보유한 매물 데이터(엑셀)를 의뢰 조건에 맞춰
  분석하고 PDF 리포트로 출력하는 B2B SaaS 도구입니다.

  ✨ 핵심 기능
  · 엑셀 한 장 업로드 → 매물 데이터 자동 정리
  · 자연어 검색 — "강남 30평 사무실, 보증금 1억" 같은 평소 말투
  · 매물별 적합도 점수 (0~100)
  · PDF 리포트 자동 생성 (의뢰자 제안에 그대로 활용)
  · 업종 특화 가중치 (결혼식장·카페·학원·필라테스 등 8종+)

  ⚠️ 본 앱은 공인중개사 등 사업자용 분석 도구이며,
  매물 추천·중개·자문 서비스가 아닙니다.
  분석 결과의 의사결정 책임은 사용자에게 있습니다.

  📞 문의: hello@bottle.kr
  ```

**그래픽 자료**:
| 항목 | 사양 | 비고 |
|---|---|---|
| 앱 아이콘 | 512×512 PNG | `public/img/icon-512.png` 사용 |
| 기능 그래픽 | 1024×500 PNG | OG 이미지(`public/img/og-image.png`) 변형 또는 신규 |
| 스크린샷 (휴대전화) | 2~8장, 16:9 또는 9:16 | 라이브 사이트에서 모바일 뷰 캡처 |

스크린샷 캡처 추천:
1. 랜딩 (Hero + 샘플 카드)
2. 대시보드 (인사말 + KPI)
3. 검색 결과 (Signal 신호)
4. 리포트 상세 (조건 그리드)
5. 가격 페이지

**카테고리 및 태그**: 
- 카테고리: `비즈니스`
- 태그: 부동산, 분석, SaaS, B2B

**연락처 세부정보**: 
- 이메일: `hello@bottle.kr`
- 웹사이트: `https://boo-pick.vercel.app`
- 개인정보처리방침: `https://boo-pick.vercel.app/privacy` ✅

### 4-4. 콘텐츠 등급 설문 (Google IARC)
- 카테고리: `참조·뉴스·교육`
- 폭력·성적·욕설 등 모두 No
- 결과: **모든 연령** 또는 **3세 이상**

### 4-5. 데이터 안전성 (필수)
**수집 데이터**:
- 개인 정보: 이름, 이메일, 전화번호 — 회원가입·결제용
- 금융 정보: 결제 정보 — 카카오페이 (외부 처리, 부픽은 저장 안 함)
- 앱 활동: 앱 내 검색 기록 — 분석 리포트 생성용
- 식별자: 사용자 ID — 계정 관리용

**데이터 처리**:
- 전송 시 암호화: ✅ HTTPS
- 사용자가 삭제 요청 가능: ✅ (개인정보처리방침)

### 4-6. 대상 사용자 및 콘텐츠
- 대상: `만 18세 이상` (B2B 비즈니스 도구)
- 광고: 없음

### 4-7. 앱 카테고리
- `비즈니스`

---

## Step 5 — AAB 업로드 + 내부 테스트

1. **테스트 → 내부 테스트 → 새 버전 만들기**
2. `app-release-bundle.aab` 파일 업로드
3. 출시 노트:
   ```
   부픽 v1.0.0 — 첫 출시
   · 매물 데이터 엑셀 업로드·분석
   · 자연어 검색 + 적합도 점수
   · PDF 리포트 생성
   ```
4. **테스터 추가**: 본인 + 베타 사장님 5~10명 이메일 등록
5. **저장** → **검토** → **출시 시작**

→ 테스터들에게 옵트인 URL 전달, 설치 후 동작 확인 (특히 카카오 로그인·결제)

## Step 6 — 프로덕션 출시

내부 테스트 통과 후:
1. **프로덕션 → 새 버전 만들기**
2. 같은 AAB 승격 (또는 새 빌드 업로드)
3. **롤아웃 비율**: 처음엔 20% 권장 → 문제 없으면 100%
4. **저장 → 검토 → 출시**

Google 검수: **1~7일** (보통 2~3일). 거절 사유로 흔한 것:
- 개인정보처리방침 URL 404 — `/privacy` 살아있는지 확인
- 데이터 안전성 누락 — 수집하는 모든 항목 빠짐없이 신고
- 스크린샷에 placeholder 텍스트
- 앱 이름과 스토어 이름 불일치

---

## TWA Custom Tab — 결제·로그인 동작 방식

부픽은 **카카오 로그인·카카오페이**를 그대로 쓸 수 있는 큰 장점:
- TWA 내부에서 외부 OAuth/결제 페이지 → **Chrome Custom Tab**으로 자동 열림
- Custom Tab 은 사용자의 Chrome 쿠키·세션 그대로 사용
- 결제 완료 후 `boo-pick.vercel.app` 도메인으로 deep link redirect → TWA로 복귀

→ Google Play IAP 강제 적용 안 됨 (TWA 정책상 허용됨, B2B 도구 + 외부 결제는 합법)

---

## 트러블슈팅

### 출시 후 앱 열면 주소창 뜸 (TWA 실패)
→ `assetlinks.json`의 SHA-256이 APK 서명과 다름. 또는 Vercel이 캐시. 해결:
1. `https://boo-pick.vercel.app/.well-known/assetlinks.json` 직접 열어서 SHA-256 확인
2. APK 서명 SHA-256과 비교 (`bubblewrap fingerprint`)
3. 다르면 assetlinks.json 갱신 후 푸시
4. APK 다시 설치 (캐시 클리어)

### 카카오 로그인 후 redirect 안 됨
→ TWA의 deep link intent filter 누락. `twa-manifest.json` 의 `webManifestUrl`이 맞는지 확인. 또는 카카오 콘솔의 Redirect URI 에 `https://boo-pick.vercel.app/auth/callback` 있는지 재확인.

### "이 앱은 출시할 수 없습니다 — 개인정보처리방침이 부적절합니다"
→ `/privacy` 페이지 접근 가능한지, 수집 항목·보유기간·제3자 제공 명시 됐는지 확인.

---

## 체크리스트

코드 측:
- [x] manifest.json — 새 브랜드 색
- [x] `.well-known/assetlinks.json` 스캐폴드
- [ ] 스크린샷 캡처 (사장님)
- [ ] 기능 그래픽 1024×500 (사장님)

도구 셋업:
- [ ] Java 17 + Android SDK 설치
- [ ] Bubblewrap CLI 설치
- [ ] TWA 프로젝트 생성 + AAB 빌드

Play Console:
- [ ] $25 결제 + 사업자 인증
- [ ] 앱 생성 + 메타데이터 입력
- [ ] 콘텐츠 등급·데이터 안전성 설문
- [ ] AAB 업로드 + 내부 테스트
- [ ] SHA-256 → assetlinks.json 갱신
- [ ] 프로덕션 출시

---

## 다음 단계 (Phase 2)

Google Play 안착되고 다운로드 100+ / B2B 가입 50+ 정도 검증되면:
1. Apple Developer Program 가입 ($99/년)
2. Capacitor로 iOS 빌드
3. Apple 3.1.3(b) B2B 예외 신청 (외부 결제 허용)
4. iOS App Store 제출

이건 별도 가이드로 정리할 예정.
