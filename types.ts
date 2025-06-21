export enum UserType {
  CARE_PROVIDER = 'CARE_PROVIDER',
  PARENT = 'PARENT',
}

export enum Gender {
  MALE = '남아',
  FEMALE = '여아',
  OTHER = '기타',
}

export enum DayOfWeek {
  MONDAY = '월',
  TUESDAY = '화',
  WEDNESDAY = '수',
  THURSDAY = '목',
  FRIDAY = '금',
  SATURDAY = '토',
  SUNDAY = '일',
}



export type InstitutionType = '어린이집' | '유치원' | '학교' | '해당없음' | '기타';

// 반복 일정 관리
export interface RecurringActivity {
  id: string;
  childId: string;
  name: string; // 활동명 또는 기관명
  activityType: 'childcare' | 'afterSchool'; // 기관 활동 또는 하원 후 활동
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[]; // 반복될 요일들
  institutionName?: string; // 기관 활동일 때만
  isActive: boolean; // 활성/비활성
  isWeeklyRecurring?: boolean; // 매주 자동 적용 여부
  createdAt?: Date;
  updatedAt?: Date;
}

export type RecurringSchedules = Record<string, RecurringActivity[]>; // Keyed by childId

// 반복 일정 설정 인터페이스
export interface RecurringScheduleForm {
  name: string;
  activityType: 'childcare' | 'afterSchool';
  startTime: string;
  endTime: string;
  daysOfWeek: DayOfWeek[];
  institutionName?: string;
}

export interface ChildInfo {
  id: string;
  name: string;
  specialNeeds?: string;
  age?: number;
  gender?: Gender;
  institutionType?: InstitutionType;
  institutionName?: string;
}

export interface UserProfile {
  id?: string; // Firebase UID
  userType: UserType;
  name: string;
  contact: string;
  email?: string;
  connectionId?: string | null; // 연결된 상대방의 사용자 ID (단일 연결 - 하위 호환성)
  connectionIds?: string[]; // 다중 연결 ID 목록 (새로운 필드)
  primaryConnectionId?: string; // 메인 연결 ID (돌봄선생님용)
  inviteCode?: string; // 자신의 초대 코드
  fcmToken?: string; // FCM 토큰
  workSchedule?: WorkSchedule; // 기본 근무 일정
  children?: ChildInfo[]; // 아이 정보 (부모인 경우)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Activity {
  id: string; // Unique ID for each activity instance
  startTime?: string; // Changed from time to startTime for clarity
  endTime?: string;   // Added endTime
  description: string;
  institutionName?: string; // Optional: To store/display institution name for childcare activities
}

export interface DailyActivities {
  childcareActivities: Activity[]; 
  afterSchoolActivities: Activity[]; 
}

// ===== 새로운 날짜별 스케줄 타입들 =====
export interface DailySchedule {
  date: string; // YYYY-MM-DD 형식
  dayOfWeek: DayOfWeek;
  childId: string;
  childcareActivities: Activity[];
  afterSchoolActivities: Activity[];
  createdAt?: Date;
  updatedAt?: Date;
}

// 날짜별 스케줄 컬렉션 (특정 기간의 스케줄들)
export type DateRangeSchedules = Record<string, DailySchedule>; // Keyed by 'YYYY-MM-DD'

// 아이별 날짜 스케줄들
export type ChildDateSchedules = Record<string, DateRangeSchedules>; // Keyed by childId

// 날짜 관련 유틸리티 타입들
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface WeekRange extends DateRange {
  weekStart: string; // 해당 주의 월요일 날짜
}

export interface MealPlanItem {
  menu: string;
  notes?: string;
}

// ===== 기존 요일별 식단 (단계적 제거 예정) =====
export type DailyMealPlan = Record<DayOfWeek, MealPlanItem>;

// ===== 새로운 날짜별 식단 =====
export interface DailyMealPlanNew {
  date: string; // YYYY-MM-DD
  menu: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DateRangeMealPlan = Record<string, DailyMealPlanNew>; // Keyed by 'YYYY-MM-DD'

// 식사 계획 마이그레이션 상태 관리
export enum MealPlanMigrationStatus {
  WEEKLY_BASED = 'WEEKLY_BASED',     // 기존 요일 기반 시스템
  MIGRATING = 'MIGRATING',           // 마이그레이션 진행 중
  DATE_BASED = 'DATE_BASED'          // 새로운 날짜 기반 시스템
}

// 식사 계획 편집 모드
export enum MealPlanEditorMode {
  VIEW = 'VIEW',                     // 조회 모드
  WEEKLY_EDIT = 'WEEKLY_EDIT',       // 기존 요일별 편집 모드
  DATE_EDIT = 'DATE_EDIT'            // 새로운 날짜별 편집 모드
}

// 호환성을 위한 Union 타입 (점진적 마이그레이션 지원)
export type MealPlanUnion = DailyMealPlan | DateRangeMealPlan;

// 식사 계획 상태 관리 인터페이스
export interface MealPlanState {
  migrationStatus: MealPlanMigrationStatus;
  editorMode: MealPlanEditorMode;
  weeklyPlan?: DailyMealPlan;        // 기존 요일별 계획
  datePlan?: DateRangeMealPlan;      // 새로운 날짜별 계획
  lastUpdated?: Date;
}

export enum MedicationType {
  LIQUID = '물약',
  POWDER = '가루약',
  TABLET = '알약',
}

export enum MedicationStorage {
  ROOM_TEMP = '실온',
  REFRIGERATED = '냉장',
}

export interface Medication {
  id: string;
  childId?: string; 
  symptoms: string;
  medicationTypes: MedicationType[];
  dosage?: string; 
  timing: string;
  storage: MedicationStorage;
  notes?: string; 
  administered: boolean;
  date: string; // 투약 날짜 (YYYY-MM-DD)
}

export interface WorkShift {
  startTime: string;
  endTime: string;
}

export type WorkSchedule = Record<DayOfWeek, WorkShift | 'OFF'>;

export enum RequestStatus {
  PENDING = 'PENDING',    // 요청중
  APPROVED = 'APPROVED',  // 수락
  REJECTED = 'REJECTED'   // 반려
}

export interface SpecialScheduleItem {
  id: string;
  date: string; // 기본 날짜 (연장근무, 안내사항용)
  startDate?: string; // 휴가 시작일 (YYYY-MM-DD)
  endDate?: string; // 휴가 종료일 (YYYY-MM-DD)
  type: 'VACATION' | 'OVERTIME_REQUEST' | 'NOTICE';
  title: string;
  details?: string;
  startTime?: string;
  endTime?: string;
  status?: RequestStatus; // 요청 상태 (기본값: PENDING)
  targetUserType?: UserType; // 휴가 대상자 (PARENT | CAREGIVER)
  targetUserId?: string; // 연장근무 요청 시 담당 돌봄선생님 ID 지정
  readBy?: Record<string, Date>; // { userId: readTimestamp } 형태로 읽음 확인
  creatorUserType?: UserType;
  createdBy?: string; // 작성자 ID
  connectionId?: string; // 연결 ID
  createdAt?: Date;
  updatedAt?: Date;
  
  // 이전 필드들 (하위 호환성을 위해 유지, 단계적 제거 예정)
  isApproved?: boolean; 
  isRead?: boolean;
}

// Firebase 관련 인터페이스
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// ===== 다대다 관계 타입 시스템 =====

// 권한 관리 Enum
export enum Permission {
  VIEW = 'VIEW',                   // 조회 권한
  EDIT = 'EDIT',                   // 수정 권한
  ADMIN = 'ADMIN',                 // 관리자 권한
  SCHEDULE_MANAGE = 'SCHEDULE_MANAGE', // 스케줄 관리 권한
  MEDICATION_MANAGE = 'MEDICATION_MANAGE', // 투약 관리 권한
  MEAL_MANAGE = 'MEAL_MANAGE',     // 식단 관리 권한
  HANDOVER_MANAGE = 'HANDOVER_MANAGE', // 인수인계 관리 권한
}

// 다대다 연결 관리 인터페이스
export interface MultiConnection {
  id: string;
  connectionType: 'PARENT_PROVIDER' | 'PROVIDER_PROVIDER' | 'PARENT_PARENT';
  isActive: boolean;
  permissions: Record<string, Permission[]>; // userId: permissions[]
  createdAt: Date;
  updatedAt: Date;
}

// ===== 간소화된 인수인계 시스템 =====

// 요일별 메모 시스템을 위한 간단한 인터페이스
export interface DailyHandoverNote {
  id: string;
  dayOfWeek: DayOfWeek;
  authorId: string;
  authorName: string;
  content: string;
  date: string; // YYYY-MM-DD 당일 표시용
  connectionId: string;
  createdAt: Date;
  updatedAt?: Date;
}

// 돌봄 선생님 할당 정보
export interface CareProviderAssignment {
  id: string;
  connectionId: string; // MultiConnection ID
  careProviderId: string;
  childId: string;
  assignmentType: 'PRIMARY' | 'SECONDARY' | 'TEMPORARY';
  permissions: Permission[];
  schedule?: SchedulePattern[]; // 할당된 스케줴 패턴
  startDate?: string; // YYYY-MM-DD, 임시 할당의 경우
  endDate?: string;   // YYYY-MM-DD, 임시 할당의 경우
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 스케줄 패턴 관리
export interface SchedulePattern {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  repeatType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  repeatDays?: DayOfWeek[]; // 주간 반복에 사용
  repeatDates?: number[];   // 월간 반복에 사용 (1-31)
  customPattern?: string;   // 커스텀 패턴 (cron 표현식 등)
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 기존 연결 관계 인터페이스 (하위 호환성)
export interface Connection {
  id: string;
  parentId: string;
  careProviderId: string;
  parentProfile: UserProfile;
  careProviderProfile: UserProfile;
  children: ChildInfo[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 초대 코드 인터페이스
export interface InviteCode {
  code: string;
  createdBy: string; // User ID
  userType: UserType;
  isUsed: boolean;
  usedBy?: string; // User ID who used the code
  expiresAt: Date;
  createdAt: Date;
}
