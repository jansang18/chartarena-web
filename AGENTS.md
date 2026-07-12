# 차트아레나 (ChartArena) — 웹 디자인 작업 가이드 (for coding agents)

주식 **차트 교육 게임**. 이 저장소 = **웹(HTML/CSS/JS) 빌드**이며, 두 곳으로 나갑니다:
1. **GitHub Pages 라이브**: <https://jansang18.github.io/chartarena-web/> (push하면 자동 배포)
2. **안드로이드 앱에 번들**: `C:\Users\whaak\Desktop\JUSIK\app\src\main\assets\web\` 로 복사되어 WebView로 로드됨 (오프라인). 앱은 별개 저장소이므로, 여기서 디자인만 하고 앱 반영은 사용자가 요청할 때만.

> ⚠️ 포인트/자산은 전부 **가상**(현금 환전 없음)이며 **교육용**입니다. "실제 돈/도박" 문구를 넣지 마세요 (구글플레이 사행성 이슈).

## 파일 지도
- `index.html` = **홈(허브)**. `landscape.html`의 복사본. **홈을 고치면 `landscape.html`을 편집한 뒤 `cp landscape.html index.html`로 재생성**하세요. (16:9 고정 프레임 1672×770, `fit()`으로 스케일)
- `quiz-battle.html` = 차트배틀 로비 + 실시간/1v1/서바이벌 대결 (2.17:1 프레임)
- `game.html` = 솔로 차트예측, `puzzle.html` = 퍼즐, `survival.html` = 최후의1인, `learn.html` = 학습센터, `privacy.html` = 개인정보방침
- 공유 JS: `charts.js`(차트 데이터 풀, ~4.6MB — Read 금지, 편집은 node 스크립트로), `xp.js`(레벨/경험치), `energy.js`(게임횟수)
- `assets/` = 이미지 (캐릭터 hu0~16, 로고, 아이콘, 로딩배경 등)

## 미리보기 (로컬)
브라우저로 `index.html` 등을 그냥 열면 됩니다. 단:
- 첫 로드 시 **로딩 스플래시**(게이지 애니메이션)가 세션당 1회 뜹니다. 스킵하려면 콘솔에서 `sessionStorage.setItem('ca_splash','1')` (배틀은 `ca_splash_b`).
- 첫 실행 시 **캐릭터 선택 오버레이**(`#setup`)가 뜹니다. 스킵하려면 `localStorage.setItem('chartarena_hub_v1', JSON.stringify({nick:'테스터',equip:{ch:'hu0'},setup:true,owned:{char:['hu0'],upg:[]},gems:100}))` 후 새로고침.
- Firebase(실시간 랭킹)는 온라인일 때만 붙습니다. 오프라인/로컬에서도 데모로 안전하게 작동.

## 배포 (push = 라이브)
1. 편집 → (홈이면 `cp landscape.html index.html`) → `git add -A && git commit -m "..." && git push`
2. **git 아이덴티티는 이미 로컬 설정됨** (`jansang18 <jansang18@users.noreply.github.com>`). 개인 이메일이 공개 저장소에 새면 안 됩니다 — 로컬 config 그대로 쓰면 안전.
3. GitHub Pages가 자동 재빌드. 확인: `curl -s -o /dev/null -w "%{http_code}" https://jansang18.github.io/chartarena-web/index.html` → 200.
4. **가끔 빌드가 `building`에서 멈춤** → 빈 커밋으로 재트리거: `git commit --allow-empty -m "rebuild" && git push`. 라이브 파일을 curl로 직접 확인(빌드 API 말고).
5. **에셋 캐시**: Pages는 이미지를 ~10분 캐시. **이미지를 같은 파일명으로 교체하면 URL에 `?v=N`을 올려**야 즉시 반영됩니다 (HTML의 `src="assets/x.png?v=2"` 숫자 증가). 새 파일명은 캐시 문제 없음.

## 테마 (중요 — 디자인 작업의 핵심)
- **홈(`landscape.html`/`index.html`)만 최근 "Claude 채팅풍 라이트(화이트)" 테마로 전환됨**: 따뜻한 크림 배경 + 화이트 카드 + 다크 텍스트 + 테라코타 포인트.
- 색은 `:root` **CSS 변수 토큰**으로 관리: `--bg`(크림 캔버스) `--p1/--p2`(카드면) `--line`(보더) `--tp/--ts/--tm`(텍스트 진/중/연) `--accent`(#C96442 테라코타) + 게임 색 `--gold/--green/--blue/--pink/--purple/--teal/--orange/--red`. **색을 바꿀 땐 우선 토큰을 고치세요.**
- 단, 토큰을 안 쓰고 **하드코딩된 색도 많음**(카드 배경 그라디언트, `.m-shop/.m-rank` 등, `rgba(255,255,255,.x)` 텍스트/보더). 다크→라이트 전환은 토큰 + 하드코딩 둘 다 손봐야 함.
- **아직 다크인 곳**(라이트로 원하면 추가 작업 필요): 홈의 서브뷰(랭킹/차고/여정/훈련 = `.main` 안에서 `go(v)`로 스왑됨), 셋업 화면, 팝업(`#dpop` 출석보상), 그리고 **다른 페이지 전체**(quiz-battle/game/puzzle/survival/learn).
- 캔들 색 규칙(의미색, 바꾸지 말 것): 상승=빨강 계열, 하락=파랑 계열 (한국식). 홈 통계의 up=green/dn=pink는 별개.

## 에셋/로고 규칙
- 로고는 `assets/logo_wordmark.png`(상단바) / `assets/logo.png`(스플래시) / `assets/logo_lockup.png`(배틀로비) — 셋 다 현재 **동일한 사용자 제공 로고**(왕관+캔들+네온, 투명 배경 2.29:1). 교체 시 세 파일 다 바꾸고 HTML의 `?v` 올리기.
- 캐릭터 17종 `hu0~16.png?v=7`, 로딩배경 `loading_bg.jpg?v=2`(사용자 이미지, 16:9).
- 투명 PNG 누끼가 필요하면 `pngjs` 기반 스크립트로 (이 저장소엔 없음 — 원 작업은 별도 scratchpad에서 함).

## 하지 말 것
- `charts.js`를 통째로 Read/편집 (거대 단일 라인). 데이터는 node string-replace로만.
- 개인 이메일로 커밋. 실제 돈/도박 문구 추가.
- 홈 편집 후 `index.html` 재생성을 빠뜨리는 것.
