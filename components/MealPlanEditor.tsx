import React, { useState, useEffect } from 'react';
import { DateRangeMealPlan, DailyMealPlanNew, UserType } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import toast from 'react-hot-toast';
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

  // 입력값 변경 핸들러 - undefined 값 방지
  const handleChange = (date: string, field: 'menu' | 'notes', value: string) => {
    setLocalMealPlans(prev => {
      const existingPlan = prev[date] || { menu: '', notes: '' };
      return {
        ...prev,
        [date]: {
          ...existingPlan,
          date,
          [field]: value || '', // undefined 대신 빈 문자열
          createdAt: existingPlan.createdAt || new Date(),
          updatedAt: new Date()
        }
      };
    });
  };

  // 저장 버튼 클릭 시 안전한 데이터 처리
  const handleSave = () => {
    let savedCount = 0;
    
    Object.keys(localMealPlans).forEach(date => {
      const mealPlan = localMealPlans[date];
      if (mealPlan && (mealPlan.menu?.trim() || mealPlan.notes?.trim())) {
        // undefined 값 제거 및 안전한 데이터 처리
        const safeMealPlan = {
          ...mealPlan,
          menu: mealPlan.menu || '',
          notes: mealPlan.notes || ''
        };
        
        onUpdate(date, safeMealPlan);
        savedCount++;
      }
    });
    
    // 저장 완료 후 한 번만 메시지 (선택적)
    if (savedCount > 0) {
      toast.success(`식사 계획 ${savedCount}일분 저장 완료`);
    }
    
    onEditModeChange?.(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">주간 식사 계획 </h3>
        <div className="flex items-center space-x-4">
          {!isCareProvider && onEditModeChange && (
            <div className="flex gap-3">
              {isEditing && (
                <button
                  onClick={() => onEditModeChange(false)}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  뒤로
                </button>
              )}
              <button
                onClick={isEditing ? handleSave : () => onEditModeChange(!isEditing)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isEditing 
                    ? 'bg-accent text-white hover:bg-amber-600' 
                    : 'bg-primary text-white hover:bg-blue-700'
                }`}
              >
                {isEditing ? '저장' : '식사 편집'}
              </button>
            </div>
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
      
    </div>
  );
};