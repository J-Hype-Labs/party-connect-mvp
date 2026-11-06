// Extracted party data from index.html - shared across home and party-connect pages

var PARTY_LIST = [
  {
    id: 1,
    title: "[양재] 올해만 3커플 결혼 확정! 연프 출연진도 내돈내산하는 바로 그곳",
    region: "강남/서초",
    category: "소개팅",
    days: ["금", "토", "일"],
    recruit: 10,
    currentRecruit: 8,
    venue: "솔로몬클럽 양재본점",
    address: "서울 서초구 양재동 12-4",
    desc: "💖 올해만 벌써 3커플 결혼 확정! 📺 연애 프로그램 출연진도 '내돈내산'으로 방문하는 프리미엄 소셜 클럽",
    images: [
      "https://qdoyiwzgysussttzvzxn.supabase.co/storage/v1/object/public/hospital-lumi-connect-campaigns/05427d2a-ad94-40e8-80c2-7455382cb8f4/6d6db1aa-a8f4-4c53-883f-1608bc64bdaa/thumbnail-32c8c8ef-4334-4b0e-a8c5-c2049cd794ed.jpg",
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80"
    ],
    badges: ["NEW", "이벤트"],
    isFeatured: true
  },
  {
    id: 2,
    title: "[강남] 제로라운지의 두번째, 프리미엄 와인파티 제로러브",
    region: "강남/서초",
    category: "소셜파티",
    days: ["목", "금", "토"],
    recruit: 10,
    currentRecruit: 10,
    venue: "제로러브 라운지",
    address: "서울 강남구 테헤란로 14길 8",
    desc: "고급 와인 4종과 핑거푸드가 무제한 제공되는 2030 프리미엄 소셜 네트워킹 와인파티",
    images: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=600&q=80"
    ],
    badges: ["마감임박"],
    isFeatured: true
  },
  {
    id: 3,
    title: "[을지로] 제주보름 🌕 힙한 을지로에서 즐기는 편안한 혼술바!",
    region: "종로/광화문",
    category: "혼술바",
    days: ["월", "화", "수", "목", "금", "토", "일"],
    recruit: 8,
    currentRecruit: 5,
    venue: "제주보름 을지로점",
    address: "서울 중구 마른내로 42",
    desc: "사장님이 정말 친절하시고, 처음 온 사람도 편안한 분위기에 즐길 수 있는 힙지로 최고의 혼술바",
    images: [
      "https://qdoyiwzgysussttzvzxn.supabase.co/storage/v1/object/public/hospital-lumi-connect-campaigns/05427d2a-ad94-40e8-80c2-7455382cb8f4/83fed0a3-ca66-4928-81ba-2c3f3d19f1e2/thumbnail-764360e4-a9ee-40d3-a763-e523b938625a.jpg",
      "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80"
    ],
    badges: ["HOT"],
    isFeatured: false
  },
  {
    id: 4,
    title: "[신촌] 내향인들의 프리미엄 대화형 소셜링, 큐피드파티",
    region: "신촌/이대",
    category: "소개팅",
    days: ["수", "금", "토"],
    recruit: 12,
    currentRecruit: 9,
    venue: "큐피트파티 신촌점",
    address: "서울 서대문구 연세로7안길 10-4",
    desc: "어색함 없는 1:1 로테이션 대화 카드와 편안한 분위기 조성. 내향인(I)도 200% 만족하는 소셜링",
    images: [
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"
    ],
    badges: ["NEW"],
    isFeatured: false
  },
  {
    id: 5,
    title: "[합정] 하이엔드 와인파티, 편안하고 자연스러운 파티",
    region: "홍대/마포",
    category: "소셜파티",
    days: ["금", "토"],
    recruit: 10,
    currentRecruit: 7,
    venue: "살롱드솔내 합정",
    address: "서울 마포구 양화로6길 57",
    desc: "합정역 5분 역세권! 실제 운영되는 고급 와인바에서 열리는 맛과 분위기 모두 보장된 시크릿 파티",
    images: [
      "https://qdoyiwzgysussttzvzxn.supabase.co/storage/v1/object/public/hospital-lumi-connect-campaigns/05427d2a-ad94-40e8-80c2-7455382cb8f4/0343b81f-e139-4aa0-8f4d-3502e33bcd4d/thumbnail-99b0bfee-ef2d-4fe2-869c-a57b20639e9e.jpg"
    ],
    badges: ["이벤트"],
    isFeatured: true
  },
  {
    id: 6,
    title: "[신림] 야화 신림점 신규 입점! 분위기 아주 좋아요",
    region: "관악/신림",
    category: "혼술바",
    days: ["월", "화", "수", "목", "금", "토"],
    recruit: 8,
    currentRecruit: 6,
    venue: "야화 혼술바 신림점",
    address: "서울 관악구 신림로59길 14",
    desc: "감성 조명과 음악, 혼자 와도 사장님과 도란도란 이야기 나누며 힐링할 수 있는 따뜻한 심야 아지트",
    images: [
      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80"
    ],
    badges: ["NEW"],
    isFeatured: false
  },
  {
    id: 7,
    title: "[문래] 제로라운지 내향인 도파민파티",
    region: "여의도/영등포",
    category: "소셜파티",
    days: ["목", "금", "토"],
    recruit: 10,
    currentRecruit: 8,
    venue: "문래 제로라운지",
    address: "서울 영등포구 도림로 432",
    desc: "문래 창작촌의 힙한 감성 공간에서 맛있는 핑거푸드와 함께 부담 없이 즐기는 웰컴 소셜링",
    images: [
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80"
    ],
    badges: [],
    isFeatured: false
  },
  {
    id: 8,
    title: "[을지로] 43번지 혼술바 을지로점, 퇴근 후 혼술하기 좋은 곳!",
    region: "명동/을지로",
    category: "혼술바",
    days: ["월", "화", "수", "목", "금"],
    recruit: 6,
    currentRecruit: 4,
    venue: "43번지 혼술바",
    address: "서울 중구 을지로11길 19",
    desc: "퇴근길 가볍게 한잔! 하루의 피로를 풀어주는 웰컴 드링크와 편안한 좌석 배치",
    images: [
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80"
    ],
    badges: [],
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
