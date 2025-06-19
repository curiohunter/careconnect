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
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../errorMonitor';
import {
  Medication, 
  SpecialScheduleItem, 
  WorkSchedule,
  DayOfWeek,
  Activity,
  RecurringActivity,
  // 새로운 날짜별 타입들
  DailySchedule,
  DateRangeSchedules,
  DateRange,
  WeekRange,
  DailyMealPlanNew,
  DateRangeMealPlan,
  // 다대다 관계 타입 시스템
  MultiConnection,
  CareProviderAssignment,
  SchedulePattern,
  DailyHandoverNote
} from '../types';

// 데이터 서비스
export class DataService {
  // ===== BACKWARD COMPATIBILITY WRAPPERS =====
  // These functions provide backward compatibility for components still using connectionId
  
  // Children management wrappers
  static async saveChildren(connectionId: string, children: ChildInfo[]) {
    logger.warn('saveChildren with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('saveChildren with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  static async getChildren(connectionId: string): Promise<ChildInfo[]> {
    logger.warn('getChildren with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('getChildren with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  // Meal plan wrappers
  static async getMealPlan(connectionId: string): Promise<DailyMealPlan | null> {
    logger.warn('getMealPlan with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('getMealPlan with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  static async saveMealPlan(connectionId: string, mealPlan: DailyMealPlan) {
    logger.warn('saveMealPlan with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('saveMealPlan with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  static onMealPlanChange(connectionId: string, callback: (mealPlan: DailyMealPlan | null) => void): Unsubscribe {
    logger.warn('onMealPlanChange with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('onMealPlanChange with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  // Medication wrappers
  static async addMedication(connectionId: string, medication: Omit<Medication, 'id'>) {
    logger.warn('addMedication with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('addMedication with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  static async getMedications(connectionId: string): Promise<Medication[]> {
    logger.warn('getMedications with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('getMedications with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  static onMedicationsChange(connectionId: string, callback: (medications: Medication[]) => void): Unsubscribe {
    logger.warn('onMedicationsChange with connectionId is deprecated. Use parentId-based functions.');
    throw new Error('onMedicationsChange with connectionId is deprecated. Please update to use parentId-based functions.');
  }

  // ===== CORE FUNCTIONALITY =====
  
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

  /**
   * Firestore 저장용 SpecialScheduleItem 정제 함수 (undefined 제거)
   */
  private static cleanSpecialScheduleItem(item: Partial<SpecialScheduleItem>): any {
    const cleaned: any = {};
    Object.entries(item).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    });
    return cleaned;
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



  // 특별 일정 관련

  // ===== 권한 기반 특별 일정 관리 (새로운 시스템) =====


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






  // ===== 데이터 정리 유틸리티 =====
  
  // 중복 활동 정리 (래퍼 함수 - parentId 기반 함수 호출)
  static async cleanupDuplicateActivities(parentId: string, childId: string, date: string) {
    return DataService.cleanupDuplicateActivitiesByParentId(parentId, childId, date);
  }
  
  // 중복 활동 정리 (같은 날짜, 같은 타입의 중복 템플릿 활동 제거) - parentId 기반
  static async cleanupDuplicateActivitiesByParentId(parentId: string, childId: string, date: string) {
    try {
      const schedule = await DataService.getDailyScheduleByParentId(parentId, childId, date);
      if (!schedule) return;
      
      let hasChanges = false;
      
      // 기관 활동 중복 제거
      if (schedule.childcareActivities && schedule.childcareActivities.length > 1) {
        const templateActivities = schedule.childcareActivities.filter(act => act.id.startsWith('template-'));
        if (templateActivities.length > 1) {
          // 첫 번째만 유지, 나머지 제거
          schedule.childcareActivities = schedule.childcareActivities.filter(act => 
            !act.id.startsWith('template-') || act.id === templateActivities[0].id
          );
          hasChanges = true;
          console.log(`🧹 ${date} 기관활동 중복 제거: ${templateActivities.length} → 1`);
        }
      }
      
      // 하원 후 활동 중복 제거
      if (schedule.afterSchoolActivities && schedule.afterSchoolActivities.length > 1) {
        const templateActivities = schedule.afterSchoolActivities.filter(act => act.id.startsWith('template-'));
        if (templateActivities.length > 1) {
          // 첫 번째만 유지, 나머지 제거
          schedule.afterSchoolActivities = schedule.afterSchoolActivities.filter(act => 
            !act.id.startsWith('template-') || act.id === templateActivities[0].id
          );
          hasChanges = true;
          console.log(`🧹 ${date} 하원후활동 중복 제거: ${templateActivities.length} → 1`);
        }
      }
      
      // 변경사항이 있으면 저장
      if (hasChanges) {
        await DataService.saveDailyScheduleByParentId(parentId, childId, schedule);
        console.log(`✅ ${date} 중복 데이터 정리 완료`);
      }
      
    } catch (error) {
      console.error(`❌ ${date} 중복 데이터 정리 실패:`, error);
    }
  }

  // ===== 반복 일정 템플릿 관리 =====
  


  static async updateRecurringTemplate(templateId: string, updates: Partial<RecurringActivity>) {
    try {
      await updateDoc(doc(db, 'recurringSchedules', templateId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('반복 일정 템플릿 업데이트 오류:', error);
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


  // 다음 주 범위 계산
  static getNextWeekRange(): WeekRange {
    const currentWeekRange = DataService.getCurrentWeekRange();
    const nextWeekStart = new Date(currentWeekRange.weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
    
    return {
      startDate: DataService.formatDate(nextWeekStart),
      endDate: DataService.formatDate(nextWeekEnd),
      weekStart: DataService.formatDate(nextWeekStart)
    };
  }

  // 특정 주의 특정 요일에 해당하는 날짜 문자열 반환
  static getDateStringForDayOfWeek(weekStartDate: string, dayOfWeek: DayOfWeek): string {
    const startDate = new Date(weekStartDate);
    const dayMap = {
      [DayOfWeek.MONDAY]: 0,
      [DayOfWeek.TUESDAY]: 1,
      [DayOfWeek.WEDNESDAY]: 2,
      [DayOfWeek.THURSDAY]: 3,
      [DayOfWeek.FRIDAY]: 4,
      [DayOfWeek.SATURDAY]: 5,
      [DayOfWeek.SUNDAY]: 6
    };
    
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + dayMap[dayOfWeek]);
    
    return DataService.formatDate(targetDate);
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
  






  // ===== 래퍼 함수들 (기존 호환성 유지용) =====
  
  // 스케줄 관련 래퍼 함수들
  static async saveDailySchedule(parentId: string, childId: string, schedule: DailySchedule) {
    return DataService.saveDailyScheduleByParentId(parentId, childId, schedule);
  }
  
  static async getDailySchedule(parentId: string, childId: string, date: string): Promise<DailySchedule | null> {
    return DataService.getDailyScheduleByParentId(parentId, childId, date);
  }
  
  static async getDateRangeSchedules(parentId: string, childId: string, dateRange: DateRange): Promise<DateRangeSchedules> {
    return DataService.getDateRangeSchedulesByParentId(parentId, childId, dateRange);
  }
  
  static async getCurrentWeekSchedules(parentId: string, childId: string): Promise<DateRangeSchedules> {
    return DataService.getCurrentWeekSchedulesByParentId(parentId, childId);
  }
  
  static onDateRangeSchedulesChange(
    parentId: string,
    childId: string,
    dateRange: DateRange,
    callback: (schedules: DateRangeSchedules) => void
  ): Unsubscribe {
    return DataService.onDateRangeSchedulesChangeByParentId(parentId, childId, dateRange, callback);
  }
  
  // 식단 관련 래퍼 함수들
  static async saveDateBasedMealPlan(parentId: string, date: string, mealPlan: DailyMealPlanNew) {
    return DataService.saveDateBasedMealPlanByParentId(parentId, date, mealPlan);
  }
  
  static async getDateBasedMealPlan(parentId: string, date: string): Promise<DailyMealPlanNew | null> {
    return DataService.getDateBasedMealPlanByParentId(parentId, date);
  }
  
  static async getDateRangeMealPlans(parentId: string, dateRange: DateRange): Promise<DateRangeMealPlan> {
    return DataService.getDateRangeMealPlansByParentId(parentId, dateRange);
  }
  
  static onDateBasedMealPlansChange(
    parentId: string, 
    dateRange: DateRange, 
    callback: (mealPlans: DateRangeMealPlan) => void
  ): Unsubscribe {
    return DataService.onDateBasedMealPlansChangeByParentId(parentId, dateRange, callback);
  }
  
  // 반복 템플릿 관련 래퍼 함수들
  static async getRecurringTemplates(parentId: string, childId: string): Promise<RecurringActivity[]> {
    return DataService.getRecurringTemplatesByParentId(parentId, childId);
  }
  
  static async saveRecurringTemplate(parentId: string, template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) {
    return DataService.saveRecurringTemplateByParentId(parentId, template);
  }
  
  static async applyRecurringTemplate(parentId: string, childId: string, template: RecurringActivity) {
    return DataService.applyRecurringTemplateByParentId(parentId, childId, template);
  }
  
  static async applyRecurringTemplateToWeek(parentId: string, childId: string, template: RecurringActivity, weekRange: WeekRange) {
    return DataService.applyRecurringTemplateToWeekByParentId(parentId, childId, template, weekRange);
  }
  
  // 인수인계 관련 래퍼 함수들
  static async createDailyHandoverNote(parentId: string, note: Omit<DailyHandoverNote, 'id'>): Promise<string> {
    return DataService.saveDailyHandoverNoteByParentId(parentId, note);
  }
  
  static async updateDailyHandoverNote(parentId: string, noteId: string, updates: Partial<DailyHandoverNote>): Promise<void> {
    return DataService.updateDailyHandoverNoteByParentId(parentId, noteId, updates);
  }
  
  static async deleteDailyHandoverNote(parentId: string, noteId: string): Promise<void> {
    return DataService.deleteDailyHandoverNoteByParentId(parentId, noteId);
  }
  
  static async getDailyHandoverNotes(parentId: string): Promise<DailyHandoverNote[]> {
    return DataService.getDailyHandoverNotesByParentId(parentId);
  }
  
  static onDailyHandoverNotesChange(parentId: string, callback: (notes: DailyHandoverNote[]) => void): Unsubscribe {
    return DataService.onDailyHandoverNotesChangeByParentId(parentId, callback);
  }
  

  // ===== PARENT ID 기반 데이터 접근 함수들 (새로운 통합 시스템용) =====


  // ===== 스케줄 관련 - parentId 기반 =====

  /**
   * parentId 기반 날짜별 스케줄 저장
   */
  static async saveDailyScheduleByParentId(parentId: string, childId: string, schedule: DailySchedule) {
    try {
      const docRef = doc(db, 'schedules', parentId, 'children', childId, 'days', schedule.date);
      const cleaned = DataService.cleanDailyScheduleForFirestore(schedule);
      await setDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('parentId 기반 날짜별 스케줄 저장 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 특정 날짜의 스케줄 가져오기
   */
  static async getDailyScheduleByParentId(parentId: string, childId: string, date: string): Promise<DailySchedule | null> {
    try {
      const docRef = doc(db, 'schedules', parentId, 'children', childId, 'days', date);
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
      console.error('parentId 기반 날짜별 스케줄 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 특정 기간의 스케줄들 가져오기
   */
  static async getDateRangeSchedulesByParentId(
    parentId: string, 
    childId: string, 
    dateRange: DateRange
  ): Promise<DateRangeSchedules> {
    try {
      const q = query(
        collection(db, 'schedules', parentId, 'children', childId, 'days'),
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
      console.error('parentId 기반 기간별 스케줄 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 현재 주의 스케줄들 가져오기
   */
  static async getCurrentWeekSchedulesByParentId(parentId: string, childId: string): Promise<DateRangeSchedules> {
    const weekRange = DataService.getCurrentWeekRange();
    return DataService.getDateRangeSchedulesByParentId(parentId, childId, weekRange);
  }

  /**
   * parentId 기반 날짜별 스케줄 실시간 구독
   */
  static onDateRangeSchedulesChangeByParentId(
    parentId: string,
    childId: string,
    dateRange: DateRange,
    callback: (schedules: DateRangeSchedules) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'schedules', parentId, 'children', childId, 'days'),
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

  // ===== 식사 계획 관련 - parentId 기반 =====

  /**
   * parentId 기반 특정 날짜의 식사 계획 저장
   */
  static async saveDateBasedMealPlanByParentId(parentId: string, date: string, mealPlan: DailyMealPlanNew) {
    try {
      await setDoc(doc(db, 'mealPlans', parentId, 'dates', date), {
        ...mealPlan,
        date,
        createdAt: mealPlan.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('parentId 기반 날짜별 식사 계획 저장 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 특정 날짜의 식사 계획 가져오기
   */
  static async getDateBasedMealPlanByParentId(parentId: string, date: string): Promise<DailyMealPlanNew | null> {
    try {
      const docSnap = await getDoc(doc(db, 'mealPlans', parentId, 'dates', date));
      
      if (docSnap.exists()) {
        return docSnap.data() as DailyMealPlanNew;
      }
      return null;
    } catch (error) {
      console.error('parentId 기반 날짜별 식사 계획 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 기간별 식사 계획 가져오기
   */
  static async getDateRangeMealPlansByParentId(
    parentId: string, 
    dateRange: DateRange
  ): Promise<DateRangeMealPlan> {
    try {
      const q = query(
        collection(db, 'mealPlans', parentId, 'dates'),
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
      console.error('parentId 기반 기간별 식단 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 날짜 범위의 식사 계획 실시간 구독
   */
  static onDateBasedMealPlansChangeByParentId(
    parentId: string, 
    dateRange: DateRange, 
    callback: (mealPlans: DateRangeMealPlan) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'mealPlans', parentId, 'dates'),
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

  // ===== 인수인계 메모 관련 - parentId 기반 =====

  /**
   * parentId 기반 인수인계 메모 저장
   */
  static async saveDailyHandoverNoteByParentId(parentId: string, note: Omit<DailyHandoverNote, 'id'>): Promise<string> {
    try {
      const noteRef = await addDoc(collection(db, 'dailyHandoverNotes', parentId, 'notes'), {
        ...note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return noteRef.id;
    } catch (error) {
      console.error('parentId 기반 인수인계 메모 저장 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 인수인계 메모 업데이트
   */
  static async updateDailyHandoverNoteByParentId(parentId: string, noteId: string, updates: Partial<DailyHandoverNote>): Promise<void> {
    try {
      await updateDoc(doc(db, 'dailyHandoverNotes', parentId, 'notes', noteId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('parentId 기반 인수인계 메모 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 인수인계 메모 삭제
   */
  static async deleteDailyHandoverNoteByParentId(parentId: string, noteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'dailyHandoverNotes', parentId, 'notes', noteId));
    } catch (error) {
      console.error('parentId 기반 인수인계 메모 삭제 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 인수인계 메모 가져오기
   */
  static async getDailyHandoverNotesByParentId(parentId: string): Promise<DailyHandoverNote[]> {
    try {
      const q = query(
        collection(db, 'dailyHandoverNotes', parentId, 'notes'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyHandoverNote[];
    } catch (error) {
      console.error('parentId 기반 인수인계 메모 가져오기 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 인수인계 메모 실시간 구독
   */
  static onDailyHandoverNotesChangeByParentId(parentId: string, callback: (notes: DailyHandoverNote[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'dailyHandoverNotes', parentId, 'notes'),
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

  // ===== 반복 일정 관련 - parentId 기반 =====

  /**
   * parentId 기반 반복 일정 템플릿 적용 (현재 주)
   */
  static async applyRecurringTemplateByParentId(parentId: string, childId: string, template: RecurringActivity) {
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
          
          const activityType = template.activityType === 'childcare' ? 'childcareActivities' : 'afterSchoolActivities';
          
          // 새 활동 생성
          const newActivity: Activity = {
            id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: template.activityType === 'childcare' && template.institutionName ? 
              template.institutionName : (template.name || template.institutionName || ''),
            startTime: template.startTime,
            endTime: template.endTime,
            institutionName: template.institutionName || ''
          };
          
          // 기존 스케줄 가져오기
          const currentSchedule = await DataService.getDailyScheduleByParentId(parentId, childId, dateString);
          
          const updatedSchedule: DailySchedule = {
            date: dateString,
            dayOfWeek,
            childId,
            childcareActivities: template.activityType === 'childcare' 
              ? [...(currentSchedule?.childcareActivities || []), newActivity]
              : (currentSchedule?.childcareActivities || []),
            afterSchoolActivities: template.activityType === 'afterSchool'
              ? [...(currentSchedule?.afterSchoolActivities || []), newActivity] 
              : (currentSchedule?.afterSchoolActivities || []),
            createdAt: currentSchedule?.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          updates.push({ dateString, schedule: updatedSchedule });
        }
      }
      
      // 모든 업데이트를 순차적으로 처리
      for (const update of updates) {
        await DataService.saveDailyScheduleByParentId(parentId, childId, update.schedule);
        await new Promise(resolve => setTimeout(resolve, 100)); // 잠시 대기
      }
      
    } catch (error) {
      console.error('parentId 기반 반복 일정 템플릿 적용 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 특정 주에 템플릿 적용
   */
  static async applyRecurringTemplateToWeekByParentId(parentId: string, childId: string, template: RecurringActivity, weekRange: WeekRange) {
    try {
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
            description: template.activityType === 'childcare' && template.institutionName ? 
              template.institutionName : (template.name || template.institutionName || ''),
            startTime: template.startTime,
            endTime: template.endTime,
            institutionName: template.institutionName || ''
          };
          
          // 기존 스케줄 가져오기
          const currentSchedule = await DataService.getDailyScheduleByParentId(parentId, childId, dateString);
          
          const updatedSchedule: DailySchedule = {
            date: dateString,
            dayOfWeek,
            childId,
            childcareActivities: template.activityType === 'childcare' 
              ? [...(currentSchedule?.childcareActivities || []), newActivity]
              : (currentSchedule?.childcareActivities || []),
            afterSchoolActivities: template.activityType === 'afterSchool'
              ? [...(currentSchedule?.afterSchoolActivities || []), newActivity] 
              : (currentSchedule?.afterSchoolActivities || []),
            createdAt: currentSchedule?.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          updates.push({ dateString, schedule: updatedSchedule });
        }
      }
      
      // 모든 업데이트를 순차적으로 처리
      for (const update of updates) {
        await DataService.saveDailyScheduleByParentId(parentId, childId, update.schedule);
        await new Promise(resolve => setTimeout(resolve, 100)); // 잠시 대기
      }
      
    } catch (error) {
      console.error('parentId 기반 특정 주에 반복 일정 템플릿 적용 오류:', error);
      throw error;
    }
  }

  // ===== 투약 정보 관련 - parentId 기반 =====

  /**
   * parentId 기반 투약 정보 추가
   */
  static async addMedicationByParentId(parentId: string, medication: Omit<Medication, 'id'>) {
    try {
      const cleanedMedication = DataService.cleanMedication(medication);
      await addDoc(collection(db, 'medications'), {
        ...cleanedMedication,
        parentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('parentId 기반 투약 정보 추가 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 투약 정보 가져오기
   */
  static async getMedicationsByParentId(parentId: string): Promise<Medication[]> {
    try {
      const q = query(
        collection(db, 'medications'),
        where('parentId', '==', parentId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
    } catch (error) {
      console.error('parentId 기반 투약 정보 가져오기 오류:', error);
      return [];
    }
  }

  /**
   * parentId 기반 투약 정보 실시간 구독
   */
  static onMedicationsByParentIdChange(parentId: string, callback: (medications: Medication[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'medications'),
      where('parentId', '==', parentId),
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

  // ===== 특별 일정 관련 - parentId 기반 =====

  /**
   * parentId 기반 특별 일정 추가 (권한 기반)
   */
  static async addSpecialScheduleItemWithPermissionByParentId(parentId: string, item: Omit<SpecialScheduleItem, 'id'>, requesterId: string, targetUserId?: string) {
    try {
      // Clean data to remove undefined fields
      const cleanedItem = DataService.cleanSpecialScheduleItem(item);
      const cleanedData: any = {
        ...cleanedItem,
        parentId,
        createdBy: requesterId,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Only add targetUserId if it's defined and not empty
      if (targetUserId && targetUserId.trim() !== '') {
        cleanedData.targetUserId = targetUserId;
      }
      
      await addDoc(collection(db, 'specialSchedules'), cleanedData);
    } catch (error) {
      console.error('parentId 기반 특별 일정 추가 오류:', error);
      throw error;
    }
  }

  /**
   * parentId 기반 특별 일정 가져오기
   */
  static async getSpecialScheduleItemsByParentId(parentId: string): Promise<SpecialScheduleItem[]> {
    try {
      const q = query(
        collection(db, 'specialSchedules'),
        where('parentId', '==', parentId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];
    } catch (error) {
      console.error('parentId 기반 특별 일정 가져오기 오류:', error);
      return [];
    }
  }

  /**
   * parentId 기반 특별 일정 가져오기 (필터 적용)
   */
  static async getSpecialScheduleItemsWithFilterByParentId(parentId: string, userType: string, userId: string): Promise<SpecialScheduleItem[]> {
    try {
      const q = query(
        collection(db, 'specialSchedules'),
        where('parentId', '==', parentId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const allItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];

      // 권한에 따른 필터링
      return allItems.filter(item => {
        if (userType === 'PARENT') {
          // 부모는 모든 특별 일정을 볼 수 있음
          return true;
        } else {
          // 돌보선생님은 자신이 대상인 것 또는 자신이 작성한 것만 보기
          return item.targetUserId === userId || item.createdBy === userId || !item.targetUserId;
        }
      });
    } catch (error) {
      console.error('parentId 기반 특별 일정 필터 가져오기 오류:', error);
      return [];
    }
  }

  /**
   * parentId 기반 특별 일정 실시간 구독
   */
  static onSpecialScheduleItemsByParentIdChange(parentId: string, callback: (items: SpecialScheduleItem[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'specialSchedules'),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];
      callback(items);
    });
  }

  /**
   * parentId 기반 특별 일정 실시간 구독 (필터 적용)
   */
  static onSpecialScheduleItemsWithFilterByParentIdChange(parentId: string, userType: string, userId: string, callback: (items: SpecialScheduleItem[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'specialSchedules'),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const allItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];

      // 권한에 따른 필터링
      const filteredItems = allItems.filter(item => {
        if (userType === 'PARENT') {
          // 부모는 모든 특별 일정을 볼 수 있음
          return true;
        } else {
          // 돌보선생님은 자신이 대상인 것 또는 자신이 작성한 것만 보기
          return item.targetUserId === userId || item.createdBy === userId || !item.targetUserId;
        }
      });
      callback(filteredItems);
    });
  }

  // ===== 반복 템플릿 관련 - parentId 기반 =====

  /**
   * parentId 기반 반복 템플릿 가져오기
   */
  static async getRecurringTemplatesByParentId(parentId: string, childId: string): Promise<RecurringActivity[]> {
    try {
      const q = query(
        collection(db, 'recurringSchedules'),
        where('parentId', '==', parentId),
        where('childId', '==', childId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecurringActivity[];
    } catch (error) {
      console.error('parentId 기반 반복 템플릿 가져오기 오류:', error);
      return [];
    }
  }

  /**
   * Firestore 저장용 RecurringActivity 정제 함수 (undefined 제거)
   */
  private static cleanRecurringTemplate(template: any): any {
    const cleaned: any = {};
    Object.entries(template).forEach(([key, value]) => {
      if (value !== undefined) cleaned[key] = value;
    });
    return cleaned;
  }

  /**
   * parentId 기반 반복 템플릿 저장
   */
  static async saveRecurringTemplateByParentId(parentId: string, template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const cleanedTemplate = DataService.cleanRecurringTemplate({
        ...template,
        parentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'recurringSchedules'), cleanedTemplate);
    } catch (error) {
      console.error('parentId 기반 반복 템플릿 저장 오류:', error);
      throw error;
    }
  }
}

export default DataService;
