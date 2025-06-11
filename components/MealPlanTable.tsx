import React from 'react';
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
          {DAYS_OF_WEEK.map((day) => {
            const dayPlan = plan[day] || { menu: '', notes: '' };
            return (
              <tr key={day} className={`${(day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY) ? 'bg-gray-50' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 align-top">{day}</td>
                <td className="px-4 py-3 align-top">
                  {readOnly ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{dayPlan.menu || '-'}</p>
                  ) : (
                    <textarea
                      value={dayPlan.menu}
                      onChange={(e) => onUpdate(day, e.target.value, dayPlan.notes || '')}
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
                      value={dayPlan.notes || ''}
                      onChange={(e) => onUpdate(day, dayPlan.menu, e.target.value)}
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