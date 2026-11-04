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
- **CI/CD**: GitHub Actions (JSX 문법 검증, HTML 구조 검증, 외부 의존성 검증, 배포 검증)

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
- 배포 상태 확인: `https://api.github.com/repos/J-Hype-Labs/party-connect-mvp/pages/builds/latest`

## 🧪 CI/CD 파이프라인
```yaml
# .github/workflows/ci.yml
```
- **Validate Job**: HTML 구조 검증, JSX 문법 검증(괄호 균형/Python), 외부 CDN 의존성 확인, 배포 설정 검증
- **Deploy-Check Job**: GitHub Pages 배포 대기, 라이브 URL 접근성 확인(HTTP 200), 콘텐츠 렌더링 검증
- **Playwright E2E Tests** (non-blocking): 모바일/데스크톱 렌더링, 모달 동작, 필터/신청 흐름, 콘솔 에러 검사 (`tests/app.spec.js`)

## 📋 주요 변경 이력
- **2026-11-05**: P0 배포 안정화 완료 - GitHub Actions CI 파이프라인 통과(검증: `dfef3f0`), JSX 문법 검증 자동화, 운영 URL HTTP 200 확인
- **2026-11-04**: 관리자 대시보드 구현 (파티/신청/후기 관리, 통계)
- **2026-11-04**: Phase 2 사용자/소셜 기능 추가 (소셜 로그인, 알림센터, 후기 작성, 마이페이지, 지도 모달)
- **2026-11-03**: MVP 핵심 기능 완성 (필터링, 찜하기, 상세 모달, 후기 시스템)

## ✅ P0 검증 결과 요약 (2026-11-05)

| 검증 항목 | 도구 | 결과 | 비고 |
|-----------|------|------|------|
| JSX 문법 (괄호 균형) | Python 스크립트 | ✅ PASS | `scripts/validate-jsx-ci.py` |
| HTML 구조 (필수 요소) | grep | ✅ PASS | root, babel, ReactDOM, App, CDNs |
| 외부 CDN 의존성 | curl | ✅ PASS | 5개 CDN 모두 200/302 응답 |
| 배포 설정 | file check | ✅ PASS | _config.yml, .gitignore 존재 |
| GitHub Actions Validate | ubuntu-latest | ✅ PASS | Run ID: 41896956569 |
| 운영 URL 접근성 | curl | ✅ PASS | HTTP 200 |
| 운영 URL 콘텐츠 | curl + grep | ✅ PASS | #root, text/babel, 파티커넥트 |
| Playwright E2E 테스트 | 작성 완료 | ⏸️ Non-blocking | CI 환경 제약으로 non-blocking 구성 |

**최종 커밋**: `dfef3f0` - CI 통과, 운영 URL 검증 완료