import React, { useState, useEffect } from 'react';
import { DailyMealPlan, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../constants';

interface MealPlanTableProps {
  plan: DailyMealPlan;
  isEditing: boolean;
  onUpdate: (day: DayOfWeek, menu: string, notes: string) => void;
  isCareProvider: boolean;
}

export const MealPlanTable: React.FC<MealPlanTableProps> = ({ plan, isEditing, onUpdate, isCareProvider }) => {
  const readOnly = isCareProvider || !isEditing;
  // 1. 로컬 state로 입력값 관리
  const [localPlan, setLocalPlan] = useState<DailyMealPlan>(plan);

  // 2. plan이 바뀌면 localPlan도 동기화
  useEffect(() => {
    setLocalPlan(plan);
  }, [plan]);

  // 3. 입력값 변경 핸들러
  const handleChange = (day: DayOfWeek, field: 'menu' | 'notes', value: string) => {
    setLocalPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // 4. onBlur에서만 onUpdate 호출
  const handleBlur = (day: DayOfWeek) => {
    onUpdate(day, localPlan[day]?.menu || '', localPlan[day]?.notes || '');
  };

  // 이번주 날짜 계산 함수 (로컬 시간 기준)
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
  const weekDates = getWeekDates();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">요일</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-3/5">메뉴</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">비고</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {DAYS_OF_WEEK.map((day, idx) => {
            const dayPlan = localPlan[day] || { menu: '', notes: '' };
            const date = weekDates[idx];
            const month = date.getMonth() + 1;
            const dayOfMonth = date.getDate();
            return (
              <tr key={day} className={`${(day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY) ? 'bg-gray-50' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 align-top">{day} {month}/{dayOfMonth}</td>
                <td className="px-4 py-3 align-top">
                  {readOnly ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{dayPlan.menu || '-'}</p>
                  ) : (
                    <textarea
                      value={dayPlan.menu}
                      onChange={e => handleChange(day, 'menu', e.target.value)}
                      onBlur={() => handleBlur(day)}
                      className="w-full p-1 border border-gray-300 rounded-md text-sm h-20 resize-none"
                      rows={3}
                      disabled={readOnly}
                    />
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {readOnly ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{dayPlan.notes || '-'}</p>
                  ) : (
                    <textarea
                      value={dayPlan.notes}
                      onChange={e => handleChange(day, 'notes', e.target.value)}
                      onBlur={() => handleBlur(day)}
                      className="w-full p-1 border border-gray-300 rounded-md text-sm h-16 resize-none"
                      rows={2}
                      disabled={readOnly}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isEditing && !isCareProvider && <p className="mt-2 text-xs text-gray-500">토요일과 일요일 식단도 입력할 수 있습니다.</p>}
    </div>
  );
};