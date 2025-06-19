import React, { useState, useEffect } from 'react';
import { 
  DayOfWeek, 
  Activity, 
  DailyActivities, 
  UserType, 
  ChildInfo,
  // 새로운 날짜별 타입들
  DailySchedule,
  DateRangeSchedules
} from '../types';
import { DAYS_OF_WEEK, generateHourOptions, generateMinuteOptions } from '../constants';
// 요일과 날짜 표시 함수
const formatDayWithDate = (dayName: string, date: Date): string => {
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  return `${dayName} ${month}/${dayOfMonth}`;
};

// 로컬 주간 날짜 계산 함수
const getWeekDates = (): Date[] => {
  const today = new Date();
  const currentDay = today.getDay(); // 0: 일, 1: 월, ...
  const monday = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(today.getDate() + daysToMonday);
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date);
  }
  return weekDates;
};

// 날짜 포맷팅 함수 (YYYY-MM-DD) - 로컬 시간 기준
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useData } from '../hooks/useData';
import { DataService } from '../services/dataService';
import { logger } from '../errorMonitor';

// 시간 옵션 생성 (짧은 버전 - 0~23시)
const generateShortHourOptions = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(i.toString().padStart(2, '0'));
  }
  return hours;
};

// 분 옵션 생성 (5분 단위 - 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
const generateFiveMinuteOptions = () => {
  const minutes = [];
  for (let i = 0; i < 60; i += 5) {
    minutes.push(i.toString().padStart(2, '0'));
  }
  return minutes;
};

const SHORT_HOUR_OPTIONS = generateShortHourOptions();
const FIVE_MINUTE_OPTIONS = generateFiveMinuteOptions();




interface TimeSelectorProps {
  time?: string; // Format "HH:MM"
  onChange: (newTime: string) => void;
  disabled: boolean;
  prefix: string; // e.g., "start" or "end"
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ time, onChange, disabled, prefix }) => {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  useEffect(() => {
    if (time) {
      const [h, m] = time.split(':');
      setHour(h || '');
      setMinute(m || '');
    } else {
      setHour('');
      setMinute('');
    }
  }, [time]);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setHour(newHour);
    onChange(newHour && minute ? `${newHour}:${minute}` : '');
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setMinute(newMinute);
    onChange(hour && newMinute ? `${hour}:${newMinute}` : '');
  };
  
  const selectBaseClasses = "p-1 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:ring-primary focus:border-primary";

  return (
    <div className="flex items-center space-x-1">
      <select
        value={hour}
        onChange={handleHourChange}
        className={`${selectBaseClasses} w-16`}
        disabled={disabled}
        aria-label={`${prefix} 시간`}
      >
        <option value="">시</option>
        {SHORT_HOUR_OPTIONS.map(h => <option key={`${prefix}-h-${h}`} value={h}>{h}</option>)}
      </select>
      <span className="text-sm text-gray-500">:</span>
      <select
        value={minute}
        onChange={handleMinuteChange}
        className={`${selectBaseClasses} w-16`}
        disabled={disabled}
        aria-label={`${prefix} 분`}
      >
        <option value="">분</option>
        {FIVE_MINUTE_OPTIONS.map(m => <option key={`${prefix}-m-${m}`} value={m}>{m}</option>)}
      </select>
    </div>
  );
};

interface ActivityItemProps {
  activity: Activity;
  onActivityChange: (id: string, field: keyof Activity, value: string) => void;
  onRemoveActivity?: (id: string) => void;
  isEditing: boolean;
  isCareProvider: boolean;
  childInstitutionName?: string; 
  isChildCareActivity?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ 
    activity, 
    onActivityChange, 
    onRemoveActivity, 
    isEditing, 
    isCareProvider,
    childInstitutionName,
    isChildCareActivity
}) => {
  const inputBaseClasses = "flex-grow p-1 border border-gray-300 rounded-md text-sm resize-none h-16 bg-white text-gray-900 placeholder-gray-500 focus:ring-primary focus:border-primary";
  
  // 편집 모드에서는 실제 description 값만 사용 (자동 완성 방지)
  const activityDescription = activity.description || '';
  const placeholderText = isChildCareActivity ? 
    (activity.institutionName || childInstitutionName || "기관명 또는 활동 내용") : 
    "학원명 또는 활동 내용";

  // 한글 입력을 위한 로컬 상태 (MealPlanEditor 방식과 동일)
  const [localValue, setLocalValue] = useState(activityDescription);
  
  // activityDescription이 변경될 때 로컬 상태 동기화
  useEffect(() => {
    setLocalValue(activityDescription);
  }, [activityDescription]);

  // 입력값 변경 핸들러 (로컬 상태만 업데이트)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  // onBlur에서만 실제 저장 (MealPlanEditor와 동일한 방식)
  const handleBlur = () => {
    onActivityChange(activity.id, 'description', localValue);
  };

  if (isEditing && !isCareProvider) {
    return (
      <div className="flex flex-col space-y-2 mb-2 p-2 border rounded-md bg-gray-50">
        <div className="flex items-center space-x-2">
            <span className="text-xs w-12">시작:</span>
            <TimeSelector
                time={activity.startTime}
                onChange={(newTime) => onActivityChange(activity.id, 'startTime', newTime)}
                disabled={isCareProvider}
                prefix={`start-${activity.id}`}
            />
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-xs w-12">종료:</span>
            <TimeSelector
                time={activity.endTime}
                onChange={(newTime) => onActivityChange(activity.id, 'endTime', newTime)}
                disabled={isCareProvider}
                prefix={`end-${activity.id}`}
            />
        </div>
        <textarea
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={inputBaseClasses}
          rows={2}
          placeholder={placeholderText}
          disabled={isCareProvider}
        />
        {onRemoveActivity && (
          <button 
            type="button" 
            onClick={() => onRemoveActivity(activity.id)} 
            className="text-red-500 hover:text-red-700 p-1 self-end"
            aria-label="활동 삭제"
            disabled={isCareProvider}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
  return (
    <li className="text-sm text-gray-700 py-1">
      {(activity.startTime || activity.endTime) && (
        <span className="font-semibold text-primary">
            {activity.startTime || '--:--'} ~ {activity.endTime || '--:--'} - 
        </span>
      )}
      {activityDescription || (isChildCareActivity ? (activity.institutionName || childInstitutionName || '-') : '-')}
    </li>
  );
};

interface ActivityCellProps {
  activities: Activity[];
  day: DayOfWeek;
  type: keyof DailyActivities;
  isEditing: boolean;
  onUpdateActivities: (newActivities: Activity[]) => void;
  isCareProvider: boolean;
  isAfterSchool: boolean;
  childForSchedule?: ChildInfo | null;
}

const ActivityCell: React.FC<ActivityCellProps> = ({ 
    activities, 
    day, 
    type, 
    isEditing, 
    onUpdateActivities, 
    isCareProvider, 
    isAfterSchool,
    childForSchedule
}) => {
  const [localActivities, setLocalActivities] = useState<Activity[]>(activities);
  const [isTyping, setIsTyping] = useState(false);
  const childInstitutionName = childForSchedule?.institutionType !== '해당없음' ? childForSchedule?.institutionName : undefined;

  useEffect(() => {
    // 타이핑 중이 아닐 때만 외부 변경사항 반영
    if (!isTyping) {
      setLocalActivities(activities);
    }
  }, [activities, isTyping]);

  const handleActivityChange = (id: string, field: keyof Activity, value: string) => {
    setIsTyping(true);
    const updatedActivities = localActivities.map(act => 
      act.id === id ? { ...act, [field]: value } : act
    );
    setLocalActivities(updatedActivities);
    
    // 디바운싱: 500ms 후에 업데이트 실행 및 타이핑 상태 해제
    setTimeout(() => {
      setIsTyping(false);
      if (!isCareProvider) {
        onUpdateActivities(updatedActivities);
      }
    }, 500);
  };

  const handleAddActivity = () => {
    if (isCareProvider) return;
    const newActivity: Activity = { 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        description: '', 
        startTime: '', 
        endTime: '',
        institutionName: !isAfterSchool ? childInstitutionName : undefined
    };
    const updatedActivities = [...localActivities, newActivity];
    setLocalActivities(updatedActivities);
    onUpdateActivities(updatedActivities);
  };

  const handleRemoveActivity = (id: string) => {
    if (isCareProvider) return;
    const updatedActivities = localActivities.filter(act => act.id !== id);
    setLocalActivities(updatedActivities);
    onUpdateActivities(updatedActivities);
  };

  // 주말 여부 확인
  const isWeekend = day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY;

  if (isEditing && !isCareProvider) {
    let currentActivities = [...localActivities];

    return (
      <div>
        {currentActivities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onActivityChange={handleActivityChange}
            onRemoveActivity={handleRemoveActivity}
            isEditing={isEditing}
            isCareProvider={isCareProvider}
            childInstitutionName={childInstitutionName}
            isChildCareActivity={!isAfterSchool}
          />
        ))}
        <button
          type="button"
          onClick={handleAddActivity}
          className="mt-2 flex items-center text-sm text-secondary hover:text-green-700 disabled:opacity-50"
          disabled={isCareProvider}
        >
          <PlusIcon className="w-4 h-4 mr-1" /> 활동 추가
        </button>
      </div>
    );
  }

  // View mode - 디폴트 활동 제거
  const displayActivities = activities;
  
  // 표시할 활동이 없으면 "-" 표시
  if (displayActivities.length === 0) return <p className="text-sm text-gray-500">-</p>;

  return (
    <ul className={`list-none ${isAfterSchool ? 'space-y-1' : ''}`}>
      {displayActivities.map((activity) => (
         <ActivityItem
            key={activity.id}
            activity={activity}
            onActivityChange={()=>{}} 
            isEditing={isEditing}
            isCareProvider={isCareProvider}
            childInstitutionName={childInstitutionName}
            isChildCareActivity={!isAfterSchool}
          />
      ))}
    </ul>
  );
};

interface WeeklyScheduleTableProps {
  // 기존 주간 기반 props (호환성을 위해 유지)
  schedule?: Record<DayOfWeek, DailyActivities>;
  isEditing: boolean;
  onUpdateSchedule?: (day: DayOfWeek, type: keyof DailyActivities, activities: Activity[]) => void;
  userType: UserType;
  childForSchedule?: ChildInfo | null;
  
  // 새로운 날짜별 props
  useNewDateBasedSchedule?: boolean; // 새로운 방식 사용 여부
  currentWeekSchedules?: DateRangeSchedules; // 현재 주의 날짜별 스케줄
  onUpdateDailySchedule?: (date: string, activityType: keyof DailyActivities, activities: Activity[]) => void;
}

export const WeeklyScheduleTable: React.FC<WeeklyScheduleTableProps> = ({ 
  schedule, 
  isEditing, 
  onUpdateSchedule, 
  userType, 
  childForSchedule,
  // 새로운 props
  useNewDateBasedSchedule = true, // 기본적으로 새로운 방식 사용
  currentWeekSchedules,
  onUpdateDailySchedule
}) => {
  const isCareProvider = userType === UserType.CARE_PROVIDER;
  const weekDates = getWeekDates();
  
  // 디버깅용 로그
  logger.debug('🔍 WeeklyScheduleTable 렌더링:', {
    useNewDateBasedSchedule,
    currentWeekSchedules,
    currentWeekSchedulesKeys: currentWeekSchedules ? Object.keys(currentWeekSchedules) : [],
    weekDates: weekDates.map(formatDateLocal),
    childForSchedule: childForSchedule?.name
  });
  
  
  
  // 날짜별 방식일 때의 업데이트 핸들러
  const handleUpdateNew = (dateString: string, type: keyof DailyActivities, newActivities: Activity[]) => {
    if (!isCareProvider && onUpdateDailySchedule) {
      onUpdateDailySchedule(dateString, type, newActivities);
    }
  };
  
  // 기존 주간 방식일 때의 업데이트 핸들러
  const handleUpdateOld = (day: DayOfWeek, type: keyof DailyActivities, newActivities: Activity[]) => {
    if (!isCareProvider && onUpdateSchedule) {
      onUpdateSchedule(day, type, newActivities);
    }
  };
  
  // 날짜에서 스케줄 데이터 가져오기
  const getScheduleForDate = (dateString: string, day: DayOfWeek, type: keyof DailyActivities): Activity[] => {
    if (useNewDateBasedSchedule && currentWeekSchedules) {
      // currentWeekSchedules는 DateRangeSchedules 타입 (날짜별 스케줄 맵)
      const dailySchedule = currentWeekSchedules[dateString];
      const activities = dailySchedule ? dailySchedule[type] : [];
      
      logger.debug(`📅 getScheduleForDate: ${dateString} (${day}) ${type}:`, {
        dailySchedule,
        activities,
        currentWeekSchedulesKeys: Object.keys(currentWeekSchedules)
      });
      
      return activities;
    } else if (schedule) {
      return schedule[day] ? schedule[day][type] : [];
    }
    return [];
  };


  return (
    <div className="overflow-x-auto">
      
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">요일</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">기관 활동</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">하원 후 활동</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {DAYS_OF_WEEK.map((day, index) => {
            const dateString = formatDateLocal(weekDates[index]);
            const isWeekend = day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY;
            
            return (
              <tr key={day} className={`${isWeekend ? 'bg-gray-50' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                  {formatDayWithDate(day, weekDates[index])}
                </td>
                <td className="px-4 py-3 align-top">
                   <ActivityCell 
                      activities={getScheduleForDate(dateString, day, 'childcareActivities')} 
                      day={day} 
                      type="childcareActivities" 
                      isEditing={isEditing} 
                      onUpdateActivities={(newActivities) => {
                        if (useNewDateBasedSchedule) {
                          handleUpdateNew(dateString, "childcareActivities", newActivities);
                        } else {
                          handleUpdateOld(day, "childcareActivities", newActivities);
                        }
                      }}
                      isCareProvider={isCareProvider}
                      isAfterSchool={false}
                      childForSchedule={childForSchedule}
                   />
                </td>
                <td className="px-4 py-3 align-top">
                  <ActivityCell 
                      activities={getScheduleForDate(dateString, day, 'afterSchoolActivities')} 
                      day={day} 
                      type="afterSchoolActivities" 
                      isEditing={isEditing} 
                      onUpdateActivities={(newActivities) => {
                        if (useNewDateBasedSchedule) {
                          handleUpdateNew(dateString, "afterSchoolActivities", newActivities);
                        } else {
                          handleUpdateOld(day, "afterSchoolActivities", newActivities);
                        }
                      }}
                      isCareProvider={isCareProvider}
                      isAfterSchool={true}
                      childForSchedule={childForSchedule}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isEditing && !isCareProvider && <p className="mt-2 text-xs text-gray-500">토요일과 일요일 활동도 입력할 수 있습니다. 시간과 활동 내용을 입력해주세요.</p>}
    </div>
  );
};
