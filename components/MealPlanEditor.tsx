import React, { useState, useEffect } from 'react';
import { DateRangeMealPlan, DailyMealPlanNew, UserType } from '../types';
import { DAYS_OF_WEEK } from '../constants';

// 이번주 날짜 계산 함수
const getWeekDates = () => {
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

// 날짜 포맷팅 함수 (YYYY-MM-DD)
const formatDateLocal = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 요일과 날짜를 함께 표시하는 함수
const formatDayWithDate = (dayName: string, date: Date) => {
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  return `${dayName} ${month}/${dayOfMonth}`;
};

interface MealPlanEditorProps {
  currentWeekMealPlans: DateRangeMealPlan;
  isEditing: boolean;
  onUpdate: (date: string, mealPlan: DailyMealPlanNew) => void;
  userType: UserType;
  onEditModeChange?: (editing: boolean) => void;
}

export const MealPlanEditor: React.FC<MealPlanEditorProps> = ({ 
  currentWeekMealPlans, 
  isEditing, 
  onUpdate, 
  userType,
  onEditModeChange
}) => {
  const isCareProvider = userType === UserType.CARE_PROVIDER;
  const readOnly = isCareProvider || !isEditing;
  const weekDates = getWeekDates();
  
  // 로컬 state로 입력값 관리
  const [localMealPlans, setLocalMealPlans] = useState<DateRangeMealPlan>(currentWeekMealPlans);

  // currentWeekMealPlans이 바뀌면 localMealPlans도 동기화
  useEffect(() => {
    setLocalMealPlans(currentWeekMealPlans);
  }, [currentWeekMealPlans]);

  // 입력값 변경 핸들러
  const handleChange = (date: string, field: 'menu' | 'notes', value: string) => {
    setLocalMealPlans(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        date,
        [field]: value,
        createdAt: prev[date]?.createdAt || new Date(),
        updatedAt: new Date()
      }
    }));
  };

  // onBlur에서만 onUpdate 호출
  const handleBlur = (date: string) => {
    const mealPlan = localMealPlans[date];
    if (mealPlan) {
      onUpdate(date, mealPlan);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">주간 식사 계획 (날짜별)</h3>
        <div className="flex items-center space-x-4">
          {!isCareProvider && onEditModeChange && (
            <button
              onClick={() => onEditModeChange(!isEditing)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isEditing 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-primary text-white hover:bg-blue-700'
              }`}
            >
              {isEditing ? '편집 완료' : '식사 계획 편집'}
            </button>
          )}
          {isCareProvider && (
            <span className="text-sm text-gray-500">돌봄 제공자는 식사 계획을 조회만 가능합니다</span>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                날짜
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                메뉴
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                특이사항
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {DAYS_OF_WEEK.map((dayName, index) => {
              const date = weekDates[index];
              const dateString = formatDateLocal(date);
              const mealPlan = localMealPlans[dateString];
              const isWeekend = dayName === '토' || dayName === '일';
              
              return (
                <tr key={dateString} className={`${isWeekend ? 'bg-gray-50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDayWithDate(dayName, date)}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <div className="text-sm text-gray-900 min-h-[2.5rem] flex items-center">
                        {mealPlan?.menu || '-'}
                      </div>
                    ) : (
                      <textarea
                        value={mealPlan?.menu || ''}
                        onChange={(e) => handleChange(dateString, 'menu', e.target.value)}
                        onBlur={() => handleBlur(dateString)}
                        placeholder="오늘의 메뉴를 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={2}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <div className="text-sm text-gray-600 min-h-[2.5rem] flex items-center">
                        {mealPlan?.notes || '-'}
                      </div>
                    ) : (
                      <textarea
                        value={mealPlan?.notes || ''}
                        onChange={(e) => handleChange(dateString, 'notes', e.target.value)}
                        onBlur={() => handleBlur(dateString)}
                        placeholder="특이사항을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={2}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {isEditing && !isCareProvider && (
        <div className="mt-4">
          <p className="text-xs text-gray-500">
            💡 팁: 메뉴나 특이사항을 입력한 후 다른 칸을 클릭하면 자동으로 저장됩니다.
          </p>
        </div>
      )}
    </div>
  );
};