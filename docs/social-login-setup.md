# 소셜 로그인 연결 — 2026-09-20

## 현재 상태

카카오·네이버·Google 버튼, 인증 클라이언트, 카카오·네이버 서버 브리지 코드와 프로토콜 테스트를 추가했다. **실제 제공자 연결 및 실계정 로그인 검증은 아직 완료하지 않았다.** `social-config.js`는 `endpoint:''`, `googleEnabled:false`이며 화면에 준비 중을 표시한다. 게스트 입장은 계속 가능하다.

TENMEET의 최신 `origin/preview`에 세 제공자 UI와 `signInWithOAuth` 구현이 확인됐다. TENMEET은 Supabase의 `google`, `kakao`, `custom:naver`를 사용한다. 차트아레나는 기존 Firebase 회원/게임 연결을 유지하므로 TENMEET의 로그인 화면 구성과 계정 선택·중복 클릭 방지를 참고했다. TENMEET의 키·계정·설정·데이터는 복사하거나 변경하지 않았다. TENMEET 운영 브랜치(main)와 Preview는 다르며 코드 존재가 제공자 운영 활성화를 증명하지 않는다.

## 연결 전 필요한 소유자 설정

차트아레나 Firebase 프로젝트 `chartarena-3051a`에 접근 가능한 계정이 필요하다. 이전 콘솔 세션은 프로젝트 설정에 접근하지 못했다. 이메일 로그인도 `PASSWORD_LOGIN_DISABLED` 상태였다.

1. 카카오/네이버 개발자 콘솔에 **차트아레나용** 앱을 등록한다. 서비스 이름·도메인·개인정보 처리방침을 실제 서비스에 맞춰 기재한다. TENMEET 앱의 비밀 키를 재사용하지 않는다.
2. 카카오 로그인 활성화, Web 도메인 등록, Client Secret 활성화 및 REST API 키 설정. Callback:
   `https://asia-northeast3-chartarena-3051a.cloudfunctions.net/socialAuth/callback/kakao`
3. 네이버 서비스 URL `https://jansang18.github.io/chartarena-web/`, Callback:
   `https://asia-northeast3-chartarena-3051a.cloudfunctions.net/socialAuth/callback/naver`
   별도 개인정보 scope를 코드에서 요청하지 않는다. 필요한 최소 권한만 등록하고 네이버의 서비스 검수/공개 상태를 확인한다.
4. Firebase Authentication의 Google 제공자를 활성화하고 프로젝트 지원 이메일·동의 화면을 설정한다. `jansang18.github.io`를 승인 도메인에 포함한다. Firebase 기본 callback은 `https://chartarena-3051a.firebaseapp.com/__/auth/handler`이다.
5. Functions/Firestore/Secret Manager의 요금제와 예상 사용 비용을 소유자가 확인한다. 이 작업에서는 결제 계정, 요금제, IAM, 비밀 키를 변경하지 않았다.

## 카카오·네이버 서버 배포

`firebase.social.json`은 기존 게임 Firebase와 구분한 명시적 배포 설정이다. 인증 임시 데이터는 **별도 이름의 Firestore 데이터베이스 `chartarena-auth`** 를 사용한다. 기존 게임 DB에 임시 티켓을 저장하지 않는다.

- 소유자 권한으로 Firestore Native 데이터베이스 `chartarena-auth`를 asia-northeast3에 생성한다. client 접근은 `functions/social-auth/firestore.rules`의 deny-all 규칙으로 막는다.
- `oauthEphemeral` collection group의 `expireAt` 필드에 TTL을 설정한다. TTL 지연과 관계없이 코드는 자체 만료시간을 검증한다.
- Functions 런타임 서비스 계정에 해당 DB 작업과 본인 서비스 계정 서명에 필요한 최소 권한을 부여한다. Admin SDK `createCustomToken` 서명 및 Secret Manager 접근을 실제 배포에서 확인한다. 서비스 계정 JSON을 저장소에 넣지 않는다.
- 비밀 값은 콘솔/CLI Secret Manager 입력으로만 등록한다. 채팅, `social-config.js`, git에 넣지 않는다.

```powershell
npm ci --ignore-scripts --prefix functions/social-auth
firebase functions:secrets:set KAKAO_REST_API_KEY --project chartarena-3051a
firebase functions:secrets:set KAKAO_CLIENT_SECRET --project chartarena-3051a
firebase functions:secrets:set NAVER_CLIENT_ID --project chartarena-3051a
firebase functions:secrets:set NAVER_CLIENT_SECRET --project chartarena-3051a
firebase deploy --config firebase.social.json --only functions:social-auth,firestore:chartarena-auth --project chartarena-3051a
```

Node 22 런타임. `SOCIAL_AUTH_BASE_URL`과 `SOCIAL_AUTH_APP_URL` 기본값은 위 주소다. 배포 주소가 달라지면 서버 파라미터와 제공자 Callback을 모두 일치시킨다. 기본 테스트는 외부 서비스와 통신하지 않는다.

배포 후 `/config`의 두 provider가 true인 것을 확인한다. `social-config.js`의 endpoint를 배포된 HTTPS 함수 URL로 설정한다. Google은 콘솔 설정을 확인한 뒤 `googleEnabled:true`로 바꾼다. `node scripts/version-assets.cjs` 및 아래 검증 후 프런트엔드를 배포한다. 테스트 계정에서 실제 성공/취소/재로그인을 확인하기 전 일반 이용자에게 활성화를 공지하지 않는다.

## 동작과 제한

- 카카오·네이버: 같은 탭에서 제공자 동의 → 서버 code 교환 → provider `/me` 확인 → 1회 티켓 → Firebase custom token 로그인.
- OAuth state + Secure/HttpOnly/SameSite=Lax 쿠키, 요청당 무작위 브라우저 검증값을 함께 확인한다. 티켓만 탈취해도 검증값 없이는 교환되지 않는다. provider token/custom token을 URL에 넣지 않는다.
- state 만료 10분, 티켓 만료 2분. 트랜잭션으로 한 번만 소비한다. 원본 토큰·이메일·이름·프로필 사진을 임시 DB에 저장하지 않는다. UID는 제공자별 subject의 SHA-256으로 구분한다.
- Google은 Firebase SDK의 팝업 인증이다. 인앱 브라우저/팝업 차단 시 외부 Chrome·Safari 안내를 제공한다. Google 장애 또는 차단 시 다른 계정으로 임의 전환하지 않는다.
- 모든 로그인은 오류를 성공으로 처리하지 않는다. localhost/file에서는 운영 Firebase/소셜 서버를 호출하지 않는다.
- 게임 재화·진행은 현재 **기기 로컬 저장**이다. 소셜 로그인은 게스트와 회원의 지갑 병합, 서버 지갑, 계정별 저장 분리를 구현하지 않는다. 회원을 바꿔도 같은 기기의 저장 데이터가 유지됨을 UI에서 안내한다.
- 세션 취소, 요청 만료, 잘못된 state/쿠키/검증값, 티켓 재사용, 다른 Origin 요청, 외부 redirect를 테스트한다. 실제 제공자 HTTP·Firestore 동시성·IAM 서명은 배포 후 통합 검증이 필요하다.
- 의존성 `gaxios@6.7.1`이 사용하는 uuid v4는 보안 수정된 CommonJS 호환 `uuid@11.1.1`로 제한했다. 2026-09-20 설치 후 npm audit 0건, require 및 v4 실행을 확인했다.

## 검증

```powershell
node --test tests/*.test.cjs
node tests/verify-build.cjs
npm audit --prefix functions/social-auth
git diff --check
```

실계정 테스트: 제공자별 동의 성공/거부 → 원래 선택한 방으로 복귀 → 새로고침 세션 유지 → 로그아웃 → 다른 계정 재로그인. iOS Safari/Android Chrome과 카카오 인앱 브라우저에서 별도 검증한다. Cloud Functions/Firestore/로그 보존 비용과 부하 정책도 활성화 전에 확인한다.

공식 문서: [카카오 REST](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [네이버 로그인](https://developers.naver.com/docs/login/api/api.md), [Firebase custom token](https://firebase.google.com/docs/auth/admin/create-custom-tokens), [Firebase Google](https://firebase.google.com/docs/auth/web/google-signin).
