import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ChildInfo, 
  DailyMealPlan, 
  Medication, 
  SpecialScheduleItem, 
  WorkSchedule,
  DayOfWeek,
  Activity,
  DailyActivities,
  RecurringActivity,
  // 새로운 날짜별 타입들
  DailySchedule,
  DateRangeSchedules,
  ChildDateSchedules,
  DateRange,
  WeekRange,
  DailyMealPlanNew,
  DateRangeMealPlan,
  // 다대다 관계 타입 시스템
  MultiConnection,
  Permission,
  CareProviderAssignment,
  SchedulePattern,
  DailyHandoverNote
} from '../types';

// 데이터 서비스
export class DataService {
  // 아이 정보 관련
  static async saveChildren(connectionId: string, children: ChildInfo[]) {
    try {
      const batch = writeBatch(db);
      
      // 기존 아이 정보 삭제
      const existingQuery = query(
        collection(db, 'children'),
        where('connectionId', '==', connectionId)
      );
      const existingDocs = await getDocs(existingQuery);
      existingDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 새 아이 정보 저장
      children.forEach(child => {
        const childRef = doc(collection(db, 'children'));
        batch.set(childRef, {
          ...child,
          connectionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('아이 정보 저장 오류:', error);
      throw error;
    }
  }

  static async getChildren(connectionId: string): Promise<ChildInfo[]> {
    try {
      const q = query(
        collection(db, 'children'),
        where('connectionId', '==', connectionId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChildInfo[];
    } catch (error) {
      console.error('아이 정보 가져오기 오류:', error);
      throw error;
    }
  }

  // 식사 계획 관련
  static async saveMealPlan(connectionId: string, mealPlan: DailyMealPlan) {
    try {
      const docRef = doc(db, 'mealPlans', connectionId);
      await setDoc(docRef, {
        mealPlan,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('식사 계획 저장 오류:', error);
      throw error;
    }
  }

  static async getMealPlan(connectionId: string): Promise<DailyMealPlan | null> {
    try {
      const docSnap = await getDoc(doc(db, 'mealPlans', connectionId));
      if (docSnap.exists()) {
        return docSnap.data().mealPlan || null;
      }
      return null;
    } catch (error) {
      console.error('식사 계획 가져오기 오류:', error);
      throw error;
    }
  }

  static onMealPlanChange(connectionId: string, callback: (mealPlan: DailyMealPlan | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'mealPlans', connectionId), (doc) => {
      if (doc.exists()) {
        callback(doc.data().mealPlan || null);
      } else {
        callback(null);
      }
    });
  }

  // 투약 정보 관련
  /**
   * Firestore 저장용 Medication 정제 함수 (undefined 제거 및 빈 문자열 보장)
   */
  private static cleanMedication(medication: Partial<Medication>): any {
    const cleaned: any = {};
    Object.entries(medication).forEach(([key, value]) => {
      if (value !== undefined) cleaned[key] = value;
    });
    // 선택 필드 빈 문자열 보장
    if (!cleaned.dosage) cleaned.dosage = '';
    if (!cleaned.notes) cleaned.notes = '';
    return cleaned;
  }

  static async addMedication(connectionId: string, medication: Omit<Medication, 'id'>) {
    try {
      const medicationRef = await addDoc(collection(db, 'medications'), {
        ...DataService.cleanMedication({ ...medication }),
        connectionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return medicationRef.id;
    } catch (error) {
      console.error('투약 정보 추가 오류:', error);
      throw error;
    }
  }

  static async updateMedication(medicationId: string, updates: Partial<Medication>) {
    try {
      await updateDoc(doc(db, 'medications', medicationId), {
        ...DataService.cleanMedication(updates),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('투약 정보 업데이트 오류:', error);
      throw error;
    }
  }

  static async deleteMedication(medicationId: string) {
    try {
      await deleteDoc(doc(db, 'medications', medicationId));
    } catch (error) {
      console.error('투약 정보 삭제 오류:', error);
      throw error;
    }
  }

  static async getMedications(connectionId: string): Promise<Medication[]> {
    try {
      const q = query(
        collection(db, 'medications'),
        where('connectionId', '==', connectionId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
    } catch (error) {
      console.error('투약 정보 가져오기 오류:', error);
      throw error;
    }
  }

  static onMedicationsChange(connectionId: string, callback: (medications: Medication[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'medications'),
      where('connectionId', '==', connectionId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const medications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
      callback(medications);
    });
  }

  // 특별 일정 관련
  static async addSpecialScheduleItem(connectionId: string, item: Omit<SpecialScheduleItem, 'id'>) {
    try {
      const itemRef = await addDoc(collection(db, 'specialSchedules'), {
        ...item,
        connectionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return itemRef.id;
    } catch (error) {
      console.error('특별 일정 추가 오류:', error);
      throw error;
    }
  }

  static async updateSpecialScheduleItem(itemId: string, updates: Partial<SpecialScheduleItem>) {
    try {
      await updateDoc(doc(db, 'specialSchedules', itemId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('특별 일정 업데이트 오류:', error);
      throw error;
    }
  }

  static async deleteSpecialScheduleItem(itemId: string) {
    try {
      await deleteDoc(doc(db, 'specialSchedules', itemId));
    } catch (error) {
      console.error('특별 일정 삭제 오류:', error);
      throw error;
    }
  }

  // 읽음 확인 업데이트
  static async markSpecialScheduleAsRead(itemId: string, userId: string) {
    try {
      await updateDoc(doc(db, 'specialSchedules', itemId), {
        [`readBy.${userId}`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('읽음 확인 업데이트 오류:', error);
      throw error;
    }
  }

  // 요청 승인
  static async approveSpecialScheduleRequest(itemId: string) {
    try {
      await updateDoc(doc(db, 'specialSchedules', itemId), {
        status: 'APPROVED',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('요청 승인 오류:', error);
      throw error;
    }
  }

  // 요청 반려
  static async rejectSpecialScheduleRequest(itemId: string) {
    try {
      await updateDoc(doc(db, 'specialSchedules', itemId), {
        status: 'REJECTED',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('요청 반려 오류:', error);
      throw error;
    }
  }

  static async getSpecialScheduleItems(connectionId: string): Promise<SpecialScheduleItem[]> {
    try {
      const q = query(
        collection(db, 'specialSchedules'),
        where('connectionId', '==', connectionId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];
    } catch (error) {
      console.error('특별 일정 가져오기 오류:', error);
      throw error;
    }
  }

  static onSpecialScheduleItemsChange(connectionId: string, callback: (items: SpecialScheduleItem[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'specialSchedules'),
      where('connectionId', '==', connectionId),
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];
      callback(items);
    });
  }

  // 근무 일정 관련
  static async saveWorkSchedule(userId: string, workSchedule: WorkSchedule) {
    try {
      const docRef = doc(db, 'workSchedules', userId);
      await setDoc(docRef, {
        workSchedule,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('근무 일정 저장 오류:', error);
      throw error;
    }
  }

  static async getWorkSchedule(userId: string): Promise<WorkSchedule | null> {
    try {
      const docSnap = await getDoc(doc(db, 'workSchedules', userId));
      if (docSnap.exists()) {
        return docSnap.data().workSchedule || null;
      }
      return null;
    } catch (error) {
      console.error('근무 일정 가져오기 오류:', error);
      throw error;
    }
  }

  static onWorkScheduleChange(userId: string, callback: (schedule: WorkSchedule | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'workSchedules', userId), (doc) => {
      if (doc.exists()) {
        callback(doc.data().workSchedule || null);
      } else {
        callback(null);
      }
    });
  }

  // ===== 새로운 날짜별 스케줄 관리 함수들 =====
  
  /**
   * Firestore 저장용 Activity 정제 함수 (undefined 제거 및 빈 문자열 보장)
   */
  private static cleanActivity(activity: Activity): Activity {
    return {
      id: activity.id ?? '',
      description: activity.description ?? '',
      startTime: activity.startTime ?? '',
      endTime: activity.endTime ?? '',
      institutionName: activity.institutionName ?? '',
    };
  }

  /**
   * Firestore 저장용 DailySchedule 정제 함수 (undefined 제거 및 배열/내부 객체 보장)
   */
  private static cleanDailyScheduleForFirestore(schedule: DailySchedule): any {
    const cleaned: any = {};
    Object.entries(schedule).forEach(([key, value]) => {
      if (value !== undefined) cleaned[key] = value;
    });
    cleaned.childcareActivities = (cleaned.childcareActivities ?? []).map(DataService.cleanActivity);
    cleaned.afterSchoolActivities = (cleaned.afterSchoolActivities ?? []).map(DataService.cleanActivity);
    return cleaned;
  }

  /**
   * 특정 날짜의 스케줄 저장
   * 경로: schedules/{connectionId}/children/{childId}/days/{YYYY-MM-DD}
   */
  static async saveDailySchedule(connectionId: string, childId: string, schedule: DailySchedule) {
    try {
      const docRef = doc(db, 'schedules', connectionId, 'children', childId, 'days', schedule.date);
      const cleaned = DataService.cleanDailyScheduleForFirestore(schedule);
      await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('날짜별 스케줄 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 스케줄 가져오기
   */
  static async getDailySchedule(connectionId: string, childId: string, date: string): Promise<DailySchedule | null> {
    try {
      const docRef = doc(db, 'schedules', connectionId, 'children', childId, 'days', date);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        return {
          date: data.date ?? date,
          dayOfWeek: data.dayOfWeek ?? DataService.getDayOfWeek(date),
          childId: data.childId ?? childId,
          childcareActivities: data.childcareActivities ?? [],
          afterSchoolActivities: data.afterSchoolActivities ?? [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error('날짜별 스케줄 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 기간의 스케줄들 가져오기
   */
  static async getDateRangeSchedules(
    connectionId: string, 
    childId: string, 
    dateRange: DateRange
  ): Promise<DateRangeSchedules> {
    try {
      const q = query(
        collection(db, 'schedules', connectionId, 'children', childId, 'days'),
        where('date', '>=', dateRange.startDate),
        where('date', '<=', dateRange.endDate),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const schedules: DateRangeSchedules = {};
      
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as any;
        const schedule: DailySchedule = {
          date: data.date,
          dayOfWeek: data.dayOfWeek ?? DataService.getDayOfWeek(data.date),
          childId: data.childId ?? childId,
          childcareActivities: data.childcareActivities ?? [],
          afterSchoolActivities: data.afterSchoolActivities ?? [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        schedules[data.date] = schedule;
      });
      
      return schedules;
    } catch (error) {
      console.error('기간별 스케줄 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * 현재 주의 스케줄들 가져오기 (월~일)
   */
  static async getCurrentWeekSchedules(connectionId: string, childId: string): Promise<DateRangeSchedules> {
    const weekRange = DataService.getCurrentWeekRange();
    return DataService.getDateRangeSchedules(connectionId, childId, weekRange);
  }

  /**
   * 날짜별 스케줄 실시간 구독
   */
  static onDateRangeSchedulesChange(
    connectionId: string,
    childId: string,
    dateRange: DateRange,
    callback: (schedules: DateRangeSchedules) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'schedules', connectionId, 'children', childId, 'days'),
      where('date', '>=', dateRange.startDate),
      where('date', '<=', dateRange.endDate),
      orderBy('date', 'asc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const schedules: DateRangeSchedules = {};
      
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as any;
        const schedule: DailySchedule = {
          date: data.date,
          dayOfWeek: data.dayOfWeek ?? DataService.getDayOfWeek(data.date),
          childId: data.childId ?? childId,
          childcareActivities: data.childcareActivities ?? [],
          afterSchoolActivities: data.afterSchoolActivities ?? [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        schedules[data.date] = schedule;
      });
      
      callback(schedules);
    });
  }

  /**
   * 현재 주 범위 계산 (월요일 ~ 일요일)
   */
  static getCurrentWeekRange(): WeekRange {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = 일요일, 1 = 월요일
    
    // 월요일로 조정
    const monday = new Date(today);
    const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + daysToMonday);
    
    // 일요일 계산
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      startDate: monday.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: sunday.toISOString().split('T')[0],
      weekStart: monday.toISOString().split('T')[0]
    };
  }

  /**
   * 날짜 데이터 유틸리티 함수들
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  static getDayOfWeek(dateString: string): DayOfWeek {
    const date = new Date(dateString);
    const dayIndex = date.getDay(); // 0 = 일요일
    
    const dayMap = [
      DayOfWeek.SUNDAY,    // 0
      DayOfWeek.MONDAY,    // 1
      DayOfWeek.TUESDAY,   // 2
      DayOfWeek.WEDNESDAY, // 3
      DayOfWeek.THURSDAY,  // 4
      DayOfWeek.FRIDAY,    // 5
      DayOfWeek.SATURDAY   // 6
    ];
    
    return dayMap[dayIndex];
  }

  // ===== 새로운 날짜별 식단 관리 함수들 =====
  
  /**
   * 특정 날짜의 식단 저장
   */
  static async saveDailyMealPlan(connectionId: string, mealPlan: DailyMealPlanNew) {
    try {
      const docRef = doc(db, 'mealPlans', connectionId, 'dates', mealPlan.date);
      await setDoc(docRef, {
        ...mealPlan,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('날짜별 식단 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 기간의 식단들 가져오기
   */
  static async getDateRangeMealPlans(connectionId: string, dateRange: DateRange): Promise<DateRangeMealPlan> {
    try {
      const q = query(
        collection(db, 'mealPlans', connectionId, 'dates'),
        where('date', '>=', dateRange.startDate),
        where('date', '<=', dateRange.endDate),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const mealPlans: DateRangeMealPlan = {};
      
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as any;
        const mealPlan: DailyMealPlanNew = {
          date: data.date,
          menu: data.menu ?? '',
          notes: data.notes,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        mealPlans[data.date] = mealPlan;
      });
      
      return mealPlans;
    } catch (error) {
      console.error('기간별 식단 가져오기 오류:', error);
      throw error;
    }
  }

  // ===== 새로운 날짜 기반 식사 계획 관리 =====
  
  /**
   * 특정 날짜의 식사 계획 저장
   */
  static async saveDateBasedMealPlan(connectionId: string, date: string, mealPlan: DailyMealPlanNew) {
    try {
      await setDoc(doc(db, 'mealPlans', connectionId, 'dates', date), {
        ...mealPlan,
        date,
        createdAt: mealPlan.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('날짜별 식사 계획 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 식사 계획 가져오기
   */
  static async getDateBasedMealPlan(connectionId: string, date: string): Promise<DailyMealPlanNew | null> {
    try {
      const docSnap = await getDoc(doc(db, 'mealPlans', connectionId, 'dates', date));
      
      if (docSnap.exists()) {
        return docSnap.data() as DailyMealPlanNew;
      }
      return null;
    } catch (error) {
      console.error('날짜별 식사 계획 가져오기 오류:', error);
      throw error;
    }
  }

  // getDateRangeMealPlans 함수는 이미 위에 구현되어 있음

  /**
   * 날짜 범위의 식사 계획 실시간 구독
   */
  static onDateBasedMealPlansChange(
    connectionId: string, 
    dateRange: DateRange, 
    callback: (mealPlans: DateRangeMealPlan) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'mealPlans', connectionId, 'dates'),
      where('date', '>=', dateRange.startDate),
      where('date', '<=', dateRange.endDate),
      orderBy('date', 'asc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const mealPlans: DateRangeMealPlan = {};
      
      querySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as DailyMealPlanNew;
        mealPlans[data.date] = data;
      });
      
      callback(mealPlans);
    });
  }

  // ===== 반복 일정 템플릿 관리 =====
  
  static async saveRecurringTemplate(connectionId: string, template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const templateRef = await addDoc(collection(db, 'recurringSchedules'), {
        ...template,
        connectionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return templateRef.id;
    } catch (error) {
      console.error('반복 일정 템플릿 저장 오류:', error);
      throw error;
    }
  }

  static async getRecurringTemplates(connectionId: string, childId: string): Promise<RecurringActivity[]> {
    try {
      // 인덱스가 준비될 때까지 단순한 쿼리 사용
      const q = query(
        collection(db, 'recurringSchedules'),
        where('connectionId', '==', connectionId),
        where('childId', '==', childId)
        // isActive 및 orderBy 제거로 인덱스 요구사항 감소
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as RecurringActivity)
        .filter(template => template.isActive !== false) // 클라이언트에서 필터링
        .sort((a, b) => {
          // 클라이언트에서 정렬
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error('반복 일정 템플릿 가져오기 오류:', error);
      throw error;
    }
  }

  static async deleteRecurringTemplate(templateId: string) {
    try {
      await deleteDoc(doc(db, 'recurringSchedules', templateId));
    } catch (error) {
      console.error('반복 일정 템플릿 삭제 오류:', error);
      throw error;
    }
  }

  static async applyRecurringTemplate(connectionId: string, childId: string, template: RecurringActivity) {
    try {
      const weekRange = DataService.getCurrentWeekRange();
      const startDate = new Date(weekRange.weekStart);
      
      const updates = [];
      
      // 템플릿의 요일들에 해당하는 날짜들 찾기
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dayOfWeek = DataService.getDayOfWeek(DataService.formatDate(currentDate));
        
        if (template.daysOfWeek.includes(dayOfWeek)) {
          const dateString = DataService.formatDate(currentDate);
          
          // 새 활동 생성
          const newActivity: Activity = {
            id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: template.name,
            startTime: template.startTime,
            endTime: template.endTime,
            institutionName: template.institutionName || ''
          };
          
          // 기존 스케줄 가져오기
          const existingSchedule = await DataService.getDailySchedule(connectionId, childId, dateString);
          
          const updatedSchedule: DailySchedule = {
            date: dateString,
            dayOfWeek,
            childId,
            childcareActivities: template.activityType === 'childcare' 
              ? [...(existingSchedule?.childcareActivities || []), newActivity]
              : (existingSchedule?.childcareActivities || []),
            afterSchoolActivities: template.activityType === 'afterSchool'
              ? [...(existingSchedule?.afterSchoolActivities || []), newActivity] 
              : (existingSchedule?.afterSchoolActivities || []),
            createdAt: existingSchedule?.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          updates.push({ dateString, schedule: updatedSchedule });
        }
      }
      
      // 모든 업데이트를 순차적으로 처리
      for (const update of updates) {
        await DataService.saveDailySchedule(connectionId, childId, update.schedule);
        await new Promise(resolve => setTimeout(resolve, 100)); // 잠시 대기
      }
      
    } catch (error) {
      console.error('반복 일정 템플릿 적용 오류:', error);
      throw error;
    }
  }
  // ===== 다대다 관계 타입 시스템 관련 함수들 =====

  // 다대다 연결 관리
  static async createMultiConnection(connection: Omit<MultiConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const connectionRef = await addDoc(collection(db, 'multiConnections'), {
        ...connection,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return connectionRef.id;
    } catch (error) {
      console.error('다대다 연결 생성 오류:', error);
      throw error;
    }
  }

  static async updateMultiConnection(connectionId: string, updates: Partial<MultiConnection>): Promise<void> {
    try {
      await updateDoc(doc(db, 'multiConnections', connectionId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('다대다 연결 업데이트 오류:', error);
      throw error;
    }
  }

  static async getMultiConnection(connectionId: string): Promise<MultiConnection | null> {
    try {
      const docSnap = await getDoc(doc(db, 'multiConnections', connectionId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as MultiConnection;
      }
      return null;
    } catch (error) {
      console.error('다대다 연결 조회 오류:', error);
      throw error;
    }
  }

  static async getMultiConnectionsByUser(userId: string): Promise<MultiConnection[]> {
    try {
      // 사용자가 권한을 가진 모든 연결 찾기
      const q = query(
        collection(db, 'multiConnections'),
        where(`permissions.${userId}`, '!=', null)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MultiConnection[];
    } catch (error) {
      console.error('사용자별 다대다 연결 조회 오류:', error);
      throw error;
    }
  }

  static onMultiConnectionsChange(userId: string, callback: (connections: MultiConnection[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'multiConnections'),
      where(`permissions.${userId}`, '!=', null)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const connections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MultiConnection[];
      callback(connections);
    });
  }

  // 돌봄 선생님 할당 관리
  static async createCareProviderAssignment(assignment: Omit<CareProviderAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const assignmentRef = await addDoc(collection(db, 'careProviderAssignments'), {
        ...assignment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return assignmentRef.id;
    } catch (error) {
      console.error('돌봄 선생님 할당 생성 오류:', error);
      throw error;
    }
  }

  static async updateCareProviderAssignment(assignmentId: string, updates: Partial<CareProviderAssignment>): Promise<void> {
    try {
      await updateDoc(doc(db, 'careProviderAssignments', assignmentId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('돌봄 선생님 할당 업데이트 오류:', error);
      throw error;
    }
  }

  static async deleteCareProviderAssignment(assignmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'careProviderAssignments', assignmentId));
    } catch (error) {
      console.error('돌봄 선생님 할당 삭제 오류:', error);
      throw error;
    }
  }

  static async getCareProviderAssignmentsByChild(childId: string): Promise<CareProviderAssignment[]> {
    try {
      const q = query(
        collection(db, 'careProviderAssignments'),
        where('childId', '==', childId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CareProviderAssignment[];
    } catch (error) {
      console.error('아이별 돌봄 선생님 할당 조회 오류:', error);
      throw error;
    }
  }

  static async getCareProviderAssignmentsByProvider(careProviderId: string): Promise<CareProviderAssignment[]> {
    try {
      const q = query(
        collection(db, 'careProviderAssignments'),
        where('careProviderId', '==', careProviderId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CareProviderAssignment[];
    } catch (error) {
      console.error('선생님별 돌봄 할당 조회 오류:', error);
      throw error;
    }
  }

  // 스케줄 패턴 관리
  static async createSchedulePattern(pattern: Omit<SchedulePattern, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const patternRef = await addDoc(collection(db, 'schedulePatterns'), {
        ...pattern,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return patternRef.id;
    } catch (error) {
      console.error('스케줄 패턴 생성 오류:', error);
      throw error;
    }
  }

  static async updateSchedulePattern(patternId: string, updates: Partial<SchedulePattern>): Promise<void> {
    try {
      await updateDoc(doc(db, 'schedulePatterns', patternId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('스케줄 패턴 업데이트 오류:', error);
      throw error;
    }
  }

  static async deleteSchedulePattern(patternId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'schedulePatterns', patternId));
    } catch (error) {
      console.error('스케줄 패턴 삭제 오류:', error);
      throw error;
    }
  }

  static async getSchedulePatterns(userId: string): Promise<SchedulePattern[]> {
    try {
      const q = query(
        collection(db, 'schedulePatterns'),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SchedulePattern[];
    } catch (error) {
      console.error('스케줄 패턴 조회 오류:', error);
      throw error;
    }
  }

  // ===== 간소화된 인수인계 시스템 =====
  
  // 일일 인수인계 메모 생성
  static async createDailyHandoverNote(note: Omit<DailyHandoverNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const noteRef = await addDoc(collection(db, 'dailyHandoverNotes', note.connectionId, 'notes'), {
        ...note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return noteRef.id;
    } catch (error) {
      console.error('인수인계 메모 생성 오류:', error);
      throw error;
    }
  }

  // 당일 인수인계 메모 조회
  static async getTodayHandoverNotes(connectionId: string, date: string): Promise<DailyHandoverNote[]> {
    try {
      const q = query(
        collection(db, 'dailyHandoverNotes', connectionId, 'notes'),
        where('date', '==', date),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyHandoverNote[];
    } catch (error) {
      console.error('당일 인수인계 메모 조회 오류:', error);
      throw error;
    }
  }

  // 요일별 인수인계 메모 검색
  static async getHandoverNotesByDayOfWeek(connectionId: string, dayOfWeek: DayOfWeek): Promise<DailyHandoverNote[]> {
    try {
      const q = query(
        collection(db, 'dailyHandoverNotes', connectionId, 'notes'),
        where('dayOfWeek', '==', dayOfWeek),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyHandoverNote[];
    } catch (error) {
      console.error('요일별 인수인계 메모 조회 오류:', error);
      throw error;
    }
  }

  // 인수인계 메모 수정
  static async updateDailyHandoverNote(noteId: string, connectionId: string, updates: Partial<DailyHandoverNote>): Promise<void> {
    try {
      await updateDoc(doc(db, 'dailyHandoverNotes', connectionId, 'notes', noteId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('인수인계 메모 수정 오류:', error);
      throw error;
    }
  }

  // 인수인계 메모 삭제
  static async deleteDailyHandoverNote(noteId: string, connectionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'dailyHandoverNotes', connectionId, 'notes', noteId));
    } catch (error) {
      console.error('인수인계 메모 삭제 오류:', error);
      throw error;
    }
  }

  // 인수인계 메모 실시간 구독
  static onDailyHandoverNotesChange(connectionId: string, callback: (notes: DailyHandoverNote[]) => void): Unsubscribe {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'dailyHandoverNotes', connectionId, 'notes'),
      where('date', '==', today),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const notes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyHandoverNote[];
      callback(notes);
    });
  }
}

export default DataService;
