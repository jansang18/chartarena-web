# 실시간 랭킹 켜기 (Firebase · 5분)

랭킹 화면은 기본은 **데모(가상 참가자)** 로 동작합니다.
아래 5단계로 Firebase를 붙이면 **실제 플레이어끼리의 실시간 랭킹**으로 바뀝니다.
(무료 Spark 요금제로 충분 · 신용카드 불필요)

## 1) 프로젝트 만들기
1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 이름 입력(예: `chartarena`) → 생성.

## 2) 익명 로그인 켜기
2. 왼쪽 **빌드 → Authentication → 시작하기** → **Sign-in method** 탭 → **익명(Anonymous)** → 사용 설정 → 저장.

## 3) Firestore 만들기
3. 왼쪽 **빌드 → Firestore Database → 데이터베이스 만들기** → 위치(asia-northeast3 서울 권장) → **프로덕션 모드**로 시작.

## 4) 보안 규칙 붙여넣기
Firestore의 **규칙(Rules)** 탭에 아래를 그대로 붙여넣고 **게시**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{uid} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.points is number
        && request.resource.data.nick is string
        && request.resource.data.nick.size() <= 12;
    }
    // 길드: 누구나 읽기, 로그인 사용자는 생성/수정(가입·응원·기여 반영),
    // 삭제는 길드장만 (마지막 멤버가 나가면 자동 삭제)
    match /guilds/{gid} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.name is string
        && request.resource.data.name.size() <= 14;
      allow update: if request.auth != null;
      allow delete: if request.auth != null
        && resource.data.ownerUid == request.auth.uid;
    }
  }
}
```
> 누구나 랭킹·길드를 **읽을** 수 있고, 로그인한 사용자는 **자기 문서(scores/본인UID)만** 쓸 수 있습니다.
> 길드는 가입·응원·기여도 반영을 위해 로그인 사용자면 문서를 수정할 수 있게 열어둡니다(교육용 데모라 허용).
> (가상 포인트 교육용 게임이라 자기 점수 부풀리기는 막지 않습니다 — 큰 문제 아님)

> ⚠️ **길드 기능을 쓰려면 이 규칙을 꼭 다시 게시하세요.** `guilds` 규칙이 없으면
> 실시간 길드 생성·가입이 막히고, 앱은 자동으로 데모(가짜 길드)로 표시됩니다.

## 5) 설정값 복사 → 코드에 붙여넣기
1. **프로젝트 설정(⚙️) → 일반 → 내 앱 → 웹앱 추가(`</>`)** → 앱 등록.
2. 나오는 `firebaseConfig` 값을 복사.
3. `index.html`(과 `landscape.html`) 맨 위 `var FB_CONFIG = {...}` 에 붙여넣기:

```js
var FB_CONFIG = {
  apiKey: "AIza...",
  authDomain: "chartarena-xxxx.firebaseapp.com",
  projectId: "chartarena-xxxx",
  appId: "1:...:web:..."
};
```

저장 → 커밋/푸시하면 랭킹 상단이 **🌐 실시간 랭킹** 으로 바뀌고,
플레이해서 오른 포인트(자산)가 실제 순위에 반영됩니다.

> 이 config 값을 저에게 주시면 제가 코드에 넣고 배포·검증까지 해드릴게요. (apiKey는 웹앱에 공개돼도 되는 값이라 규칙만 잘 걸려 있으면 안전합니다.)

## 랭킹 기준
- **자산**: 지금까지 번 포인트(getBalance) — 게임/배틀로 늘어남
- **승률**: 이긴 판 / 전체 판
- **최고**: 한 판 최고 획득 포인트
