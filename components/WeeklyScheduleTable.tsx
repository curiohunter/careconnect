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
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useData } from '../hooks/useData';
import { DataService } from '../services/dataService';

// 시간 옵션 생성 (짧은 버전 - 0~23시)
const generateShortHourOptions = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(i.toString().padStart(2, '0'));
  }
  return hours;
};

// 분 옵션 생성 (10분 단위 - 00, 10, 20, 30, 40, 50)
const generateTenMinuteOptions = () => {
  const minutes = [];
  for (let i = 0; i < 60; i += 10) {
    minutes.push(i.toString().padStart(2, '0'));
  }
  return minutes;
};

const SHORT_HOUR_OPTIONS = generateShortHourOptions();
const TEN_MINUTE_OPTIONS = generateTenMinuteOptions();

// 이번주 날짜 계산 함수
const getWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = 일요일, 1 = 월요일, ...
  const monday = new Date(today);
  
  // 월요일로 조정 (일요일이 0이므로 월요일을 1로 맞춤)
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

// 날짜 포맷팅 함수 (로컬 버전)
const formatDateLocal = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// 요일과 날짜를 함께 표시하는 함수
const formatDayWithDate = (day: DayOfWeek, date: Date) => {
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  return `${day} ${month}/${dayOfMonth}`;
};

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
        {TEN_MINUTE_OPTIONS.map(m => <option key={`${prefix}-m-${m}`} value={m}>{m}</option>)}
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
  
  const activityDescription = activity.description || (isChildCareActivity && childInstitutionName ? childInstitutionName : '');
  const placeholderText = isChildCareActivity && childInstitutionName ? childInstitutionName : "활동 내용";

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
          value={activityDescription}
          onChange={(e) => onActivityChange(activity.id, 'description', e.target.value)}
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
      {activityDescription || (isChildCareActivity ? (childInstitutionName || '-') : '-')}
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
  const childInstitutionName = childForSchedule?.institutionType !== '해당없음' ? childForSchedule?.institutionName : undefined;

  useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

  const handleActivityChange = (id: string, field: keyof Activity, value: string) => {
    const updatedActivities = localActivities.map(act => 
      act.id === id ? { ...act, [field]: value } : act
    );
    setLocalActivities(updatedActivities);
    if (!isCareProvider) onUpdateActivities(updatedActivities); 
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
    
    // 기관 활동이고 활동이 비어있으면 기본 활동 생성 (평일만)
    if (!isAfterSchool && currentActivities.length === 0 && !isWeekend) {
      const defaultActivity: Activity = { 
        id: `default-${day}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        description: childInstitutionName || '', 
        startTime: '', 
        endTime: '',
        institutionName: childInstitutionName
      };
      currentActivities = [defaultActivity];
      // 즉시 업데이트
      setLocalActivities(currentActivities);
      onUpdateActivities(currentActivities);
    }

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

  // View mode - 주말 처리 개선
  const displayActivities = activities.length > 0 ? activities : 
    (!isAfterSchool && !isWeekend ? [{id: 'placeholder', description: childInstitutionName || '-', startTime: '', endTime: ''}] : []);
  
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
  
  // 새로운 날짜별 데이터 관리 훅
  const { updateMultipleDays } = useData();
  
  // 기관 시간 일괄 설정 상태
  const [bulkStartTime, setBulkStartTime] = useState('');
  const [bulkEndTime, setBulkEndTime] = useState('');
  
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
      const dailySchedule = currentWeekSchedules[dateString];
      console.log(`🔍 getScheduleForDate: ${dateString}, ${type}`, {
        dailySchedule,
        availableDates: Object.keys(currentWeekSchedules),
        activities: dailySchedule ? dailySchedule[type] : []
      });
      return dailySchedule ? dailySchedule[type] : [];
    } else if (schedule) {
      return schedule[day] ? schedule[day][type] : [];
    }
    return [];
  };

  // 전체 기관 활동에 시간 적용 - 새로운 날짜별 방식
  const applyBulkTimeNew = async () => {
    if (!bulkStartTime || !bulkEndTime || !childForSchedule?.id) {
      alert('시작 시간과 종료 시간을 모두 설정해주세요.');
      return;
    }

    console.log('🔥 새로운 날짜별 일괄 적용 시작');

    try {
      // 평일만 적용 (월~금)
      const weekdays = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY];
      const updates = [];
      
      for (let i = 0; i < weekdays.length; i++) {
        const day = weekdays[i];
        const dateString = formatDateLocal(weekDates[i]); // 월요일부터 시작
        const existingActivities = getScheduleForDate(dateString, day, 'childcareActivities');
        
        console.log(`📅 ${day} (${dateString}) 처리 시작`);
        
        let updatedActivities: Activity[];
        
        if (existingActivities.length > 0) {
          // 기존 활동이 있으면 첫 번째 활동 수정
          const uniqueId = `updated-${dateString}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          updatedActivities = existingActivities.map((activity, actIndex) => 
            actIndex === 0 
              ? { 
                  ...activity,
                  id: uniqueId,
                  startTime: bulkStartTime, 
                  endTime: bulkEndTime,
                  description: activity.description || childForSchedule?.institutionName || '',
                  institutionName: childForSchedule?.institutionName
                }
              : activity
          );
          console.log(`✅ ${day} (${dateString}) 기존 활동 수정`);
        } else {
          // 활동이 없으면 새로 생성
          const uniqueId = `new-${dateString}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newActivity: Activity = {
            id: uniqueId,
            description: childForSchedule?.institutionName || '',
            startTime: bulkStartTime,
            endTime: bulkEndTime,
            institutionName: childForSchedule?.institutionName
          };
          updatedActivities = [newActivity];
          console.log(`✅ ${day} (${dateString}) 새 활동 생성`);
        }
        
        updates.push({
          date: dateString,
          activityType: 'childcareActivities' as const,
          activities: updatedActivities
        });
      }
      
      // 일괄 업데이트 실행
      if (updateMultipleDays && childForSchedule?.id) {
        await updateMultipleDays(childForSchedule.id, updates);
        console.log('🎉 새로운 날짜별 일괄 적용 완료!');
      }
      
    } catch (error) {
      console.error('❌ 새로운 날짜별 일괄 적용 실패:', error);
      alert('일괄 적용에 실패했습니다.');
    }
  };
  
  // 기존 주간 방식의 일괄 적용 (호환성을 위해 유지)
  const applyBulkTimeOld = async () => {
    if (!bulkStartTime || !bulkEndTime) {
      alert('시작 시간과 종료 시간을 모두 설정해주세요.');
      return;
    }

    console.log('🔥🔥🔥 기존 주간 방식 일괄 적용 시작');

    // 평일만 적용 (월~금)
    const weekdays = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY];

    // 순차적으로 하나씩 처리
    for (let i = 0; i < weekdays.length; i++) {
      const day = weekdays[i];
      const currentChildcareActivities = schedule?.[day]?.childcareActivities || [];
      
      let updatedActivities: Activity[];

      if (currentChildcareActivities.length > 0) {
        // 기존 활동이 있으면 - 첫 번째 활동 수정
        const uniqueTimestamp = Date.now() + i * 1000;
        const newUniqueId = `fixed-${day}-${uniqueTimestamp}-${Math.random().toString(36).substr(2, 9)}`;
        
        updatedActivities = currentChildcareActivities.map((activity, actIndex) => 
          actIndex === 0 
            ? { 
                ...activity,
                id: newUniqueId,
                startTime: bulkStartTime, 
                endTime: bulkEndTime,
                description: activity.description || childForSchedule?.institutionName || '',
                institutionName: childForSchedule?.institutionName
              }
            : activity
        );
        console.log(`✅ ${day} 기존 활동 수정 (새 ID):`, newUniqueId);
      } else {
        // 활동이 없으면 새로 생성
        const uniqueTimestamp = Date.now() + i * 1000;
        const uniqueId = `new-${day}-${uniqueTimestamp}-${Math.random().toString(36).substr(2, 9)}`;
        const newActivity: Activity = {
          id: uniqueId,
          description: childForSchedule?.institutionName || '',
          startTime: bulkStartTime,
          endTime: bulkEndTime,
          institutionName: childForSchedule?.institutionName
        };
        updatedActivities = [newActivity];
        console.log(`✅ ${day} 새 활동 생성:`, uniqueId);
      }

      // 하나씩 순차 업데이트
      try {
        console.log(`🚀 ${day} 업데이트 실행 중... (${i + 1}/${weekdays.length})`);
        if (onUpdateSchedule) {
          onUpdateSchedule(day, 'childcareActivities', updatedActivities);
        }
        
        // 각 업데이트 후 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`✅ ${day} 업데이트 완료!`);
        
      } catch (error) {
        console.error(`❌ ${day} 업데이트 실패:`, error);
      }
    }

    console.log('🎉🎉🎉 기존 주간 방식 전체 적용 완료!');
    alert('평일(월~금)의 기관 활동 시간이 설정되었습니다!');
  };

  // 일괄 적용 함수 선택
  const applyBulkTime = async () => {
    if (useNewDateBasedSchedule) {
      await applyBulkTimeNew();
    } else {
      await applyBulkTimeOld();
    }
  };

  return (
    <div className="overflow-x-auto">
      {/* 기관 시간 일괄 설정 (편집 모드일 때만 표시) */}
      {isEditing && !isCareProvider && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">🏫 기관 시간 일괄 설정</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">시작:</span>
              <TimeSelector
                time={bulkStartTime}
                onChange={setBulkStartTime}
                disabled={false}
                prefix="bulk-start"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">종료:</span>
              <TimeSelector
                time={bulkEndTime}
                onChange={setBulkEndTime}
                disabled={false}
                prefix="bulk-end"
              />
            </div>
            <button
              onClick={applyBulkTime}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              전체 적용
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            설정한 시간이 평일(월~금)의 기관 활동에 적용됩니다.
          </p>
        </div>
      )}
      
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
