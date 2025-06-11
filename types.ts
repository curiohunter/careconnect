export enum UserType {
  CARE_PROVIDER = 'CARE_PROVIDER',
  PARENT = 'PARENT',
}

export enum Gender {
  MALE = '남아',
  FEMALE = '여아',
  OTHER = '기타',
}

export type InstitutionType = '어린이집' | '유치원' | '해당없음' | '기타';

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
  connectionId?: string; // 연결된 상대방의 사용자 ID
  inviteCode?: string; // 자신의 초대 코드
  fcmToken?: string; // FCM 토큰
  workSchedule?: WorkSchedule; // 기본 근무 일정
  createdAt?: Date;
  updatedAt?: Date;
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

export type WeeklyActivitySchedule = Record<DayOfWeek, DailyActivities>;
export type ChildWeeklySchedules = Record<string, WeeklyActivitySchedule>; // Keyed by childId

export interface MealPlanItem {
  menu: string;
  notes?: string;
}

export type DailyMealPlan = Record<DayOfWeek, MealPlanItem>;

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
}

export interface WorkShift {
  startTime: string;
  endTime: string;
}

export type WorkSchedule = Record<DayOfWeek, WorkShift | 'OFF'>;

export interface SpecialScheduleItem {
  id: string;
  date: string;
  type: 'VACATION' | 'OVERTIME_REQUEST' | 'NOTICE';
  title: string;
  details?: string;
  startTime?: string;
  endTime?: string;
  isApproved?: boolean; 
  isRead?: boolean;
  creatorUserType?: UserType;
  createdBy?: string; // 작성자 ID
  connectionId?: string; // 연결 ID
  createdAt?: Date;
  updatedAt?: Date;
}

// Firebase 관련 인터페이스
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// 연결 관계 인터페이스
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
