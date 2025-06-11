import React, { useState, useEffect } from 'react';
import { WeeklyActivitySchedule, DayOfWeek, Activity, DailyActivities, UserType, ChildInfo } from '../types';
import { DAYS_OF_WEEK, generateHourOptions, generateMinuteOptions } from '../constants';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

const HOUR_OPTIONS = generateHourOptions();
const MINUTE_OPTIONS = generateMinuteOptions(10);

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
    <div className="flex space-x-1">
      <select
        value={hour}
        onChange={handleHourChange}
        className={`${selectBaseClasses} w-20`}
        disabled={disabled}
        aria-label={`${prefix} 시간`}
      >
        <option value="">시</option>
        {HOUR_OPTIONS.map(h => <option key={`${prefix}-h-${h}`} value={h}>{h}</option>)}
      </select>
      <select
        value={minute}
        onChange={handleMinuteChange}
        className={`${selectBaseClasses} w-20`}
        disabled={disabled}
        aria-label={`${prefix} 분`}
      >
        <option value="">분</option>
        {MINUTE_OPTIONS.map(m => <option key={`${prefix}-m-${m}`} value={m}>{m}</option>)}
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
        id: Date.now().toString(), 
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

  if (isEditing && !isCareProvider) {
    let currentActivities = localActivities;
    if (!isAfterSchool && currentActivities.length === 0) {
        currentActivities = [{ 
            id: Date.now().toString(), 
            description: '', 
            startTime: '', 
            endTime: '',
            institutionName: childInstitutionName
        }];
        // To persist this new empty activity immediately for editing
        // useEffect(() => { onUpdateActivities(currentActivities); }, []); // Careful with this
    }


    return (
      <div>
        {currentActivities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onActivityChange={handleActivityChange}
            onRemoveActivity={isAfterSchool || currentActivities.length > 1 ? handleRemoveActivity : undefined} // Allow remove for afterschool or if more than one childcare
            isEditing={isEditing}
            isCareProvider={isCareProvider}
            childInstitutionName={childInstitutionName}
            isChildCareActivity={!isAfterSchool}
          />
        ))}
        {isAfterSchool && (
          <button
            type="button"
            onClick={handleAddActivity}
            className="mt-2 flex items-center text-sm text-secondary hover:text-green-700 disabled:opacity-50"
            disabled={isCareProvider}
          >
            <PlusIcon className="w-4 h-4 mr-1" /> 활동 추가
          </button>
        )}
      </div>
    );
  }

  // View mode
  const displayActivities = activities.length > 0 ? activities : 
    (!isAfterSchool ? [{id: 'placeholder', description: childInstitutionName || '-', startTime: '', endTime: ''}] : []);
  
  if (displayActivities.length === 0 && isAfterSchool) return <p className="text-sm text-gray-500">-</p>;

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
  schedule: WeeklyActivitySchedule;
  isEditing: boolean;
  onUpdateSchedule: (day: DayOfWeek, type: keyof DailyActivities, activities: Activity[]) => void;
  userType: UserType;
  childForSchedule?: ChildInfo | null; // Pass the current child object for institution name
}

export const WeeklyScheduleTable: React.FC<WeeklyScheduleTableProps> = ({ schedule, isEditing, onUpdateSchedule, userType, childForSchedule }) => {
  const isCareProvider = userType === UserType.CARE_PROVIDER;
  
  const handleUpdate = (day: DayOfWeek, type: keyof DailyActivities, newActivities: Activity[]) => {
    if (!isCareProvider) {
      onUpdateSchedule(day, type, newActivities);
    }
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
          {DAYS_OF_WEEK.map((day) => (
            <tr key={day} className={`${(day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY) ? 'bg-gray-50' : ''}`}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 align-top">{day}</td>
              <td className="px-4 py-3 align-top">
                 <ActivityCell 
                    activities={schedule[day]?.childcareActivities || []} 
                    day={day} 
                    type="childcareActivities" 
                    isEditing={isEditing} 
                    onUpdateActivities={(newActivities) => handleUpdate(day, "childcareActivities", newActivities)}
                    isCareProvider={isCareProvider}
                    isAfterSchool={false}
                    childForSchedule={childForSchedule}
                 />
              </td>
              <td className="px-4 py-3 align-top">
                <ActivityCell 
                    activities={schedule[day]?.afterSchoolActivities || []} 
                    day={day} 
                    type="afterSchoolActivities" 
                    isEditing={isEditing} 
                    onUpdateActivities={(newActivities) => handleUpdate(day, "afterSchoolActivities", newActivities)}
                    isCareProvider={isCareProvider}
                    isAfterSchool={true}
                    childForSchedule={childForSchedule}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isEditing && !isCareProvider && <p className="mt-2 text-xs text-gray-500">토요일과 일요일 활동도 입력할 수 있습니다. 시간과 활동 내용을 입력해주세요.</p>}
    </div>
  );
};