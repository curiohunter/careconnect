// 마이그레이션 유틸리티 함수들
export * from './mealPlanMigrationUtils';

// 날짜 유틸리티 함수들
/**
 * 안전한 날짜 파싱 함수
 * @param dateValue - 날짜 값 (Date, string, number, undefined, null 등)
 * @param fallback - 파싱 실패 시 대체 텍스트 (기본값: '날짜 정보 없음')
 * @returns 포맷된 날짜 문자열 또는 대체 텍스트
 */
export const safeFormatDate = (dateValue: any, fallback: string = '날짜 정보 없음'): string => {
  try {
    if (!dateValue) {
      return fallback;
    }

    let date: Date;
    
    // Firebase Timestamp 객체인 경우
    if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // 이미 Date 객체인 경우
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // 문자열이나 숫자인 경우
    else {
      date = new Date(dateValue);
    }

    // Invalid Date 체크
    if (isNaN(date.getTime())) {
      return fallback;
    }

    return date.toLocaleDateString();
  } catch (error) {
    console.warn('날짜 파싱 오류:', error, 'dateValue:', dateValue);
    return fallback;
  }
};

// 한국시간(KST, UTC+9) 기준 날짜 유틸리티 함수들

/**
 * 한국시간 기준으로 이번주 날짜 배열을 생성하는 함수
 * @returns 월요일부터 일요일까지 7개의 Date 객체 배열 (한국시간 기준)
 */
export const getKSTWeekDates = (): Date[] => {
  // 현재 시간을 한국시간으로 변환
  const now = new Date();
  const kstOffset = 9 * 60; // 9시간을 분으로 변환
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utc + (kstOffset * 60000));
  
  const currentDay = kstTime.getDay(); // 0 = 일요일, 1 = 월요일, ...
  const monday = new Date(kstTime);
  
  // 월요일로 조정 (일요일이 0이므로 월요일을 1로 맞춤)
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(kstTime.getDate() + daysToMonday);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date);
  }
  
  return weekDates;
};

/**
 * 한국시간 기준으로 날짜를 YYYY-MM-DD 형식으로 포맷팅
 * @param date - 포맷팅할 Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export const formatKSTDate = (date: Date): string => {
  // 날짜를 한국시간으로 변환
  const kstOffset = 9 * 60; // 9시간을 분으로 변환
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (kstOffset * 60000));
  
  return kstDate.toISOString().split('T')[0]; // YYYY-MM-DD
};

/**
 * 한국시간 기준으로 요일과 날짜를 함께 표시하는 함수
 * @param dayName - 요일 이름 (예: "월", "화")
 * @param date - Date 객체
 * @returns "월 6/17" 형식의 문자열
 */
export const formatDayWithDateKST = (dayName: string, date: Date): string => {
  // 날짜를 한국시간으로 변환
  const kstOffset = 9 * 60; // 9시간을 분으로 변환
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (kstOffset * 60000));
  
  const month = kstDate.getMonth() + 1;
  const dayOfMonth = kstDate.getDate();
  return `${dayName} ${month}/${dayOfMonth}`;
};

// 기타 유틸리티 함수들을 여기에 추가할 수 있습니다