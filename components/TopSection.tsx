import React from 'react';
import { 
  Activity, 
  ChildInfo, 
  UserType, 
  DailyActivities, 
  // 새로운 날짜별 타입들
  DateRangeSchedules
} from '../types';
import { WeeklyScheduleTable } from './WeeklyScheduleTable';
import { useData } from '../hooks/useData';
import { logger } from '../errorMonitor';

interface TopSectionProps {
  activeChildId: string | null;
  childrenInfo: ChildInfo[];
  onActiveChildChange: (childId: string) => void;
  isEditing: boolean;
  userType: UserType;
  useNewDateBasedSchedule?: boolean;
}

export const TopSection: React.FC<TopSectionProps> = ({
  activeChildId,
  childrenInfo,
  onActiveChildChange,
  isEditing,
  userType,
  useNewDateBasedSchedule = true
}) => {
  const { currentWeekSchedules, updateDailySchedule } = useData();

  let currentWeekData: DateRangeSchedules | undefined;
  if (useNewDateBasedSchedule && activeChildId) {
    currentWeekData = currentWeekSchedules[activeChildId];
    logger.debug('🔍 TopSection 데이터 매핑:', {
      activeChildId,
      currentWeekSchedulesKeys: Object.keys(currentWeekSchedules),
      currentWeekData: currentWeekData ? Object.keys(currentWeekData) : 'undefined'
    });
  }

  if (childrenInfo.length > 0 && !activeChildId) {
    return <p>아이를 선택해주세요.</p>;
  }

  // 날짜별 업데이트 핸들러만 남김
  const handleDailyUpdate = (date: string, activityType: keyof DailyActivities, activities: Activity[]) => {
    if (activeChildId && userType === UserType.PARENT && updateDailySchedule) {
      updateDailySchedule(activeChildId, date, activityType, activities);
    }
  };

  return (
    <section aria-labelledby="weekly-schedule-heading">
      
      {childrenInfo.length > 1 && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            {childrenInfo.map((child) => (
              <button
                key={child.id}
                onClick={() => onActiveChildChange(child.id)}
                className={`${
                  child.id === activeChildId
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm focus:outline-none`}
                aria-current={child.id === activeChildId ? 'page' : undefined}
              >
                {child.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {(useNewDateBasedSchedule && activeChildId) ? (
        <WeeklyScheduleTable
          isEditing={isEditing && userType === UserType.PARENT}
          userType={userType}
          childForSchedule={activeChildId ? childrenInfo.find(child => child.id === activeChildId) : null}
          useNewDateBasedSchedule={useNewDateBasedSchedule}
          currentWeekSchedules={currentWeekData}
          onUpdateDailySchedule={handleDailyUpdate}
        />
      ) : childrenInfo.length > 0 ? (
        <p className="text-gray-500">선택된 아이의 일정이 없습니다.</p>
      ) : (
        <p className="text-gray-500">등록된 아이가 없습니다. 먼저 아이를 등록해주세요.</p>
      )}
    </section>
  );
};