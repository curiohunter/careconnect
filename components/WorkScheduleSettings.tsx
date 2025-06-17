import React, { useState, useEffect } from 'react';
import { WorkSchedule, DayOfWeek, WorkShift, UserType } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface WorkScheduleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkScheduleSettings: React.FC<WorkScheduleSettingsProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const { workSchedule, updateWorkSchedule } = useData();
  const [schedule, setSchedule] = useState<WorkSchedule>({} as WorkSchedule);
  const [loading, setLoading] = useState(false);

  // 초기 스케줄 설정
  useEffect(() => {
    if (workSchedule) {
      setSchedule(workSchedule);
    } else {
      // 기본 스케줄 생성
      const defaultSchedule: WorkSchedule = {} as WorkSchedule;
      DAYS_OF_WEEK.forEach(day => {
        defaultSchedule[day] = day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY 
          ? 'OFF' 
          : { startTime: '09:00', endTime: '18:00' };
      });
      setSchedule(defaultSchedule);
    }
  }, [workSchedule]);

  const handleShiftChange = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev: WorkSchedule) => {
      const currentShift = prev[day];
      if (currentShift === 'OFF') return prev;
      
      return {
        ...prev,
        [day]: {
          ...currentShift,
          [field]: value
        }
      };
    });
  };

  const handleToggleOff = (day: DayOfWeek) => {
    setSchedule((prev: WorkSchedule) => ({
      ...prev,
      [day]: prev[day] === 'OFF' 
        ? { startTime: '09:00', endTime: '18:00' }
        : 'OFF'
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateWorkSchedule(schedule);
      onClose();
    } catch (error) {
      console.error('근무 일정 저장 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // 돌봄 선생님만 근무 일정 설정 가능
  if (userProfile?.userType !== UserType.CARE_PROVIDER) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">접근 권한 없음</h3>
          <p className="text-gray-600 mb-4">근무 일정 설정은 돌봄 선생님만 이용할 수 있습니다.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">기본 근무 일정 설정</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map(day => {
            const shift = schedule[day];
            const isOff = shift === 'OFF';

            return (
              <div key={day} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{day}요일</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isOff}
                      onChange={() => handleToggleOff(day)}
                      className="mr-2"
                    />
                    <span className="text-sm">휴무</span>
                  </label>
                </div>

                {!isOff && typeof shift === 'object' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시작 시간
                      </label>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleShiftChange(day, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        종료 시간
                      </label>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleShiftChange(day, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                {isOff && (
                  <div className="text-center text-gray-500 py-4">
                    휴무일
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkScheduleSettings;
