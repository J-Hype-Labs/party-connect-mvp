# Party Connect (파티커넥트) MVP

[lumiconnect.cloud](https://www.lumiconnect.cloud) 서비스를 벤치마킹하여 제작한 2030 오프라인 소셜링 파티 & 혼술바 예약 플랫폼 MVP입니다.

## ✨ 주요 기능
- **히어로 프로모션 배너**: 자동 슬라이드, 일시정지/재생 컨트롤
- **다차원 실시간 필터링**:
  - 지역 선택 모달 (서울 17개 구역, 경기/인천, 지방 세부 지역)
  - 요일별 필터 (월~일)
  - 카테고리 필터 (혼술바, 소개팅, 소셜파티)
- **실시간 인터랙션**:
  - 찜하기 (❤️ 하트 토글 및 토스트 알림)
  - 파티 상세 모달 및 무료 체험단 신청 접수
- **반응형 디자인**: 모바일 및 데스크톱 맞춤형 UI/UX (Pretendard 폰트 + Tailwind CSS)

## 🛠️ 기술 스택
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Pretendard
- **Design Intelligence**: UI/UX Pro Max
- **Deployment**: GitHub Pages (GitHub Actions 자동 배포)

## 🚀 로컬 실행 방법
```bash
# 로컬 파이썬 웹서버 실행
python3 -m http.server 3000
```
브라우저에서 `http://localhost:3000`으로 접속합니다.
