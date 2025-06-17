import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { useAuth } from './useAuth';
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
import toast from 'react-hot-toast';

export const useData = () => {
  const { connection, userProfile, user } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  
  // 기존 주간 기반 데이터 (단계적 제거 예정)
  const [mealPlan, setMealPlan] = useState<DailyMealPlan>({} as DailyMealPlan);
  
  // 새로운 날짜별 데이터
  const [currentWeekSchedules, setCurrentWeekSchedules] = useState<ChildDateSchedules>({});
  const [currentWeekMealPlans, setCurrentWeekMealPlans] = useState<DateRangeMealPlan>({});
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [specialScheduleItems, setSpecialScheduleItems] = useState<SpecialScheduleItem[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [recurringTemplates, setRecurringTemplates] = useState<{[childId: string]: RecurringActivity[]}>({});
  const [loading, setLoading] = useState(true);
  
  // 다대다 관계 타입 시스템 상태
  const [multiConnections, setMultiConnections] = useState<MultiConnection[]>([]);
  const [careProviderAssignments, setCareProviderAssignments] = useState<CareProviderAssignment[]>([]);
  const [schedulePatterns, setSchedulePatterns] = useState<SchedulePattern[]>([]);
  const [dailyHandoverNotes, setDailyHandoverNotes] = useState<DailyHandoverNote[]>([]);

  const connectionId = connection?.id;

  // 데이터 초기 로드
  useEffect(() => {
    if (!connectionId || !connection) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Connection에서 아이 정보 직접 사용
        const childrenData = connection.children || [];
        
        // 나머지 데이터 병렬로 로드
        const [
          mealPlanData,
          medicationsData,
          specialItemsData
        ] = await Promise.all([
          DataService.getMealPlan(connectionId),
          DataService.getMedications(connectionId),
          DataService.getSpecialScheduleItems(connectionId)
        ]);

        setChildren(childrenData);
        setMealPlan(mealPlanData || {} as DailyMealPlan);
        setMedications(medicationsData);
        setSpecialScheduleItems(specialItemsData);

        // 개별 사용자 근무 일정 로드
        if (user?.uid) {
          const workScheduleData = await DataService.getWorkSchedule(user.uid);
          setWorkSchedule(workScheduleData);
        }
        
        // 새로운 날짜별 스케줄 초기 로드
        console.log('📅 새로운 날짜별 스케줄 초기 로드 시작');
        if (childrenData.length > 0) {
          const weekRange = DataService.getCurrentWeekRange();
          const schedules: ChildDateSchedules = {};
          
          // 모든 아이들의 현재 주 스케줄을 병렬로 로드
          await Promise.all(
            childrenData.map(async (child) => {
              try {
                const childSchedules = await DataService.getDateRangeSchedules(
                  connectionId, 
                  child.id, 
                  weekRange
                );
                schedules[child.id] = childSchedules;
                console.log(`✅ ${child.name} 스케줄 로드 완료:`, Object.keys(childSchedules).length, '날짜');
              } catch (error) {
                console.error(`❌ ${child.name} 스케줄 로드 실패:`, error);
                schedules[child.id] = {}; // 빈 스케줄로 설정
              }
            })
          );
          
          setCurrentWeekSchedules(schedules);
          console.log('🎉 모든 아이들의 스케줄 로드 완료');
        }

      } catch (error) {
        console.error('데이터 로드 오류:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [connectionId, connection, user?.uid]);

  // 실시간 데이터 구독
  useEffect(() => {
    if (!connectionId) return;

    const unsubscribes: (() => void)[] = [];

    // 식사 계획 실시간 구독
    const unsubscribeMealPlan = DataService.onMealPlanChange(connectionId, (plan) => {
      if (plan) setMealPlan(plan);
    });
    unsubscribes.push(unsubscribeMealPlan);

    // 투약 정보 실시간 구독
    const unsubscribeMedications = DataService.onMedicationsChange(connectionId, (meds) => {
      setMedications(meds);
    });
    unsubscribes.push(unsubscribeMedications);

    // 특별 일정 실시간 구독
    const unsubscribeSpecialItems = DataService.onSpecialScheduleItemsChange(connectionId, (items) => {
      setSpecialScheduleItems(items);
    });
    unsubscribes.push(unsubscribeSpecialItems);

    // 근무 일정 실시간 구독
    if (user?.uid) {
      const unsubscribeWorkSchedule = DataService.onWorkScheduleChange(user.uid, (schedule) => {
        setWorkSchedule(schedule);
      });
      unsubscribes.push(unsubscribeWorkSchedule);
      
      // 다대다 관계 구독
      const unsubscribeMultiConnections = DataService.onMultiConnectionsChange(user.uid, (connections) => {
        setMultiConnections(connections);
      });
      unsubscribes.push(unsubscribeMultiConnections);
      
      // 일일 인수인계 메모 구독
      if (connectionId && DataService.onDailyHandoverNotesChange) {
        const unsubscribeDailyHandoverNotes = DataService.onDailyHandoverNotesChange(connectionId, (notes: DailyHandoverNote[]) => {
          setDailyHandoverNotes(Array.isArray(notes) ? notes : []);
        });
        unsubscribes.push(unsubscribeDailyHandoverNotes);
      }
    }

    // 클린업
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connectionId, user?.uid]);

  // 아이 정보 저장
  const saveChildren = useCallback(async (childrenData: ChildInfo[]) => {
    if (!connectionId) return;

    try {
      await DataService.saveChildren(connectionId, childrenData);
      setChildren(childrenData);
      toast.success('아이 정보가 저장되었습니다.');
    } catch (error) {
      console.error('아이 정보 저장 오류:', error);
      toast.error('아이 정보 저장에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  // 식사 계획 업데이트
  const updateMealPlan = useCallback(async (day: DayOfWeek, menu: string, notes: string) => {
    if (!connectionId) return;

    try {
      const updatedMealPlan = {
        ...mealPlan,
        [day]: { menu, notes }
      };

      await DataService.saveMealPlan(connectionId, updatedMealPlan);
      // 실시간 구독으로 상태는 자동 업데이트됨
    } catch (error) {
      console.error('식사 계획 업데이트 오류:', error);
      toast.error('식사 계획 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId, mealPlan]);

  // ===== 새로운 날짜 기반 식사 계획 관리 =====
  
  // 현재 주 식사 계획들 로드
  const loadCurrentWeekMealPlans = useCallback(async () => {
    if (!connectionId) return;

    try {
      const weekRange = DataService.getCurrentWeekRange();
      console.log('🍽️ loadCurrentWeekMealPlans 시작:', { connectionId, weekRange });
      
      const mealPlans = await DataService.getDateRangeMealPlans(connectionId, weekRange);
      console.log('🍽️ 현재 주 식사 계획 로딩 완료:', mealPlans);
      
      setCurrentWeekMealPlans(mealPlans);
    } catch (error) {
      console.error('현재 주 식사 계획 로드 오류:', error);
      toast.error('식사 계획을 불러오는데 실패했습니다.');
    }
  }, [connectionId]);

  // 특정 날짜의 식사 계획 업데이트
  const updateDateBasedMealPlan = useCallback(async (date: string, mealPlan: DailyMealPlanNew) => {
    if (!connectionId) return;

    try {
      await DataService.saveDateBasedMealPlan(connectionId, date, mealPlan);
      
      // 로컬 상태 업데이트
      setCurrentWeekMealPlans(prev => ({
        ...prev,
        [date]: mealPlan
      }));
      
      toast.success('식사 계획이 업데이트되었습니다.');
    } catch (error) {
      console.error('날짜별 식사 계획 업데이트 오류:', error);
      toast.error('식사 계획 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  // 자동 마이그레이션 확인 및 실행
  const checkAndMigrateMealPlan = useCallback(async (): Promise<boolean> => {
    if (!connectionId) return false;

    try {
      console.log('🔍 식사 계획 마이그레이션 상태 확인 중...');
      
      // 1. 현재 주 날짜 기반 식사 계획 확인
      const weekRange = DataService.getCurrentWeekRange();
      const currentDatePlans = await DataService.getDateRangeMealPlans(connectionId, weekRange);
      const hasDateBasedData = Object.keys(currentDatePlans).length > 0;
      
      // 2. 기존 요일 기반 식사 계획 확인
      const hasWeeklyData = mealPlan && Object.values(mealPlan).some(meal => meal?.menu);
      
      console.log('📊 마이그레이션 상태:', { hasDateBasedData, hasWeeklyData });
      
      // 3. 마이그레이션 필요성 판단
      if (hasDateBasedData) {
        console.log('✅ 이미 날짜 기반 데이터가 존재함 - 마이그레이션 불필요');
        return true; // 이미 날짜 기반 데이터 존재
      }
      
      if (!hasWeeklyData) {
        console.log('ℹ️ 마이그레이션할 요일 기반 데이터가 없음');
        return false; // 마이그레이션할 데이터 없음
      }
      
      // 4. 자동 마이그레이션 실행
      console.log('🚀 자동 마이그레이션 시작...');
      
      // 날짜 배열 생성 (generateWeekDates 함수 대신 직접 구현)
      const dates = [];
      const monday = new Date(weekRange.weekStart);
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(DataService.formatDate(date));
      }
      
      const dayOfWeekKeys = Object.keys(mealPlan) as DayOfWeek[];
      
      let migratedCount = 0;
      const migrationPromises = dayOfWeekKeys.map(async (dayOfWeek, index) => {
        const dayMeal = mealPlan[dayOfWeek];
        if (dayMeal && dayMeal.menu.trim()) {
          const date = dates[index];
          const dateMealPlan: DailyMealPlanNew = {
            date,
            menu: dayMeal.menu,
            notes: dayMeal.notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await DataService.saveDateBasedMealPlan(connectionId, date, dateMealPlan);
          migratedCount++;
          console.log(`✅ ${dayOfWeek} → ${date} 마이그레이션 완료: ${dayMeal.menu}`);
        }
      });
      
      await Promise.all(migrationPromises);
      
      if (migratedCount > 0) {
        console.log(`🎉 마이그레이션 완료: ${migratedCount}개 항목 변환`);
        await loadCurrentWeekMealPlans(); // 새로운 데이터 로드
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ 자동 마이그레이션 실패:', error);
      toast.error('식사 계획 업그레이드 중 문제가 발생했습니다.');
      return false;
    }
  }, [connectionId, mealPlan, loadCurrentWeekMealPlans]);

  // 투약 정보 관리
  const addMedication = useCallback(async (medication: Omit<Medication, 'id' | 'administered'>) => {
    if (!connectionId) return;

    try {
      await DataService.addMedication(connectionId, { ...medication, administered: false });
      toast.success('투약 정보가 추가되었습니다.');
    } catch (error) {
      console.error('투약 정보 추가 오류:', error);
      toast.error('투약 정보 추가에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  const updateMedication = useCallback(async (medicationId: string, updates: Partial<Medication>) => {
    try {
      await DataService.updateMedication(medicationId, updates);
      toast.success('투약 정보가 수정되었습니다.');
    } catch (error) {
      console.error('투약 정보 수정 오류:', error);
      toast.error('투약 정보 수정에 실패했습니다.');
      throw error;
    }
  }, []);

  const deleteMedication = useCallback(async (medicationId: string) => {
    try {
      await DataService.deleteMedication(medicationId);
      toast.success('투약 정보가 삭제되었습니다.');
    } catch (error) {
      console.error('투약 정보 삭제 오류:', error);
      toast.error('투약 정보 삭제에 실패했습니다.');
      throw error;
    }
  }, []);

  const toggleMedicationAdministered = useCallback(async (medicationId: string) => {
    const medication = medications.find(med => med.id === medicationId);
    if (!medication) return;

    try {
      await DataService.updateMedication(medicationId, { administered: !medication.administered });
      toast.success(medication.administered ? '투약 미완료로 변경되었습니다.' : '투약 완료되었습니다.');
    } catch (error) {
      console.error('투약 상태 변경 오류:', error);
      toast.error('투약 상태 변경에 실패했습니다.');
      throw error;
    }
  }, [medications]);

  // 특별 일정 관리
  const addSpecialScheduleItem = useCallback(async (item: Omit<SpecialScheduleItem, 'id'>) => {
    if (!connectionId || !user?.uid) return;

    try {
      await DataService.addSpecialScheduleItem(connectionId, {
        ...item,
        createdBy: user.uid,
        creatorUserType: userProfile?.userType
      });
      toast.success('요청이 등록되었습니다.');
    } catch (error) {
      console.error('특별 일정 추가 오류:', error);
      toast.error('요청 등록에 실패했습니다.');
      throw error;
    }
  }, [connectionId, user?.uid, userProfile?.userType]);

  const updateSpecialScheduleItem = useCallback(async (itemId: string, updates: Partial<SpecialScheduleItem>) => {
    try {
      await DataService.updateSpecialScheduleItem(itemId, updates);
      toast.success('요청이 수정되었습니다.');
    } catch (error) {
      console.error('특별 일정 수정 오류:', error);
      toast.error('요청 수정에 실패했습니다.');
      throw error;
    }
  }, []);

  const deleteSpecialScheduleItem = useCallback(async (itemId: string) => {
    try {
      await DataService.deleteSpecialScheduleItem(itemId);
      toast.success('요청이 삭제되었습니다.');
    } catch (error) {
      console.error('특별 일정 삭제 오류:', error);
      toast.error('요청 삭제에 실패했습니다.');
      throw error;
    }
  }, []);

  // 근무 일정 관리
  const updateWorkSchedule = useCallback(async (schedule: WorkSchedule) => {
    if (!user?.uid) return;

    try {
      await DataService.saveWorkSchedule(user.uid, schedule);
      toast.success('근무 일정이 저장되었습니다.');
    } catch (error) {
      console.error('근무 일정 저장 오류:', error);
      toast.error('근무 일정 저장에 실패했습니다.');
      throw error;
    }
  }, [user?.uid]);

  // ===== 새로운 날짜별 스케줄 관리 함수들 =====
  
  // 현재 주 스케줄들 로드
  const loadCurrentWeekSchedules = useCallback(async () => {
    if (!connectionId || !connection?.children) return;

    try {
      const weekRange = DataService.getCurrentWeekRange();
      console.log('📅 loadCurrentWeekSchedules 시작:', { connectionId, children: connection.children.length, weekRange });
      const schedules: ChildDateSchedules = {};
      
      // 모든 아이들의 현재 주 스케줄을 병렬로 로드
      await Promise.all(
        connection.children.map(async (child) => {
          console.log(`👶 ${child.name} (${child.id}) 스케줄 로딩 시작`);
          const childSchedules = await DataService.getDateRangeSchedules(
            connectionId, 
            child.id, 
            weekRange
          );
          console.log(`👶 ${child.name} (${child.id}) 스케줄 로딩 완료:`, childSchedules);
          schedules[child.id] = childSchedules;
        })
      );
      
      console.log('📅 전체 스케줄 로딩 완료:', schedules);
      setCurrentWeekSchedules(schedules);
    } catch (error) {
      console.error('현재 주 스케줄 로드 오류:', error);
      toast.error('스케줄을 불러오는데 실패했습니다.');
    }
  }, [connectionId, connection?.children]);

  // 특정 날짜의 스케줄 업데이트
  const updateDailySchedule = useCallback(async (
    childId: string,
    date: string,
    activityType: keyof DailyActivities,
    activities: Activity[]
  ) => {
    if (!connectionId) return;

    try {
      // 기존 스케줄 가져오기 또는 새로 생성
      const existingSchedule = currentWeekSchedules[childId]?.[date];
      const dayOfWeek = DataService.getDayOfWeek(date);
      
      const updatedSchedule: DailySchedule = {
        date,
        dayOfWeek,
        childId,
        childcareActivities: activityType === 'childcareActivities' ? activities : (existingSchedule?.childcareActivities || []),
        afterSchoolActivities: activityType === 'afterSchoolActivities' ? activities : (existingSchedule?.afterSchoolActivities || []),
        createdAt: existingSchedule?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await DataService.saveDailySchedule(connectionId, childId, updatedSchedule);
      
      // 로컬 상태 업데이트
      setCurrentWeekSchedules(prev => ({
        ...prev,
        [childId]: {
          ...prev[childId],
          [date]: updatedSchedule
        }
      }));
      
    } catch (error) {
      console.error('날짜별 스케줄 업데이트 오류:', error);
      toast.error('스케줄 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId, currentWeekSchedules]);

  // 여러 날짜 일괄 업데이트 (기관 시간 일괄 설정용)
  const updateMultipleDays = useCallback(async (
    childId: string,
    updates: Array<{
      date: string;
      activityType: keyof DailyActivities;
      activities: Activity[];
    }>
  ) => {
    if (!connectionId) return;

    try {
      // 순차 처리로 Firebase 동시 쓰기 문제 해결
      for (const update of updates) {
        await updateDailySchedule(childId, update.date, update.activityType, update.activities);
        // 각 업데이트 후 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      toast.success('모든 날짜가 성공적으로 업데이트되었습니다!');
    } catch (error) {
      console.error('일괄 업데이트 오류:', error);
      toast.error('일괄 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId, updateDailySchedule]);

  // 기존 주간 스케줄을 날짜별 스케줄로 마이그레이션
  const migrateWeeklyToDaily = useCallback(async (childId: string) => {
    if (!connectionId || !currentWeekSchedules[childId]) return;

    try {
      const weekRange = DataService.getCurrentWeekRange();
      const weeklySchedule = currentWeekSchedules[childId];
      const dates = generateWeekDates(weekRange.weekStart);
      
      const migrationUpdates = [];
      
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const dayOfWeek = Object.values(DayOfWeek)[i]; // 월, 화, 수...
        const dayActivities = weeklySchedule[dayOfWeek];
        
        if (dayActivities) {
          // 기관 활동 마이그레이션
          if (dayActivities.childcareActivities.length > 0) {
            migrationUpdates.push({
              date,
              activityType: 'childcareActivities' as const,
              activities: dayActivities.childcareActivities
            });
          }
          
          // 하원 후 활동 마이그레이션
          if (dayActivities.afterSchoolActivities.length > 0) {
            migrationUpdates.push({
              date,
              activityType: 'afterSchoolActivities' as const,
              activities: dayActivities.afterSchoolActivities
            });
          }
        }
      }
      
      if (migrationUpdates.length > 0) {
        await updateMultipleDays(childId, migrationUpdates);
        console.log(`✅ ${childId} 마이그레이션 완료`);
      }
      
    } catch (error) {
      console.error('마이그레이션 오류:', error);
      toast.error('마이그레이션에 실패했습니다.');
    }
  }, [connectionId, currentWeekSchedules, updateMultipleDays]);

  // 주간 날짜 배열 생성 헬퍼 함수
  const generateWeekDates = useCallback((mondayDate: string): string[] => {
    const dates = [];
    const monday = new Date(mondayDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(DataService.formatDate(date));
    }
    
    return dates;
  }, []);

  // 현재 주 날짜별 스케줄 실시간 구독
  useEffect(() => {
    if (!connectionId || !connection?.children) return;

    const unsubscribes: (() => void)[] = [];
    const weekRange = DataService.getCurrentWeekRange();

    // 각 아이별로 현재 주 스케줄 구독
    connection.children.forEach((child) => {
      const unsubscribe = DataService.onDateRangeSchedulesChange(
        connectionId,
        child.id,
        weekRange,
        (schedules) => {
          setCurrentWeekSchedules(prev => ({
            ...prev,
            [child.id]: schedules
          }));
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connectionId, connection?.children]);

  // ===== 반복 일정 템플릿 관리 함수들 =====
  
  // 특정 아이의 반복 일정 템플릿 로드
  const loadRecurringTemplates = useCallback(async (childId: string) => {
    if (!connectionId) return;

    try {
      const templates = await DataService.getRecurringTemplates(connectionId, childId);
      setRecurringTemplates(prev => ({
        ...prev,
        [childId]: templates
      }));
    } catch (error) {
      console.error('반복 일정 템플릿 로드 오류:', error);
      // 오류가 발생해도 빈 배열로 설정하여 앱이 지속되도록 함
      setRecurringTemplates(prev => ({
        ...prev,
        [childId]: []
      }));
      // 사용자에게 인덱스 준비 메시지 표시
      if (error.message && error.message.includes('index')) {
        console.log('템플릿 인덱스가 아직 준비 중입니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('템플릿을 불러오는데 실패했습니다.');
      }
    }
  }, [connectionId]);

  // 반복 일정 템플릿 저장
  const saveRecurringTemplate = useCallback(async (template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!connectionId) return;

    try {
      await DataService.saveRecurringTemplate(connectionId, template);
      // 해당 아이의 템플릿 목록 다시 로드
      await loadRecurringTemplates(template.childId);
      toast.success('템플릿이 저장되었습니다.');
    } catch (error) {
      console.error('반복 일정 템플릿 저장 오류:', error);
      toast.error('템플릿 저장에 실패했습니다.');
      throw error;
    }
  }, [connectionId, loadRecurringTemplates]);

  // 반복 일정 템플릿 삭제
  const deleteRecurringTemplate = useCallback(async (templateId: string, childId: string) => {
    try {
      await DataService.deleteRecurringTemplate(templateId);
      // 해당 아이의 템플릿 목록 다시 로드
      await loadRecurringTemplates(childId);
      toast.success('템플릿이 삭제되었습니다.');
    } catch (error) {
      console.error('반복 일정 템플릿 삭제 오류:', error);
      toast.error('템플릿 삭제에 실패했습니다.');
      throw error;
    }
  }, [loadRecurringTemplates]);

  // 반복 일정 템플릿 적용
  const applyRecurringTemplate = useCallback(async (templateId: string, childId: string) => {
    if (!connectionId) return;

    try {
      const template = recurringTemplates[childId]?.find(t => t.id === templateId);
      if (!template) {
        toast.error('템플릿을 찾을 수 없습니다.');
        return;
      }

      await DataService.applyRecurringTemplate(connectionId, childId, template);
      // 현재 주 스케줄 다시 로드
      await loadCurrentWeekSchedules();
      toast.success('템플릿이 적용되었습니다.');
    } catch (error) {
      console.error('반복 일정 템플릿 적용 오류:', error);
      toast.error('템플릿 적용에 실패했습니다.');
      throw error;
    }
  }, [connectionId, recurringTemplates, loadCurrentWeekSchedules]);

  // ===== 다대다 관계 타입 시스템 함수들 =====
  
  // 다대다 연결 관리
  const createMultiConnection = useCallback(async (connection: Omit<MultiConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await DataService.createMultiConnection(connection);
      toast.success('다대다 연결이 생성되었습니다.');
      return id;
    } catch (error) {
      console.error('다대다 연결 생성 오류:', error);
      toast.error('다대다 연결 생성에 실패했습니다.');
      throw error;
    }
  }, []);

  const updateMultiConnection = useCallback(async (connectionId: string, updates: Partial<MultiConnection>) => {
    try {
      await DataService.updateMultiConnection(connectionId, updates);
      toast.success('다대다 연결이 업데이트되었습니다.');
    } catch (error) {
      console.error('다대다 연결 업데이트 오류:', error);
      toast.error('다대다 연결 업데이트에 실패했습니다.');
      throw error;
    }
  }, []);

  // 돌봄 선생님 할당 관리
  const createCareProviderAssignment = useCallback(async (assignment: Omit<CareProviderAssignment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await DataService.createCareProviderAssignment(assignment);
      toast.success('돌봄 선생님이 할당되었습니다.');
      return id;
    } catch (error) {
      console.error('돌봄 선생님 할당 오류:', error);
      toast.error('돌봄 선생님 할당에 실패했습니다.');
      throw error;
    }
  }, []);

  const updateCareProviderAssignment = useCallback(async (assignmentId: string, updates: Partial<CareProviderAssignment>) => {
    try {
      await DataService.updateCareProviderAssignment(assignmentId, updates);
      toast.success('돌봄 선생님 할당이 업데이트되었습니다.');
    } catch (error) {
      console.error('돌봄 선생님 할당 업데이트 오류:', error);
      toast.error('돌봄 선생님 할당 업데이트에 실패했습니다.');
      throw error;
    }
  }, []);

  const deleteCareProviderAssignment = useCallback(async (assignmentId: string) => {
    try {
      await DataService.deleteCareProviderAssignment(assignmentId);
      toast.success('돌봄 선생님 할당이 삭제되었습니다.');
    } catch (error) {
      console.error('돌봄 선생님 할당 삭제 오류:', error);
      toast.error('돌봄 선생님 할당 삭제에 실패했습니다.');
      throw error;
    }
  }, []);

  // 스케줄 패턴 관리
  const loadSchedulePatterns = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const patterns = await DataService.getSchedulePatterns(user.uid);
      setSchedulePatterns(patterns);
    } catch (error) {
      console.error('스케줄 패턴 로드 오류:', error);
      toast.error('스케줄 패턴을 불러오는데 실패했습니다.');
    }
  }, [user?.uid]);

  const createSchedulePattern = useCallback(async (pattern: Omit<SchedulePattern, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await DataService.createSchedulePattern(pattern);
      await loadSchedulePatterns();
      toast.success('스케줄 패턴이 생성되었습니다.');
      return id;
    } catch (error) {
      console.error('스케줄 패턴 생성 오류:', error);
      toast.error('스케줄 패턴 생성에 실패했습니다.');
      throw error;
    }
  }, [loadSchedulePatterns]);

  const updateSchedulePattern = useCallback(async (patternId: string, updates: Partial<SchedulePattern>) => {
    try {
      await DataService.updateSchedulePattern(patternId, updates);
      await loadSchedulePatterns();
      toast.success('스케줄 패턴이 업데이트되었습니다.');
    } catch (error) {
      console.error('스케줄 패턴 업데이트 오류:', error);
      toast.error('스케줄 패턴 업데이트에 실패했습니다.');
      throw error;
    }
  }, [loadSchedulePatterns]);

  const deleteSchedulePattern = useCallback(async (patternId: string) => {
    try {
      await DataService.deleteSchedulePattern(patternId);
      await loadSchedulePatterns();
      toast.success('스케줄 패턴이 삭제되었습니다.');
    } catch (error) {
      console.error('스케줄 패턴 삭제 오류:', error);
      toast.error('스케줄 패턴 삭제에 실패했습니다.');
      throw error;
    }
  }, [loadSchedulePatterns]);

  // 일일 인수인계 메모 관리
  const createDailyHandoverNote = useCallback(async (note: Omit<DailyHandoverNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await DataService.createDailyHandoverNote?.(note);
      toast.success('인수인계 메모가 생성되었습니다.');
      return id;
    } catch (error) {
      console.error('인수인계 메모 생성 오류:', error);
      toast.error('인수인계 메모 생성에 실패했습니다.');
      throw error;
    }
  }, []);

  const updateDailyHandoverNote = useCallback(async (noteId: string, updates: Partial<DailyHandoverNote>) => {
    if (!connectionId) return;
    try {
      await DataService.updateDailyHandoverNote?.(noteId, connectionId, updates);
      toast.success('인수인계 메모가 수정되었습니다.');
    } catch (error) {
      console.error('인수인계 메모 수정 오류:', error);
      toast.error('인수인계 메모 수정에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  const deleteDailyHandoverNote = useCallback(async (noteId: string) => {
    if (!connectionId) return;
    try {
      await DataService.deleteDailyHandoverNote?.(noteId, connectionId);
      toast.success('인수인계 메모가 삭제되었습니다.');
    } catch (error) {
      console.error('인수인계 메모 삭제 오류:', error);
      toast.error('인수인계 메모 삭제에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  const searchHandoverNotesByDay = useCallback(async (dayOfWeek: DayOfWeek): Promise<DailyHandoverNote[]> => {
    if (!connectionId) return [];
    try {
      const notes = await DataService.getHandoverNotesByDayOfWeek?.(connectionId, dayOfWeek);
      return notes || [];
    } catch (error) {
      console.error('요일별 인수인계 메모 검색 오류:', error);
      toast.error('요일별 인수인계 메모 검색에 실패했습니다.');
      return [];
    }
  }, [connectionId]);

  const getTodayHandoverNotes = useCallback(async (): Promise<DailyHandoverNote[]> => {
    if (!connectionId) return [];
    try {
      const today = new Date().toISOString().split('T')[0];
      const notes = await DataService.getTodayHandoverNotes?.(connectionId, today);
      return notes || [];
    } catch (error) {
      console.error('당일 인수인계 메모 조회 오류:', error);
      toast.error('당일 인수인계 메모 조회에 실패했습니다.');
      return [];
    }
  }, [connectionId]);

  return {
    // 기존 상태 (단계적 제거 예정)
    children,
    mealPlan,
    medications,
    specialScheduleItems,
    workSchedule,
    loading,
    
    // 새로운 날짜별 상태
    currentWeekSchedules,
    currentWeekMealPlans,
    
    // 반복 일정 템플릿 상태
    recurringTemplates,
    
    // 다대다 관계 타입 시스템 상태
    multiConnections,
    careProviderAssignments,
    schedulePatterns,
    dailyHandoverNotes,
    
    // 아이 정보 관리
    saveChildren,
    
    // 근무 일정 관리
    updateWorkSchedule,
    
    // 새로운 날짜별 일정 관리
    loadCurrentWeekSchedules,
    updateDailySchedule,
    updateMultipleDays,
    migrateWeeklyToDaily,
    generateWeekDates,
    
    // 반복 일정 템플릿 관리
    loadRecurringTemplates,
    saveRecurringTemplate,
    deleteRecurringTemplate,
    applyRecurringTemplate,
    
    // 투약 정보 관리
    addMedication,
    updateMedication,
    deleteMedication,
    toggleMedicationAdministered,
    
    // 특별 일정 관리
    addSpecialScheduleItem,
    updateSpecialScheduleItem,
    deleteSpecialScheduleItem,

    // 식사 계획 관리 (기존)
    updateMealPlan,
    
    // 새로운 날짜 기반 식사 계획 관리
    loadCurrentWeekMealPlans,
    updateDateBasedMealPlan,
    checkAndMigrateMealPlan,
    
    // 다대다 관계 관리
    createMultiConnection,
    updateMultiConnection,
    
    // 돌봄 선생님 할당 관리
    createCareProviderAssignment,
    updateCareProviderAssignment,
    deleteCareProviderAssignment,
    
    // 스케줄 패턴 관리
    loadSchedulePatterns,
    createSchedulePattern,
    updateSchedulePattern,
    deleteSchedulePattern,
    
    // 일일 인수인계 메모 관리
    createDailyHandoverNote,
    updateDailyHandoverNote,
    deleteDailyHandoverNote,
    searchHandoverNotesByDay,
    getTodayHandoverNotes,
  };
};

export default useData;
