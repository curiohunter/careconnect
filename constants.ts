import { DayOfWeek, WeeklyActivitySchedule, DailyMealPlan, Medication, MedicationType, MedicationStorage, UserType, Gender, Activity, InstitutionType } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

// Helper to create unique IDs for initial activities
const createActivity = (description: string, startTime?: string, endTime?: string, institutionName?: string): Activity => ({
  id: Math.random().toString(36).substr(2, 9),
  description,
  startTime,
  endTime,
  institutionName,
});


export const initialWeeklySchedule: WeeklyActivitySchedule = {
  [DayOfWeek.MONDAY]: { 
    childcareActivities: [createActivity('미술놀이', '09:00', '10:00', '사랑 어린이집')], 
    afterSchoolActivities: [createActivity('영어수업', '16:00', '17:00')] 
  },
  [DayOfWeek.TUESDAY]: { 
    childcareActivities: [createActivity('음악수업', '10:00', '11:00', '행복 유치원')], 
    afterSchoolActivities: [createActivity('태권도', '17:00', '18:00')] 
  },
  [DayOfWeek.WEDNESDAY]: { 
    childcareActivities: [createActivity('체육활동', '11:00', '12:00')], 
    afterSchoolActivities: [createActivity('숙제 지도', '16:30', '17:30')] 
  },
  [DayOfWeek.THURSDAY]: { 
    childcareActivities: [createActivity('동화읽기', '09:30', '10:30')], 
    afterSchoolActivities: [createActivity('놀이터', '15:00', '16:00')] 
  },
  [DayOfWeek.FRIDAY]: { 
    childcareActivities: [createActivity('자유놀이', '10:30', '11:30')], 
    afterSchoolActivities: [createActivity('영화감상', '18:00', '19:00')] 
  },
  [DayOfWeek.SATURDAY]: { childcareActivities: [], afterSchoolActivities: [] },
  [DayOfWeek.SUNDAY]: { childcareActivities: [], afterSchoolActivities: [] },
};

export const initialMealPlan: DailyMealPlan = {
  [DayOfWeek.MONDAY]: { menu: '아침: 시리얼, 점심: 밥과 국, 저녁: 스파게티', notes: '견과류 알러지 주의' },
  [DayOfWeek.TUESDAY]: { menu: '아침: 토스트, 점심: 카레라이스, 저녁: 생선구이', notes: '' },
  [DayOfWeek.WEDNESDAY]: { menu: '아침: 요거트, 점심: 김밥, 저녁: 닭볶음탕', notes: '매운 음식 조절' },
  [DayOfWeek.THURSDAY]: { menu: '아침: 팬케이크, 점심: 볶음밥, 저녁: 된장찌개', notes: '' },
  [DayOfWeek.FRIDAY]: { menu: '아침: 과일, 점심: 샌드위치, 저녁: 피자', notes: '특식' },
  [DayOfWeek.SATURDAY]: { menu: '', notes: '' },
  [DayOfWeek.SUNDAY]: { menu: '', notes: '' },
};

export const initialMedications: Medication[] = [
  {
    id: 'med1',
    childId: 'child1', 
    symptoms: '콧물, 기침',
    medicationTypes: [MedicationType.LIQUID],
    dosage: '5ml',
    timing: '점심 식후 30분',
    storage: MedicationStorage.REFRIGERATED,
    notes: '냉장보관된 시럽입니다.',
    administered: false,
  },
  {
    id: 'med2',
    childId: 'child1',
    symptoms: '미열',
    medicationTypes: [MedicationType.POWDER, MedicationType.TABLET],
    timing: '저녁 식후',
    storage: MedicationStorage.ROOM_TEMP,
    notes: '가루약은 물에 타서, 알약은 식후 바로.',
    administered: true,
  },
];

export const USER_TYPES = [
  { value: UserType.PARENT, label: '부모' },
  { value: UserType.CARE_PROVIDER, label: '돌봄 선생님' },
];

export const GENDER_OPTIONS = [
  { value: Gender.FEMALE, label: '여아' },
  { value: Gender.MALE, label: '남아' },
  { value: Gender.OTHER, label: '기타' },
];

export const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType; label: string }[] = [
    { value: '어린이집', label: '어린이집' },
    { value: '유치원', label: '유치원' },
    { value: '해당없음', label: '해당없음' },
    { value: '기타', label: '기타' },
];

export const MEDICATION_TYPES_OPTIONS = [
  { value: MedicationType.LIQUID, label: '물약' },
  { value: MedicationType.POWDER, label: '가루약' },
  { value: MedicationType.TABLET, label: '알약'},
];

export const MEDICATION_STORAGE_OPTIONS = [
  { value: MedicationStorage.ROOM_TEMP, label: '실온' },
  { value: MedicationStorage.REFRIGERATED, label: '냉장' },
];

/** @deprecated Use generateHourOptions and generateMinuteOptions instead for better UX */
export const generateTimeOptions = (intervalMinutes: number = 10): string[] => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
};

export const generateHourOptions = (): string[] => {
  const hours: string[] = [];
  for (let h = 0; h < 24; h++) {
    hours.push(String(h).padStart(2, '0'));
  }
  return hours;
};

export const generateMinuteOptions = (intervalMinutes: number = 10): string[] => {
  const minutes: string[] = [];
  for (let m = 0; m < 60; m += intervalMinutes) {
    minutes.push(String(m).padStart(2, '0'));
  }
  return minutes;
};
