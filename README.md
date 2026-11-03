# Party Connect (파티커넥트) MVP

🔗 **라이브 데모:** https://j-hype-labs.github.io/party-connect-mvp/

[lumiconnect.cloud](https://www.lumiconnect.cloud) 서비스를 벤치마킹하여 제작한 2030 오프라인 소셜링 파티 & 혼술바 예약 플랫폼 MVP입니다.

## ✨ 주요 기능
- **히어로 프로모션 배너**: 자동 슬라이드, 일시정지/재생 컨트롤
- **다차원 실시간 필터링**:
  - 지역 선택 모달 (서울 17개 구역, 경기/인천, 지방 세부 지역)
  - 요일별 필터 (월~일)
  - 카테고리 필터 (혼술바, 소개팅, 소셜파티)
- **실시간 인터랙션**:
  - 찜하기 (❤️ 하트 토글 및 토스트 알림) — `localStorage`에 저장되어 새로고침 후에도 유지
  - 파티 상세 모달 (일정·정원·주소·남은 자리, 이미지 갤러리)
  - 무료 체험단 신청 폼 (이름·연락처·요일·개인정보 동의, 유효성 검사, 접수 완료 화면)
- **후기**: 검증된 실제후기 그리드, 전체보기/접기 토글
- **접근성/UX**: ESC·배경 클릭으로 모달 닫기, 모달 열림 시 스크롤 잠금, ARIA 속성, 키보드 탐색
- **반응형 디자인**: 모바일 및 데스크톱 맞춤형 UI/UX (Pretendard 폰트 + Tailwind CSS)

## 🛠️ 기술 스택
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Pretendard
- **Design Intelligence**: UI/UX Pro Max
- **Deployment**: GitHub Pages (main 브랜치 push 시 자동 배포)

## 🚀 로컬 실행 방법
```bash
# 로컬 파이썬 웹서버 실행
python3 -m http.server 3000
```
브라우저에서 `http://localhost:3000`으로 접속합니다.

## 📦 배포
`main` 브랜치에 push하면 GitHub Pages에 자동으로 반영됩니다.

- 배포 URL: https://j-hype-labs.github.io/party-connect-mvp/
- 개발용 파일(`*.png`, `SPECIFICATION.md`, `start.sh`, `.agents`)은 `_config.yml`의 `exclude` 설정으로 배포에서 제외됩니다.
- 배포 상태 확인: `https://api.github.com/repos/hustlinjh/party-connect-mvp/pages/builds/latest`
