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
  UserType,
  // 새로운 날짜별 타입들
  DailySchedule,
  ChildDateSchedules,
  DailyMealPlanNew,
  DateRangeMealPlan,
  // 다대다 관계 타입 시스템
  MultiConnection,
  CareProviderAssignment,
  SchedulePattern,
  DailyHandoverNote
} from '../types';
import toast from 'react-hot-toast';
import { logger } from '../errorMonitor';

export const useData = () => {
  const { connection, connections, userProfile, user } = useAuth();
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
  const [careProviderAssignments] = useState<CareProviderAssignment[]>([]);
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
        logger.info('🔍 useData 아이 정보 로드:', {
          connectionId,
          childrenFromConnection: childrenData.map(c => ({ id: c.id, name: c.name }))
        });
        
        // 특별 일정 로드 함수 (부모는 모든 연결 통합)
        const loadSpecialItemsForUser = async () => {
          if (userProfile?.userType === UserType.PARENT && connections && connections.length > 1) {
            // 부모이고 여러 연결이 있는 경우: 모든 연결의 specialScheduleItems 통합
            const allItems: SpecialScheduleItem[] = [];
            
            for (const conn of connections) {
              try {
                const parentId = conn.parentId;
                if (!parentId) continue;
                const items = userProfile && user?.uid 
                  ? await DataService.getSpecialScheduleItemsWithFilterByParentId(parentId, userProfile.userType, user.uid)
                  : await DataService.getSpecialScheduleItemsByParentId(parentId);
                allItems.push(...items);
              } catch (error) {
                logger.error(error as Error, 'useData', `loadSpecialItems-${conn.id}`);
              }
            }
            
            // 중복 제거 (id 기준)
            const uniqueItems = allItems.filter((item, index, arr) => 
              arr.findIndex(i => i.id === item.id) === index
            );
            
            return uniqueItems;
          } else {
            // 단일 연결이거나 돌봄선생님인 경우: 기존 로직
            const parentId = connection.parentId;
            if (!parentId) return [];
            return userProfile && user?.uid 
              ? await DataService.getSpecialScheduleItemsWithFilterByParentId(parentId, userProfile.userType, user.uid)
              : await DataService.getSpecialScheduleItemsByParentId(parentId);
          }
        };
        
        // 나머지 데이터 병렬로 로드
        const [
          mealPlanData,
          medicationsData,
          specialItemsData
        ] = await Promise.all([
          Promise.resolve({} as DailyMealPlan), // Deprecated: getMealPlan will be replaced by date-based meal plans
          connection.parentId ? DataService.getMedicationsByParentId(connection.parentId) : Promise.resolve([]),
          // 특별 일정 로드 (부모인 경우 모든 연결 통합)
          loadSpecialItemsForUser()
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
        
        // 새로운 날짜별 스케줄 초기 로드 (parentId 기반 우선 시도)
        logger.info('📅 새로운 날짜별 스케줄 초기 로드 시작');
        if (childrenData.length > 0) {
          const weekRange = DataService.getCurrentWeekRange();
          const schedules: ChildDateSchedules = {};
          const parentId = connection.parentId;
          
          // 모든 아이들의 현재 주 스케줄을 병렬로 로드
          await Promise.all(
            childrenData.map(async (child) => {
              try {
                // parentId 기반 로드 시도 (마이그레이션 후)
                let childSchedules;
                logger.info(`📊 ${child.name} 스케줄 로드 시작 - connectionId: ${connectionId}, parentId: ${parentId}`);
                
                if (parentId && userProfile?.userType === UserType.PARENT) {
                  try {
                    childSchedules = await DataService.getDateRangeSchedulesByParentId(
                      parentId, 
                      child.id, 
                      weekRange
                    );
                    logger.success(`✅ ${child.name} 스케줄 (parentId 기반) 로드 완료:`, Object.keys(childSchedules).length, '날짜');
                  } catch (parentError) {
                    logger.warn(`⚠️ ${child.name} parentId 기반 로드 실패, connectionId로 fallback:`, parentError);
                    // No fallback - parentId is required
                    childSchedules = {};
                    logger.debug(`✅ ${child.name} 스케줄 (connectionId fallback) 로드 완료:`, Object.keys(childSchedules).length, '날짜');
                  }
                } else {
                  // parentId가 없거나 돌봄선생님인 경우 connectionId 기반 사용
                  const parentId = connection.parentId;
                  if (parentId) {
                    childSchedules = await DataService.getDateRangeSchedulesByParentId(
                      parentId, 
                      child.id, 
                      weekRange
                    );
                  } else {
                    childSchedules = {}; // No fallback available
                  }
                  logger.success(`✅ ${child.name} 스케줄 (connectionId 기반) 로드 완료:`, Object.keys(childSchedules).length, '날짜');
                }
                
                logger.debug(`📋 ${child.name} 스케줄 데이터:`, childSchedules);
                
                schedules[child.id] = childSchedules;
              } catch (error) {
                logger.error(error as Error, 'useData', `loadSchedules-${child.name}`);
                schedules[child.id] = {}; // 빈 스케줄로 설정
              }
            })
          );
          
          setCurrentWeekSchedules(schedules);
          logger.success('🎉 모든 아이들의 스케줄 로드 완료');
        }

      } catch (error) {
        logger.error(error as Error, 'useData', 'loadData');
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [connectionId, connection, connections, user?.uid, userProfile?.userType]);

  // 실시간 데이터 구독 (parentId 기반)
  useEffect(() => {
    const parentId = connection?.parentId;
    if (!parentId) return;

    const unsubscribes: (() => void)[] = [];
    logger.info(`🔔 parentId 기반 실시간 구독 시작: ${parentId}`);

    // 식사 계획 실시간 구독 (deprecated - will be replaced by date-based meal plans)
    // const unsubscribeMealPlan = DataService.onMealPlanChange(parentId, (plan) => {
    //   if (plan) setMealPlan(plan);
    // });
    // unsubscribes.push(unsubscribeMealPlan);

    // 투약 정보 실시간 구독
    const unsubscribeMedications = DataService.onMedicationsByParentIdChange(parentId, (meds) => {
      setMedications(meds);
    });
    unsubscribes.push(unsubscribeMedications);

    // 특별 일정 실시간 구독 (parentId 기반)
    const unsubscribeSpecialItems = userProfile && user?.uid
      ? DataService.onSpecialScheduleItemsWithFilterByParentIdChange(parentId, userProfile.userType, user.uid, (items) => {
          setSpecialScheduleItems(items);
        })
      : DataService.onSpecialScheduleItemsByParentIdChange(parentId, (items) => {
          setSpecialScheduleItems(items);
        });
    unsubscribes.push(unsubscribeSpecialItems);

    // 일일 인수인계 메모 구독 (parentId 기반)
    if (DataService.onDailyHandoverNotesChangeByParentId) {
      logger.info(`🔔 parentId 기반 인수인계 메모 실시간 구독: ${parentId}`);
      const unsubscribeDailyHandoverNotes = DataService.onDailyHandoverNotesChangeByParentId(parentId, (notes: DailyHandoverNote[]) => {
        setDailyHandoverNotes(Array.isArray(notes) ? notes : []);
      });
      unsubscribes.push(unsubscribeDailyHandoverNotes);
    }

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
    }

    // 클린업
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [connection?.parentId, user?.uid, userProfile?.userType]);

  // 아이 정보 저장
  const saveChildren = useCallback(async (childrenData: ChildInfo[]) => {
    if (!connectionId) return;

    try {
      await DataService.saveChildren();
      setChildren(childrenData);
      toast.success('아이 정보가 저장되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'saveChildren');
      toast.error('아이 정보 저장에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  // 식사 계획 업데이트 (deprecated)
  const updateMealPlan = useCallback(async () => {
    if (!connectionId) return;

    try {
      await DataService.saveMealPlan();
      // 실시간 구독으로 상태는 자동 업데이트됨
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateMealPlan');
      toast.error('식사 계획 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId]);

  // ===== 새로운 날짜 기반 식사 계획 관리 =====
  
  // 현재 주 식사 계획들 로드 (parentId 기반 우선 시도)
  const loadCurrentWeekMealPlans = useCallback(async () => {
    if (!connectionId || !connection) return;

    try {
      const weekRange = DataService.getCurrentWeekRange();
      const parentId = connection.parentId;
      logger.info('🍽️ loadCurrentWeekMealPlans 시작:', { connectionId, parentId, weekRange });
      
      let mealPlans;
      if (parentId) {
        try {
          mealPlans = await DataService.getDateRangeMealPlansByParentId(parentId, weekRange);
          logger.success('🍽️ 현재 주 식사 계획 (parentId 기뱅) 로딩 완료:', mealPlans);
        } catch (parentError) {
          logger.warn('⚠️ parentId 기반 식사 계획 로드 실패, connectionId로 fallback:', parentError);
          mealPlans = await DataService.getDateRangeMealPlans(connectionId, weekRange);
          logger.success('🍽️ 현재 주 식사 계획 (connectionId 기뱅) 로딩 완룼:', mealPlans);
        }
      } else {
        mealPlans = await DataService.getDateRangeMealPlans(connectionId, weekRange);
        logger.success('🍽️ 현재 주 식사 계획 (connectionId 기뱅) 로딩 완룼:', mealPlans);
      }
      
      setCurrentWeekMealPlans(mealPlans);
    } catch (error) {
      logger.error(error as Error, 'useData', 'loadCurrentWeekMealPlans');
      toast.error('식사 계획을 불러오는데 실패했습니다.');
    }
  }, [connectionId, connection?.parentId]);

  // 특정 날짜의 식사 계획 업데이트 (parentId 기반 우선 시도)
  const updateDateBasedMealPlan = useCallback(async (date: string, mealPlan: DailyMealPlanNew) => {
    if (!connectionId || !connection) return;

    try {
      const parentId = connection.parentId;
      
      if (parentId) {
        try {
          await DataService.saveDateBasedMealPlanByParentId(parentId, date, mealPlan);
          logger.success('✅ 식사 계획 (parentId 기반) 저장 완료');
        } catch (parentError) {
          logger.warn('⚠️ parentId 기반 저장 실패, connectionId로 fallback');
          await DataService.saveDateBasedMealPlan(connectionId, date, mealPlan);
          logger.debug('✅ 식사 계획 (connectionId 기반) 저장 완료');
        }
      } else {
        await DataService.saveDateBasedMealPlan(connectionId, date, mealPlan);
        logger.debug('✅ 식사 계획 (connectionId 기반) 저장 완료');
      }
      
      // 로컬 상태 업데이트
      setCurrentWeekMealPlans(prev => ({
        ...prev,
        [date]: mealPlan
      }));
      
      // toast.success 메시지 제거 - MealPlanEditor에서 한 번만 표시
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateDateBasedMealPlan');
      toast.error('식사 계획 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId, connection]);

  // 자동 마이그레이션 확인 및 실행
  const checkAndMigrateMealPlan = useCallback(async (): Promise<boolean> => {
    if (!connectionId) return false;

    try {
      logger.debug('🔍 식사 계획 마이그레이션 상태 확인 중...');
      
      // 1. 현재 주 날짜 기반 식사 계획 확인
      const weekRange = DataService.getCurrentWeekRange();
      const currentDatePlans = await DataService.getDateRangeMealPlans(connectionId, weekRange);
      const hasDateBasedData = Object.keys(currentDatePlans).length > 0;
      
      // 2. 기존 요일 기반 식사 계획 확인
      const hasWeeklyData = mealPlan && Object.values(mealPlan).some(meal => meal?.menu);
      
      logger.debug('📊 마이그레이션 상태:', { hasDateBasedData, hasWeeklyData });
      
      // 3. 마이그레이션 필요성 판단
      if (hasDateBasedData) {
        logger.debug('✅ 이미 날짜 기반 데이터가 존재함 - 마이그레이션 불필요');
        return true; // 이미 날짜 기반 데이터 존재
      }
      
      if (!hasWeeklyData) {
        logger.debug('ℹ️ 마이그레이션할 요일 기반 데이터가 없음');
        return false; // 마이그레이션할 데이터 없음
      }
      
      // 4. 자동 마이그레이션 실행
      logger.debug('🚀 자동 마이그레이션 시작...');
      
      // 날짜 배열 생성 (generateWeekDates 함수 대신 직접 구현)
      const dates: string[] = [];
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
          logger.debug(`✅ ${dayOfWeek} → ${date} 마이그레이션 완료: ${dayMeal.menu}`);
        }
      });
      
      await Promise.all(migrationPromises);
      
      if (migratedCount > 0) {
        logger.debug(`🎉 마이그레이션 완료: ${migratedCount}개 항목 변환`);
        await loadCurrentWeekMealPlans(); // 새로운 데이터 로드
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error(error as Error, 'useData', 'checkAndMigrateMealPlan');
      toast.error('식사 계획 업그레이드 중 문제가 발생했습니다.');
      return false;
    }
  }, [connectionId, mealPlan, loadCurrentWeekMealPlans]);

  // 투약 정보 관리
  const addMedication = useCallback(async (medication: Omit<Medication, 'id' | 'administered'>) => {
    const parentId = connection?.parentId;
    if (!parentId) {
      toast.error('연결 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      logger.debug(`💊 parentId 기반 투약 정보 추가: ${parentId}`);
      await DataService.addMedicationByParentId(parentId, { ...medication, administered: false });
      toast.success('투약 정보가 추가되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'addMedication');
      toast.error('투약 정보 추가에 실패했습니다.');
      throw error;
    }
  }, [connection?.parentId]);

  const updateMedication = useCallback(async (medicationId: string, updates: Partial<Medication>) => {
    try {
      await DataService.updateMedication(medicationId, updates);
      toast.success('투약 정보가 수정되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateMedication');
      toast.error('투약 정보 수정에 실패했습니다.');
      throw error;
    }
  }, []);

  const deleteMedication = useCallback(async (medicationId: string) => {
    try {
      await DataService.deleteMedication(medicationId);
      toast.success('투약 정보가 삭제되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'deleteMedication');
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
      logger.error(error as Error, 'useData', 'toggleMedicationAdministered');
      toast.error('투약 상태 변경에 실패했습니다.');
      throw error;
    }
  }, [medications]);

  // 특별 일정 관리 (권한 기반)
  const addSpecialScheduleItem = useCallback(async (item: Omit<SpecialScheduleItem, 'id'>) => {
    const parentId = connection?.parentId;
    if (!parentId || !user?.uid) {
      toast.error('연결 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      logger.debug(`📝 parentId 기반 특별 일정 추가: ${parentId}`);
      // 권한 기반 추가 함수 사용
      await DataService.addSpecialScheduleItemWithPermissionByParentId(
        parentId, 
        item,
        user.uid,
        item.targetUserId
      );
      toast.success('요청이 등록되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'addSpecialScheduleItem');
      toast.error('요청 등록에 실패했습니다.');
      throw error;
    }
  }, [connection?.parentId, user?.uid]);

  const updateSpecialScheduleItem = useCallback(async (itemId: string, updates: Partial<SpecialScheduleItem>) => {
    try {
      await DataService.updateSpecialScheduleItem(itemId, updates);
      toast.success('요청이 수정되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateSpecialScheduleItem');
      toast.error('요청 수정에 실패했습니다.');
      throw error;
    }
  }, []);

  const deleteSpecialScheduleItem = useCallback(async (itemId: string) => {
    try {
      await DataService.deleteSpecialScheduleItem(itemId);
      toast.success('요청이 삭제되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'deleteSpecialScheduleItem');
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
      logger.error(error as Error, 'useData', 'updateWorkSchedule');
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
      logger.debug('📅 loadCurrentWeekSchedules 시작:', { connectionId, children: connection.children.length, weekRange });
      const schedules: ChildDateSchedules = {};
      
      // 모든 아이들의 현재 주 스케줄을 병렬로 로드
      await Promise.all(
        connection.children.map(async (child) => {
          logger.debug(`👶 ${child.name} (${child.id}) 스케줄 로딩 시작`);
          // parentId 기반 우선 시도, connectionId fallback
          let childSchedules = {};
          const parentId = connection.parentId;
          if (parentId) {
            try {
              childSchedules = await DataService.getDateRangeSchedules(
                parentId,
                child.id,
                weekRange
              );
              logger.debug(`👶 ${child.name} parentId 기반 스케줄 로드 완룼:`, Object.keys(childSchedules).length, '날짜');
            } catch (error) {
              logger.debug(`👶 ${child.name} parentId 기반 로드 실패, connectionId로 fallback`);
              childSchedules = await DataService.getDateRangeSchedules(
                connectionId, 
                child.id, 
                weekRange
              );
            }
          } else {
            childSchedules = await DataService.getDateRangeSchedules(
              connectionId, 
              child.id, 
              weekRange
            );
          }
          logger.debug(`👶 ${child.name} (${child.id}) 스케줄 로딩 완룼:`, childSchedules);
          schedules[child.id] = childSchedules;
        })
      );
      
      logger.debug('📅 전체 스케줄 로딩 완료:', schedules);
      setCurrentWeekSchedules(schedules);
    } catch (error) {
      logger.error(error as Error, 'useData', 'loadCurrentWeekSchedules');
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

      // parentId 기반 저장 시도 (부모인 경우)
      const parentId = connection?.parentId;
      if (parentId && userProfile?.userType === UserType.PARENT) {
        logger.debug(`💾 parentId 기반 스케줄 저장: ${parentId}/${childId}/${date}`);
        await DataService.saveDailyScheduleByParentId(parentId, childId, updatedSchedule);
      } else {
        logger.debug(`💾 connectionId 기반 스케줄 저장: ${connectionId}/${childId}/${date}`);
        await DataService.saveDailySchedule(connectionId, childId, updatedSchedule);
      }
      
      // 로컬 상태 업데이트
      setCurrentWeekSchedules(prev => ({
        ...prev,
        [childId]: {
          ...prev[childId],
          [date]: updatedSchedule
        }
      }));
      
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateDailySchedule');
      toast.error('스케줄 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId, connection?.parentId, userProfile?.userType, currentWeekSchedules]);

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
      logger.error(error as Error, 'useData', 'updateMultipleDays');
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
        logger.debug(`✅ ${childId} 마이그레이션 완료`);
      }
      
    } catch (error) {
      logger.error(error as Error, 'useData', 'migrateWeeklyToDaily');
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

  // 현재 주 날짜별 스케줄 실시간 구독 (parentId 기반 우선 시도)
  useEffect(() => {
    if (!connectionId || !connection?.children) return;

    const unsubscribes: (() => void)[] = [];
    const weekRange = DataService.getCurrentWeekRange();
    const parentId = connection.parentId;

    // 각 아이별로 현재 주 스케줄 구독
    connection.children.forEach((child) => {
      if (parentId) {
        // parentId 기반 구독 시도
        try {
          const unsubscribe = DataService.onDateRangeSchedulesChangeByParentId?.(
            parentId,
            child.id,
            weekRange,
            (schedules) => {
              setCurrentWeekSchedules(prev => ({
                ...prev,
                [child.id]: schedules
              }));
            }
          );
          if (unsubscribe) {
            unsubscribes.push(unsubscribe);
            return;
          }
        } catch (error) {
          logger.debug('⚠️ parentId 기반 실시간 구독 실패, connectionId로 fallback');
        }
      }
      
      // connectionId 기반 구독 (fallback)
      const unsubscribe = DataService.onDateRangeSchedulesChange(
        parentId || connectionId,
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
  }, [connectionId, connection?.children, connection?.parentId]);

  // 현재 주 날짜별 식사 계획 실시간 구독 (parentId 기반 우선 시도)
  useEffect(() => {
    if (!connectionId || !connection) return;

    const weekRange = DataService.getCurrentWeekRange();
    const parentId = connection.parentId;
    let unsubscribe: (() => void) | undefined;

    if (parentId) {
      // parentId 기반 구독 시도
      try {
        unsubscribe = DataService.onDateBasedMealPlansChangeByParentId?.(
          parentId,
          weekRange,
          (mealPlans: DateRangeMealPlan) => {
            setCurrentWeekMealPlans(mealPlans);
          }
        );
        if (unsubscribe) {
          return () => unsubscribe?.();
        }
      } catch (error: unknown) {
        logger.debug('⚠️ parentId 기반 식사 계획 실시간 구독 실패, connectionId로 fallback', error);
      }
    }
    
    // connectionId 기반 구독 (fallback)
    unsubscribe = DataService.onDateBasedMealPlansChange?.(
      parentId || connectionId,
      weekRange,
      (mealPlans: DateRangeMealPlan) => {
        setCurrentWeekMealPlans(mealPlans);
      }
    );

    return () => unsubscribe?.();
  }, [connectionId, connection?.parentId]);

  // ===== 반복 일정 템플릿 관리 함수들 =====
  
  // 특정 아이의 반복 일정 템플릿 로드
  const loadRecurringTemplates = useCallback(async (childId: string) => {
    const parentId = connection?.parentId;
    if (!parentId) return;

    try {
      logger.debug(`🔄 parentId 기반 반복 템플릿 로드: ${parentId}/${childId}`);
      const templates = await DataService.getRecurringTemplatesByParentId(parentId, childId);
      setRecurringTemplates(prev => ({
        ...prev,
        [childId]: templates
      }));
    } catch (error) {
      const errorObj = error as Error;
      logger.error(errorObj, 'useData', `loadRecurringTemplates-${childId}`);
      // 오류가 발생해도 빈 배열로 설정하여 앱이 지속되도록 함
      setRecurringTemplates(prev => ({
        ...prev,
        [childId]: []
      }));
      // 사용자에게 인덱스 준비 메시지 표시
      if (errorObj.message && errorObj.message.includes('index')) {
        logger.debug('템플릿 인덱스가 아직 준비 중입니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error('템플릿을 불러오는데 실패했습니다.');
      }
    }
  }, [connection?.parentId]);

  // 반복 일정 템플릿 저장
  const saveRecurringTemplate = useCallback(async (template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const parentId = connection?.parentId;
    if (!parentId) {
      toast.error('연결 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      logger.debug(`💾 parentId 기반 반복 템플릿 저장: ${parentId}`);
      await DataService.saveRecurringTemplateByParentId(parentId, template);
      // 해당 아이의 템플릿 목록 다시 로드
      await loadRecurringTemplates(template.childId);
      toast.success('템플릿이 저장되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'saveRecurringTemplate');
      toast.error('템플릿 저장에 실패했습니다.');
      throw error;
    }
  }, [connection?.parentId, loadRecurringTemplates]);

  // 반복 일정 템플릿 삭제
  const deleteRecurringTemplate = useCallback(async (templateId: string, childId: string) => {
    try {
      await DataService.deleteRecurringTemplate(templateId);
      // 해당 아이의 템플릿 목록 다시 로드
      await loadRecurringTemplates(childId);
      toast.success('템플릿이 삭제되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'deleteRecurringTemplate');
      toast.error('템플릿 삭제에 실패했습니다.');
      throw error;
    }
  }, [loadRecurringTemplates]);

  // 반복 일정 템플릿 수정
  const updateRecurringTemplate = useCallback(async (templateId: string, template: Omit<RecurringActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await DataService.updateRecurringTemplate(templateId, template);
      // 해당 아이의 템플릿 목록 다시 로드
      await loadRecurringTemplates(template.childId);
      toast.success('템플릿이 수정되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateRecurringTemplate');
      toast.error('템플릿 수정에 실패했습니다.');
      throw error;
    }
  }, [loadRecurringTemplates]);

  // 반복 일정 템플릿 적용
  const applyRecurringTemplate = useCallback(async (templateId: string, childId: string, isWeeklyRecurring?: boolean) => {
    if (!connectionId) return;

    try {
      const template = recurringTemplates[childId]?.find(t => t.id === templateId);
      if (!template) {
        toast.error('템플릿을 찾을 수 없습니다.');
        return;
      }

      // 매주 반복 설정이 변경된 경우 템플릿 업데이트
      if (isWeeklyRecurring !== undefined && template.isWeeklyRecurring !== isWeeklyRecurring) {
        await DataService.updateRecurringTemplate(templateId, { isWeeklyRecurring });
        // 로컬 상태도 업데이트
        setRecurringTemplates(prev => ({
          ...prev,
          [childId]: prev[childId]?.map(t => 
            t.id === templateId ? { ...t, isWeeklyRecurring } : t
          ) || []
        }));
      }

      // parentId 기반 템플릿 적용 시도 (부모인 경우)
      const parentId = connection?.parentId;
      if (parentId && userProfile?.userType === UserType.PARENT) {
        logger.debug(`🔄 parentId 기반 템플릿 적용: ${parentId}/${childId}`);
        await DataService.applyRecurringTemplateByParentId(parentId, childId, { ...template, isWeeklyRecurring });
      } else {
        logger.debug(`🔄 connectionId 기반 템플릿 적용: ${connectionId}/${childId}`);
        await DataService.applyRecurringTemplate(connectionId, childId, { ...template, isWeeklyRecurring });
      }
      // 현재 주 스케줄 다시 로드
      await loadCurrentWeekSchedules();
      toast.success(`템플릿이 적용되었습니다.${isWeeklyRecurring ? ' (매주 자동 적용 설정됨)' : ''}`);
    } catch (error) {
      logger.error(error as Error, 'useData', 'applyRecurringTemplate');
      toast.error('템플릿 적용에 실패했습니다.');
      throw error;
    }
  }, [connectionId, connection?.parentId, userProfile?.userType, recurringTemplates, loadCurrentWeekSchedules]);

  // 매주 반복 템플릿 자동 적용 체크
  useEffect(() => {
    if (!connectionId || !connection?.children) return;

    const checkWeeklyRecurringTemplates = async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=일요일, 6=토요일
      const hour = now.getHours();

      // 주말(토요일 밤 9시 이후 또는 일요일)에만 실행
      const isWeekendAutoApplyTime = 
        (dayOfWeek === 6 && hour >= 21) || // 토요일 밤 9시 이후
        dayOfWeek === 0; // 일요일

      if (!isWeekendAutoApplyTime) return;

      logger.debug('🔄 매주 반복 템플릿 자동 적용 체크 시작');

      try {
        for (const child of connection.children) {
          const templates = recurringTemplates[child.id] || [];
          const weeklyTemplates = templates.filter(t => t.isWeeklyRecurring && t.isActive);

          if (weeklyTemplates.length > 0) {
            logger.debug(`📅 ${child.name}의 매주 반복 템플릿 ${weeklyTemplates.length}개 발견`);
            
            for (const template of weeklyTemplates) {
              try {
                // 다음주에 이미 해당 템플릿이 적용되었는지 확인
                const nextWeekRange = DataService.getNextWeekRange();
                const existingSchedules = await DataService.getDateRangeSchedules(
                  connectionId, 
                  child.id, 
                  nextWeekRange
                );

                // 템플릿의 요일에 해당하는 날짜에 이미 일정이 있는지 확인
                const hasExistingSchedule = template.daysOfWeek.some(dayOfWeek => {
                  const dateString = DataService.getDateStringForDayOfWeek(nextWeekRange.weekStart, dayOfWeek);
                  const daySchedule = existingSchedules[dateString];
                  return daySchedule?.childcareActivities?.some((activity: Activity) => 
                    activity.description === template.name
                  ) || daySchedule?.afterSchoolActivities?.some((activity: Activity) => 
                    activity.description === template.name
                  );
                });

                if (!hasExistingSchedule) {
                  logger.debug(`🔄 ${child.name}의 "${template.name}" 템플릿을 다음주에 자동 적용`);
                  await DataService.applyRecurringTemplateToWeek(connectionId, child.id, template, nextWeekRange);
                } else {
                  logger.debug(`⏭️ ${child.name}의 "${template.name}" 템플릿은 이미 다음주에 적용됨`);
                }
              } catch (error) {
                logger.error(error as Error, 'useData', `weeklyRecurringTemplate-${child.name}-${template.name}`);
              }
            }
          }
        }
      } catch (error) {
        logger.error(error as Error, 'useData', 'weeklyRecurringTemplatesCheck');
      }
    };

    // 초기 체크
    checkWeeklyRecurringTemplates();

    // 1시간마다 체크 (주말에만 실행되므로 부하 최소화)
    const interval = setInterval(checkWeeklyRecurringTemplates, 60 * 60 * 1000); // 1시간

    return () => clearInterval(interval);
  }, [connectionId, connection?.children, recurringTemplates]);

  // ===== 데이터 정리 함수들 =====
  
  // 중복 활동 정리
  const cleanupDuplicateActivities = useCallback(async (childId: string, date: string) => {
    if (!connectionId) return;
    
    try {
      await DataService.cleanupDuplicateActivities(connectionId, childId, date);
      // 정리 후 데이터 다시 로드
      if (loadCurrentWeekSchedules) {
        await loadCurrentWeekSchedules();
      }
      toast.success('중복 데이터가 정리되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'cleanupDuplicateActivities');
      toast.error('중복 데이터 정리에 실패했습니다.');
    }
  }, [connectionId, loadCurrentWeekSchedules]);

  // ===== 다대다 관계 타입 시스템 함수들 =====
  
  // 다대다 연결 관리
  const createMultiConnection = useCallback(async (connection: Omit<MultiConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await DataService.createMultiConnection(connection);
      toast.success('다대다 연결이 생성되었습니다.');
      return id;
    } catch (error) {
      logger.error(error as Error, 'useData', 'createMultiConnection');
      toast.error('다대다 연결 생성에 실패했습니다.');
      throw error;
    }
  }, []);

  const updateMultiConnection = useCallback(async (connectionId: string, updates: Partial<MultiConnection>) => {
    try {
      await DataService.updateMultiConnection(connectionId, updates);
      toast.success('다대다 연결이 업데이트되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateMultiConnection');
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
      logger.error(error as Error, 'useData', 'createCareProviderAssignment');
      toast.error('돌봄 선생님 할당에 실패했습니다.');
      throw error;
    }
  }, []);

  const updateCareProviderAssignment = useCallback(async (assignmentId: string, updates: Partial<CareProviderAssignment>) => {
    try {
      await DataService.updateCareProviderAssignment(assignmentId, updates);
      toast.success('돌봄 선생님 할당이 업데이트되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateCareProviderAssignment');
      toast.error('돌봄 선생님 할당 업데이트에 실패했습니다.');
      throw error;
    }
  }, []);

  const deleteCareProviderAssignment = useCallback(async (assignmentId: string) => {
    try {
      await DataService.deleteCareProviderAssignment(assignmentId);
      toast.success('돌봄 선생님 할당이 삭제되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'deleteCareProviderAssignment');
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
      logger.error(error as Error, 'useData', 'loadSchedulePatterns');
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
      logger.error(error as Error, 'useData', 'createSchedulePattern');
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
      logger.error(error as Error, 'useData', 'updateSchedulePattern');
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
      logger.error(error as Error, 'useData', 'deleteSchedulePattern');
      toast.error('스케줄 패턴 삭제에 실패했습니다.');
      throw error;
    }
  }, [loadSchedulePatterns]);

  // 일일 인수인계 메모 관리
  const createDailyHandoverNote = useCallback(async (noteData: Omit<DailyHandoverNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const parentId = connection?.parentId;
    if (!parentId) {
      toast.error('연결 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      logger.debug(`💾 parentId 기반 인수인계 메모 생성: ${parentId}`);
      const note = { ...noteData, createdAt: new Date() };
      const id = await DataService.saveDailyHandoverNoteByParentId(parentId, note);
      toast.success('인수인계 메모가 생성되었습니다.');
      return id;
    } catch (error) {
      logger.error(error as Error, 'useData', 'createDailyHandoverNote');
      toast.error('인수인계 메모 생성에 실패했습니다.');
      throw error;
    }
  }, [connection?.parentId]);

  const updateDailyHandoverNote = useCallback(async (noteId: string, updates: Partial<DailyHandoverNote>) => {
    const parentId = connection?.parentId;
    if (!parentId) {
      toast.error('연결 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      logger.debug(`✏️ parentId 기반 인수인계 메모 수정: ${parentId}/${noteId}`);
      await DataService.updateDailyHandoverNoteByParentId(parentId, noteId, updates);
      toast.success('인수인계 메모가 수정되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'updateDailyHandoverNote');
      toast.error('인수인계 메모 수정에 실패했습니다.');
      throw error;
    }
  }, [connection?.parentId]);

  const deleteDailyHandoverNote = useCallback(async (noteId: string) => {
    const parentId = connection?.parentId;
    if (!parentId) {
      toast.error('연결 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      logger.debug(`🗑️ parentId 기반 인수인계 메모 삭제: ${parentId}/${noteId}`);
      await DataService.deleteDailyHandoverNoteByParentId(parentId, noteId);
      toast.success('인수인계 메모가 삭제되었습니다.');
    } catch (error) {
      logger.error(error as Error, 'useData', 'deleteDailyHandoverNote');
      toast.error('인수인계 메모 삭제에 실패했습니다.');
      throw error;
    }
  }, [connection?.parentId]);

  const searchHandoverNotesByDay = useCallback(async (dayOfWeek: DayOfWeek): Promise<DailyHandoverNote[]> => {
    const parentId = connection?.parentId;
    if (!parentId) return [];
    
    try {
      logger.debug(`🔍 parentId 기반 인수인계 메모 조회: ${parentId}`);
      const allNotes = await DataService.getDailyHandoverNotesByParentId(parentId);
      // 요일별 필터링은 클라이언트에서 처리
      return (allNotes || []).filter(note => note.dayOfWeek === dayOfWeek);
    } catch (error) {
      logger.error(error as Error, 'useData', 'searchHandoverNotesByDay');
      toast.error('요일별 인수인계 메모 검색에 실패했습니다.');
      return [];
    }
  }, [connection?.parentId]);

  const getTodayHandoverNotes = useCallback(async (): Promise<DailyHandoverNote[]> => {
    const parentId = connection?.parentId;
    if (!parentId) return [];
    
    try {
      const today = new Date().toISOString().split('T')[0];
      logger.debug(`📅 parentId 기반 당일 인수인계 메모 조회: ${parentId} (${today})`);
      const allNotes = await DataService.getDailyHandoverNotesByParentId(parentId);
      // 날짜별 필터링은 클라이언트에서 처리
      return (allNotes || []).filter(note => note.date === today);
    } catch (error) {
      logger.error(error as Error, 'useData', 'getTodayHandoverNotes');
      toast.error('당일 인수인계 메모 조회에 실패했습니다.');
      return [];
    }
  }, [connection?.parentId]);

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
    updateRecurringTemplate,
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
    
    // 데이터 정리
    cleanupDuplicateActivities,
  };
};

export default useData;
