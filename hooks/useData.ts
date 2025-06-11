import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { useAuth } from './useAuth';
import {
  ChildInfo,
  ChildWeeklySchedules,
  DailyMealPlan,
  Medication,
  SpecialScheduleItem,
  WorkSchedule,
  DayOfWeek,
  Activity,
  DailyActivities
} from '../types';
import toast from 'react-hot-toast';

export const useData = () => {
  const { connection, userProfile, user } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<ChildWeeklySchedules>({});
  const [mealPlan, setMealPlan] = useState<DailyMealPlan>({} as DailyMealPlan);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [specialScheduleItems, setSpecialScheduleItems] = useState<SpecialScheduleItem[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const connectionId = connection?.id;

  // 데이터 초기 로드
  useEffect(() => {
    if (!connectionId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // 모든 데이터 병렬로 로드
        const [
          childrenData,
          schedulesData,
          mealPlanData,
          medicationsData,
          specialItemsData
        ] = await Promise.all([
          DataService.getChildren(connectionId),
          DataService.getWeeklySchedules(connectionId),
          DataService.getMealPlan(connectionId),
          DataService.getMedications(connectionId),
          DataService.getSpecialScheduleItems(connectionId)
        ]);

        setChildren(childrenData);
        setWeeklySchedules(schedulesData);
        setMealPlan(mealPlanData || {} as DailyMealPlan);
        setMedications(medicationsData);
        setSpecialScheduleItems(specialItemsData);

        // 개별 사용자 근무 일정 로드
        if (user?.uid) {
          const workScheduleData = await DataService.getWorkSchedule(user.uid);
          setWorkSchedule(workScheduleData);
        }

      } catch (error) {
        console.error('데이터 로드 오류:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [connectionId, user?.uid]);

  // 실시간 데이터 구독
  useEffect(() => {
    if (!connectionId) return;

    const unsubscribes: (() => void)[] = [];

    // 주간 일정 실시간 구독
    const unsubscribeSchedules = DataService.onWeeklySchedulesChange(connectionId, (schedules) => {
      setWeeklySchedules(schedules);
    });
    unsubscribes.push(unsubscribeSchedules);

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

  // 주간 일정 업데이트
  const updateChildWeeklySchedule = useCallback(async (
    childId: string,
    day: DayOfWeek,
    activityType: keyof DailyActivities,
    newActivities: Activity[]
  ) => {
    if (!connectionId) return;

    try {
      const currentSchedule = weeklySchedules[childId] || {};
      const daySchedule = currentSchedule[day] || { childcareActivities: [], afterSchoolActivities: [] };
      
      const updatedSchedules = {
        ...weeklySchedules,
        [childId]: {
          ...currentSchedule,
          [day]: {
            ...daySchedule,
            [activityType]: newActivities
          }
        }
      };

      await DataService.saveWeeklySchedules(connectionId, updatedSchedules);
      // 실시간 구독으로 상태는 자동 업데이트됨
    } catch (error) {
      console.error('주간 일정 업데이트 오류:', error);
      toast.error('일정 업데이트에 실패했습니다.');
      throw error;
    }
  }, [connectionId, weeklySchedules]);

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

  const markNoticeAsRead = useCallback(async (itemId: string) => {
    try {
      await DataService.updateSpecialScheduleItem(itemId, { isRead: true });
      toast.success('읽음으로 표시되었습니다.');
    } catch (error) {
      console.error('읽음 상태 변경 오류:', error);
      toast.error('상태 변경에 실패했습니다.');
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

  return {
    // 상태
    children,
    weeklySchedules,
    mealPlan,
    medications,
    specialScheduleItems,
    workSchedule,
    loading,
    
    // 아이 정보 관리
    saveChildren,
    
    // 일정 관리
    updateChildWeeklySchedule,
    updateMealPlan,
    updateWorkSchedule,
    
    // 투약 정보 관리
    addMedication,
    updateMedication,
    deleteMedication,
    toggleMedicationAdministered,
    
    // 특별 일정 관리
    addSpecialScheduleItem,
    updateSpecialScheduleItem,
    markNoticeAsRead
  };
};

export default useData;
