/**
 * PartyShowcase - 예시 파티 쇼케이스 유틸리티
 *
 * F0-1: 공개 파티 6건 미만이면 실제 뒤에 부족분만 예시, 6건 이상은 예시 없음
 * F0-2: 예시 가명/주소 및 외부 이미지 의존 제거 - 로컬 assets/ 자체 제작 SVG 사용
 *
 * 계약:
 * - window.PartyShowcase.build(liveParties) 순수 함수 제공
 * - 최소 상수 MIN_DISPLAY_COUNT = 6
 * - 반환 배열의 각 항목에 isExample: true, 고유 예시 id(example-*) 부여
 * - 실제 데이터(liveParties) 원본 배열/객체 변형 금지 (전체 필드 보존 복사)
 * - 예시 파티: 신청 불가(버튼 "신청 오픈 예정" 비활성), 찜/공유 숨김, "예시" 배지 표시
 * - 호출 간 예시 객체 공유 없음 (매 호출마다 신규 복제)
 */

(function () {
  'use strict';

  // 최소 표시 개수 상수 (Q-01 결정: 6건)
  var MIN_DISPLAY_COUNT = 6;

  // 예시 파티 기본 데이터 소스 (불변 취급 - 복제해서 사용)
  // 중립적 설명: 검증 불가한 실적 주장(결혼 확정, 연프 출연진, 실제 운영 등) 제거
  var EXAMPLE_PARTIES_SOURCE = [
    {
      id: 1,
      title: "[양재] 프라이빗 소셜 라운지 모임",
      region: "강남/서초",
      category: "소개팅",
      days: ["금", "토", "일"],
      recruit: 10,
      currentRecruit: 8,
      venue: "OO 라운지 양재 (예시)",
      address: "서울 서초구 일대 (가명)",
      desc: "편안한 분위기에서 새로운 사람들과 자연스럽게 대화할 수 있는 소셜 모임입니다.",
      images: [
        "assets/party-example-01.svg",
        "assets/party-example-02.svg"
      ],
      badges: ["NEW", "이벤트"],
      isFeatured: true
    },
    {
      id: 2,
      title: "[강남] 프리미엄 와인 네트워킹 파티",
      region: "강남/서초",
      category: "소셜파티",
      days: ["목", "금", "토"],
      recruit: 10,
      currentRecruit: 10,
      venue: "OO 와인바 강남 (예시)",
      address: "서울 강남구 일대 (가명)",
      desc: "와인과 핑거푸드를 즐기며 여유롭게 네트워킹하는 파티입니다.",
      images: [
        "assets/party-example-01.svg",
        "assets/party-example-03.svg"
      ],
      badges: ["마감임박"],
      isFeatured: true
    },
    {
      id: 3,
      title: "[을지로] 힙한 분위기의 혼술바",
      region: "종로/광화문",
      category: "혼술바",
      days: ["월", "화", "수", "목", "금", "토", "일"],
      recruit: 8,
      currentRecruit: 5,
      venue: "OO 혼술바 을지로 (예시)",
      address: "서울 중구 일대 (가명)",
      desc: "혼자 방문해도 편안하게 즐길 수 있는 분위기의 혼술바입니다.",
      images: [
        "assets/party-example-02.svg",
        "assets/party-example-03.svg"
      ],
      badges: ["HOT"],
      isFeatured: false
    },
    {
      id: 4,
      title: "[신촌] 대화형 소셜링 모임",
      region: "신촌/이대",
      category: "소개팅",
      days: ["수", "금", "토"],
      recruit: 12,
      currentRecruit: 9,
      venue: "XX 소셜라운지 신촌 (예시)",
      address: "서울 서대문구 일대 (가명)",
      desc: "어색함 없이 대화할 수 있도록 구성된 소셜링 프로그램입니다.",
      images: [
        "assets/party-example-01.svg",
        "assets/party-example-03.svg"
      ],
      badges: ["NEW"],
      isFeatured: false
    },
    {
      id: 5,
      title: "[합정] 편안한 와인 파티",
      region: "홍대/마포",
      category: "소셜파티",
      days: ["금", "토"],
      recruit: 10,
      currentRecruit: 7,
      venue: "XX 와인파티룸 합정 (예시)",
      address: "서울 마포구 일대 (가명)",
      desc: "역세권 와인바에서 맛과 분위기를 즐기는 파티입니다.",
      images: [
        "assets/party-example-03.svg"
      ],
      badges: ["이벤트"],
      isFeatured: true
    },
    {
      id: 6,
      title: "[신림] 감성 아지트 혼술바",
      region: "관악/신림",
      category: "혼술바",
      days: ["월", "화", "수", "목", "금", "토"],
      recruit: 8,
      currentRecruit: 6,
      venue: "XX 아지트 신림 (예시)",
      address: "서울 관악구 일대 (가명)",
      desc: "감성적인 조명과 음악이 있는 편안한 혼술 공간입니다.",
      images: [
        "assets/party-example-02.svg"
      ],
      badges: ["NEW"],
      isFeatured: false
    },
    {
      id: 7,
      title: "[문래] 창작촌 소셜 파티",
      region: "여의도/영등포",
      category: "소셜파티",
      days: ["목", "금", "토"],
      recruit: 10,
      currentRecruit: 8,
      venue: "OO 소셜라운지 문래 (예시)",
      address: "서울 영등포구 일대 (가명)",
      desc: "문래 창작촌 감성 공간에서 즐기는 소셜 파티입니다.",
      images: [
        "assets/party-example-01.svg"
      ],
      badges: [],
      isFeatured: false
    },
    {
      id: 8,
      title: "[을지로] 퇴근길 혼술바",
      region: "명동/을지로",
      category: "혼술바",
      days: ["월", "화", "수", "목", "금"],
      recruit: 6,
      currentRecruit: 4,
      venue: "XX 혼술바 을지로 (예시)",
      address: "서울 중구 일대 (가명)",
      desc: "퇴근 후 가볍게 한잔하기 좋은 혼술바입니다.",
      images: [
        "assets/party-example-02.svg"
      ],
      badges: [],
      isFeatured: false
    }
  ];

  /**
   * 객체 얕은 복제 (모든 자체 속성 보존)
   * @param {Object} obj
   * @returns {Object}
   */
  function shallowClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    var cloned = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = obj[key];
      }
    }
    return cloned;
  }

  /**
   * 배열 깊은 복제 (1단계: 배열 자체 + 요소 얕은 복제)
   * 중첩 객체/배열도 얕은 복제로 보호
   * @param {Array} arr
   * @returns {Array}
   */
  function cloneArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (item) {
      if (item && typeof item === 'object') {
        return shallowClone(item);
      }
      return item;
    });
  }

  /**
   * 예시 파티 1개를 새로 생성 (호출마다 독립 객체)
   * @param {Object} source - 원본 소스 데이터
   * @param {number} index - 인덱스 (exampleId 생성용)
   * @returns {Object} isExample=true, id=exampleId(문자열) 부여된 새 객체
   */
  function createExampleParty(source, index) {
    var cloned = shallowClone(source);
    // 배열/객체 필드도 별도 복제
    cloned.days = cloneArray(source.days);
    cloned.images = cloneArray(source.images);
    cloned.badges = cloneArray(source.badges);
    // 예시 식별 필드: id를 문자열 example-*로 통일해 실제 id(숫자)와 절대 충돌 방지
    var exampleId = 'example-' + (index + 1); // example-1 ~ example-8
    cloned.id = exampleId;
    cloned.exampleId = exampleId;
    cloned.isExample = true;
    return cloned;
  }

  /**
   * 공개 파티 목록에 예시 파티를 보충해 반환
   * @param {Array} liveParties - 서버에서 받은 실제 공개 파티 배열 (변형하지 않음)
   * @returns {Array} 실제 파티(전체 필드 보존) + 필요시 예시 파티가 합쳐진 새 배열 (최소 6개, 실제 파티 우선)
   */
  function build(liveParties) {
    // 입력 검증: 배열이 아니면 빈 배열로 처리
    var actualParties = Array.isArray(liveParties) ? liveParties : [];

    // 실제 파티 개수
    var actualCount = actualParties.length;

    // 실제 파티가 6건 이상이면 예시 없이 실제만 반환 (전체 필드 보존 복제)
    if (actualCount >= MIN_DISPLAY_COUNT) {
      return actualParties.map(function (p) {
        // 얕은 복제로 모든 자체 속성 보존, isExample만 false 추가
        var cloned = shallowClone(p);
        cloned.isExample = false;
        return cloned;
      });
    }

    // 부족분 계산
    var need = MIN_DISPLAY_COUNT - actualCount;

    // 실제 파티 복제 (전체 필드 보존, 원본 보호)
    var result = actualParties.map(function (p) {
      var cloned = shallowClone(p);
      cloned.isExample = false;
      return cloned;
    });

    // 예시 파티에서 부족분만큼 추가 (매 호출마다 신규 생성으로 공유 방지)
    for (var i = 0; i < need && i < EXAMPLE_PARTIES_SOURCE.length; i++) {
      result.push(createExampleParty(EXAMPLE_PARTIES_SOURCE[i], i));
    }

    return result;
  }

  // 전역 노출 (UI 에이전트가 이 함수 계약으로 화면 연결)
  window.PartyShowcase = {
    MIN_DISPLAY_COUNT: MIN_DISPLAY_COUNT,
    build: build
  };
})();