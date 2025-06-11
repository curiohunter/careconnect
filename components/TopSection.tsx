import React from 'react';
import { ChildWeeklySchedules, DayOfWeek, Activity, ChildInfo, UserType, DailyActivities } from '../types';
import { WeeklyScheduleTable } from './WeeklyScheduleTable';

interface TopSectionProps {
  childWeeklySchedules: ChildWeeklySchedules;
  activeChildId: string | null;
  childrenInfo: ChildInfo[];
  onActiveChildChange: (childId: string) => void;
  isEditing: boolean;
  onUpdateChildSchedule: (childId: string, day: DayOfWeek, type: keyof DailyActivities, activities: Activity[]) => void;
  userType: UserType;
}

export const TopSection: React.FC<TopSectionProps> = ({ 
  childWeeklySchedules, 
  activeChildId,
  childrenInfo,
  onActiveChildChange,
  isEditing, 
  onUpdateChildSchedule,
  userType
}) => {
  const currentSchedule = activeChildId ? childWeeklySchedules[activeChildId] : null;

  if (childrenInfo.length > 0 && !activeChildId) {
    // Should not happen if activeChildId is managed correctly in Dashboard
    return <p>아이를 선택해주세요.</p>;
  }
  
  if (!currentSchedule && childrenInfo.length > 0) {
    return <p>선택된 아이의 일정을 불러올 수 없습니다. 새로운 일정을 생성해주세요.</p>;
  }
  
  const handleUpdate = (day: DayOfWeek, type: keyof DailyActivities, activities: Activity[]) => {
    if (activeChildId && userType === UserType.PARENT) {
      onUpdateChildSchedule(activeChildId, day, type, activities);
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

      {currentSchedule ? (
        <WeeklyScheduleTable 
          schedule={currentSchedule} 
          isEditing={isEditing && userType === UserType.PARENT} // Editing only for parents
          onUpdateSchedule={handleUpdate}
          userType={userType}
        />
      ) : childrenInfo.length > 0 ? (
         <p className="text-gray-500">선택된 아이의 일정이 없습니다.</p>
      ) : (
        <p className="text-gray-500">등록된 아이가 없습니다. 먼저 아이를 등록해주세요.</p>
      )
    }
    </section>
  );
};