// Extracted party data from index.html - shared across home and party-connect pages
// NOTE: 모든 업체명·주소는 예시(가명)이며 실제와 무관합니다.
// NOTE: 설명은 검증 불가한 실적 주장(결혼 확정, 연프 출연진, 실제 운영 등)을 제거한 중립적 문구로 수정됨.
// NOTE: 신규 코드는 js/party-showcase.js의 PartyShowcase.build()를 사용하세요. 이 파일은 하위 호환용으로 유지.

var PARTY_LIST = [
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
    isExample: false,
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
    isExample: false,
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
    isExample: false,
    isFeatured: false
  }
];

var REGION_CATEGORIES = [
  {
    id: "all",
    name: "전체 지역",
    subRegions: ["전체"]
  },
  {
    id: "seoul",
    name: "서울",
    subRegions: [
      "전체", "강남/서초", "교대/사당", "홍대/마포", "용산/이태원",
      "명동/을지로", "잠실/송파", "강북/성북", "마포/상암", "여의도/영등포",
      "강서/목동", "건대/성수/왕십리", "강동/천호", "종로/광화문",
      "신촌/이대", "압구정/청담", "관악/신림", "노원/도봉"
    ]
  },
  {
    id: "gyeonggi",
    name: "경기·인천",
    subRegions: ["전체", "일산/파주", "인천/부천", "수원/성남", "안양/군포", "하남/광주"]
  },
  {
    id: "others",
    name: "지방/기타",
    subRegions: ["전체", "대전/충청", "대구/경북", "부산/경남", "광주/전라", "제주"]
  }
];

var DAYS = ["전체", "월", "화", "수", "목", "금", "토", "일"];
var CATEGORIES = ["전체", "혼술바", "소개팅", "소셜파티"];