import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Modal } from './Modal';
import { 
  SchedulePattern, 
  TimeSlot, 
  DayOfWeek, 
  Permission,
  UserType
} from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { CalendarIcon } from './icons/CalendarIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

// 시간 옵션 생성 (0~23시)
const generateHourOptions = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(i.toString().padStart(2, '0'));
  }
  return hours;
};

// 분 옵션 생성 (5분 단위)
const generateMinuteOptions = () => {
  const minutes = [];
  for (let i = 0; i < 60; i += 5) {
    minutes.push(i.toString().padStart(2, '0'));
  }
  return minutes;
};

const HOUR_OPTIONS = generateHourOptions();
const MINUTE_OPTIONS = generateMinuteOptions();

interface TimeSelectorProps {
  time?: string;
  onChange: (newTime: string) => void;
  disabled?: boolean;
  prefix: string;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ 
  time, 
  onChange, 
  disabled = false, 
  prefix 
}) => {
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
        {HOUR_OPTIONS.map(h => <option key={`${prefix}-h-${h}`} value={h}>{h}</option>)}
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
        {MINUTE_OPTIONS.map(m => <option key={`${prefix}-m-${m}`} value={m}>{m}</option>)}
      </select>
    </div>
  );
};

// 요일 선택기 컴포넌트
interface DayPickerProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  disabled?: boolean;
}

const DayPicker: React.FC<DayPickerProps> = ({ selectedDays, onChange, disabled = false }) => {
  const toggleDay = (day: DayOfWeek) => {
    if (disabled) return;
    
    const newSelectedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    onChange(newSelectedDays);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DAYS_OF_WEEK.map(day => (
        <button
          key={day}
          type="button"
          onClick={() => toggleDay(day)}
          className={`w-8 h-8 rounded-full text-sm font-medium ${
            selectedDays.includes(day)
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          {day}
        </button>
      ))}
    </div>
  );
};

// 시간 슬롯 아이템 컴포넌트
interface TimeSlotItemProps {
  timeSlot: TimeSlot;
  onUpdate: (updated: TimeSlot) => void;
  onRemove: () => void;
  dayOfWeek?: DayOfWeek;
  isEditing: boolean;
}

const TimeSlotItem: React.FC<TimeSlotItemProps> = ({ 
  timeSlot, 
  onUpdate, 
  onRemove, 
  dayOfWeek,
  isEditing
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
        <div className="flex-grow flex items-center space-x-2">
          <TimeSelector
            time={timeSlot.startTime}
            onChange={(newTime) => onUpdate({ ...timeSlot, startTime: newTime })}
            prefix={`slot-start-${timeSlot.startTime}`}
          />
          <span>~</span>
          <TimeSelector
            time={timeSlot.endTime}
            onChange={(newTime) => onUpdate({ ...timeSlot, endTime: newTime })}
            prefix={`slot-end-${timeSlot.endTime}`}
          />
          {dayOfWeek && (
            <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {dayOfWeek}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-between p-2 border-b last:border-b-0">
      <div className="flex items-center space-x-2">
        <span className="font-medium text-gray-800">
          {timeSlot.startTime || '--:--'} ~ {timeSlot.endTime || '--:--'}
        </span>
        {dayOfWeek && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {dayOfWeek}
          </span>
        )}
      </div>
    </div>
  );
};

// 예외 날짜 아이템 컴포넌트
interface ExceptionDateItemProps {
  date: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  type: 'VACATION' | 'OVERTIME' | 'CHANGE';
  timeSlots?: TimeSlot[];
  onApprove?: () => void;
  onReject?: () => void;
  isParent: boolean;
}

const ExceptionDateItem: React.FC<ExceptionDateItemProps> = ({ 
  date, 
  status, 
  type,
  timeSlots,
  onApprove,
  onReject,
  isParent
}) => {
  // 상태에 따른 스타일
  const statusStyles = {
    'APPROVED': {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      label: '승인됨'
    },
    'PENDING': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      label: '승인 대기중'
    },
    'REJECTED': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      label: '반려됨'
    }
  };

  // 타입에 따른 스타일
  const typeStyles = {
    'VACATION': {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      icon: '🏖️',
      label: '휴가'
    },
    'OVERTIME': {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      icon: '⏰',
      label: '연장근무'
    },
    'CHANGE': {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      icon: '🔄',
      label: '시간변경'
    }
  };

  const style = statusStyles[status];
  const typeStyle = typeStyles[type];
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`p-3 rounded-lg ${typeStyle.bg} border ${style.border} mb-2`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
              {typeStyle.icon} {typeStyle.label}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>
          <p className="text-sm font-medium mt-1">{formatDate(date)}</p>
          
          {/* 시간 슬롯 표시 */}
          {timeSlots && timeSlots.length > 0 && (
            <div className="mt-1 space-y-1">
              {timeSlots.map((slot, index) => (
                <div key={index} className="text-xs text-gray-700">
                  {slot.startTime} ~ {slot.endTime}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 부모인 경우 승인/반려 버튼 표시 */}
        {isParent && status === 'PENDING' && (
          <div className="flex space-x-2">
            <button
              onClick={onApprove}
              className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200"
              title="승인"
            >
              <CheckCircleIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onReject}
              className="p-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
              title="반려"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 패턴 아이템 컴포넌트
interface PatternItemProps {
  pattern: SchedulePattern;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: (isActive: boolean) => void;
}

const PatternItem: React.FC<PatternItemProps> = ({ 
  pattern, 
  onEdit, 
  onDelete,
  onActivate
}) => {
  // 반복 타입에 따른 텍스트
  const getRepeatText = () => {
    switch (pattern.repeatType) {
      case 'DAILY':
        return '매일';
      case 'WEEKLY':
        return `매주 ${pattern.repeatDays?.join(', ')}`;
      case 'MONTHLY':
        return `매월 ${pattern.repeatDates?.join(', ')}일`;
      case 'CUSTOM':
        return '사용자 지정';
      default:
        return '';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${
      pattern.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
    } mb-3`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{pattern.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{getRepeatText()}</p>
          
          {/* 시간 슬롯 표시 */}
          <div className="mt-2 space-y-1">
            {pattern.timeSlots.map((slot, index) => (
              <div key={index} className="text-sm">
                <span className="text-primary font-medium">
                  {slot.startTime} ~ {slot.endTime}
                </span>
                {slot.dayOfWeek && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {slot.dayOfWeek}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onActivate(!pattern.isActive)}
            className={`p-1.5 rounded-full ${
              pattern.isActive 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={pattern.isActive ? '비활성화' : '활성화'}
          >
            <CheckCircleIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
            title="수정"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
            title="삭제"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        최종 수정: {new Date(pattern.updatedAt).toLocaleString()}
      </div>
    </div>
  );
};

interface SchedulePatternManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchedulePatternManager: React.FC<SchedulePatternManagerProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { user, userProfile } = useAuth();
  const { 
    schedulePatterns, 
    loadSchedulePatterns, 
    createSchedulePattern, 
    updateSchedulePattern, 
    deleteSchedulePattern 
  } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'patterns' | 'exceptions'>('patterns');
  const [editingPattern, setEditingPattern] = useState<SchedulePattern | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    repeatType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    repeatDays: DayOfWeek[];
    repeatDates: number[];
    customPattern: string;
    timeSlots: TimeSlot[];
  }>({
    name: '',
    repeatType: 'WEEKLY',
    repeatDays: [],
    repeatDates: [],
    customPattern: '',
    timeSlots: [],
  });

  // 선생님 모드가 아닌 부모 모드인지 확인
  const isParent = userProfile?.userType === UserType.PARENT;

  // 패턴 불러오기
  useEffect(() => {
    if (isOpen && loadSchedulePatterns) {
      loadSchedulePatterns();
    }
  }, [isOpen, loadSchedulePatterns]);

  // 패턴 수정 시 폼 데이터 초기화
  useEffect(() => {
    if (editingPattern) {
      setFormData({
        name: editingPattern.name,
        repeatType: editingPattern.repeatType,
        repeatDays: editingPattern.repeatDays || [],
        repeatDates: editingPattern.repeatDates || [],
        customPattern: editingPattern.customPattern || '',
        timeSlots: editingPattern.timeSlots || [],
      });
    }
  }, [editingPattern]);

  // 모달 열기
  const handleOpenModal = (pattern?: SchedulePattern) => {
    if (pattern) {
      setEditingPattern(pattern);
    } else {
      setEditingPattern(null);
      setFormData({
        name: '',
        repeatType: 'WEEKLY',
        repeatDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY],
        repeatDates: [],
        customPattern: '',
        timeSlots: [{
          startTime: '09:00',
          endTime: '18:00',
        }],
      });
    }
    setIsModalOpen(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPattern(null);
  };

  // 패턴 저장
  const handleSavePattern = async () => {
    if (!user?.uid) return;
    
    try {
      const patternData = {
        ...formData,
        isActive: editingPattern ? editingPattern.isActive : true,
        createdBy: user.uid,
      };
      
      if (editingPattern) {
        await updateSchedulePattern(editingPattern.id, patternData);
      } else {
        await createSchedulePattern(patternData);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('패턴 저장 오류:', error);
    }
  };

  // 패턴 삭제
  const handleDeletePattern = async (patternId: string) => {
    if (confirm('이 패턴을 삭제하시겠습니까?')) {
      try {
        await deleteSchedulePattern(patternId);
      } catch (error) {
        console.error('패턴 삭제 오류:', error);
      }
    }
  };

  // 패턴 활성화/비활성화
  const handleActivatePattern = async (patternId: string, isActive: boolean) => {
    try {
      await updateSchedulePattern(patternId, { isActive });
    } catch (error) {
      console.error('패턴 상태 변경 오류:', error);
    }
  };

  // 시간 슬롯 추가
  const handleAddTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [
        ...formData.timeSlots,
        {
          startTime: '',
          endTime: '',
        },
      ],
    });
  };

  // 시간 슬롯 업데이트
  const handleUpdateTimeSlot = (index: number, updatedSlot: TimeSlot) => {
    const newTimeSlots = [...formData.timeSlots];
    newTimeSlots[index] = updatedSlot;
    setFormData({
      ...formData,
      timeSlots: newTimeSlots,
    });
  };

  // 시간 슬롯 제거
  const handleRemoveTimeSlot = (index: number) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index),
    });
  };

  // 예시 예외 데이터 (실제로는 API에서 가져와야 함)
  const exceptionDates = [
    {
      date: '2025-06-20',
      status: 'APPROVED' as const,
      type: 'VACATION' as const,
      timeSlots: []
    },
    {
      date: '2025-06-25',
      status: 'PENDING' as const,
      type: 'OVERTIME' as const,
      timeSlots: [
        { startTime: '18:00', endTime: '20:00' }
      ]
    },
    {
      date: '2025-06-30',
      status: 'REJECTED' as const,
      type: 'CHANGE' as const,
      timeSlots: [
        { startTime: '10:00', endTime: '15:00' }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="스케줄 패턴 관리"
      maxWidth="max-w-4xl"
    >
      <div className="min-h-[60vh]">
        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patterns' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('patterns')}
            >
              기본 패턴
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'exceptions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('exceptions')}
            >
              예외 날짜 <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">{exceptionDates.length}</span>
            </button>
          </nav>
        </div>

        {/* 패턴 목록 */}
        {activeTab === 'patterns' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">기본 근무 패턴</h3>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1" /> 새 패턴 추가
              </button>
            </div>
            
            {schedulePatterns.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-lg border border-gray-200">
                <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">등록된 스케줄 패턴이 없습니다.</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  첫 패턴 만들기
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {schedulePatterns.map(pattern => (
                  <PatternItem
                    key={pattern.id}
                    pattern={pattern}
                    onEdit={() => handleOpenModal(pattern)}
                    onDelete={() => handleDeletePattern(pattern.id)}
                    onActivate={(isActive) => handleActivatePattern(pattern.id, isActive)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 예외 날짜 목록 */}
        {activeTab === 'exceptions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">예외 날짜 관리</h3>
              <button
                className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1" /> 예외 날짜 추가
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p>예외 날짜는 기본 스케줄 패턴의 예외로 적용되는 날짜입니다.</p>
                <p>휴가, 연장근무, 시간 변경 등의 예외를 관리할 수 있습니다.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">승인 대기 중</h4>
                {exceptionDates.filter(ex => ex.status === 'PENDING').map((exception, index) => (
                  <ExceptionDateItem
                    key={index}
                    {...exception}
                    isParent={isParent}
                    onApprove={() => console.log('승인:', exception.date)}
                    onReject={() => console.log('반려:', exception.date)}
                  />
                ))}
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">처리 완료</h4>
                {exceptionDates.filter(ex => ex.status !== 'PENDING').map((exception, index) => (
                  <ExceptionDateItem
                    key={index}
                    {...exception}
                    isParent={isParent}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 패턴 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPattern ? "스케줄 패턴 수정" : "새 스케줄 패턴 추가"}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSavePattern(); }} className="space-y-4">
          <div>
            <label htmlFor="patternName" className="block text-sm font-medium text-gray-700 mb-1">
              패턴 이름
            </label>
            <input
              type="text"
              id="patternName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              반복 타입
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, repeatType: type })}
                  className={`py-2 px-3 rounded-md text-sm ${
                    formData.repeatType === type
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'DAILY' ? '매일' : 
                   type === 'WEEKLY' ? '매주' : 
                   type === 'MONTHLY' ? '매월' : '사용자 지정'}
                </button>
              ))}
            </div>
          </div>
          
          {formData.repeatType === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                반복 요일
              </label>
              <DayPicker
                selectedDays={formData.repeatDays}
                onChange={(days) => setFormData({ ...formData, repeatDays: days })}
              />
            </div>
          )}
          
          {formData.repeatType === 'MONTHLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                반복 날짜
              </label>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      const newDates = formData.repeatDates.includes(date)
                        ? formData.repeatDates.filter(d => d !== date)
                        : [...formData.repeatDates, date];
                      setFormData({ ...formData, repeatDates: newDates });
                    }}
                    className={`w-8 h-8 rounded-full text-sm ${
                      formData.repeatDates.includes(date)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {formData.repeatType === 'CUSTOM' && (
            <div>
              <label htmlFor="customPattern" className="block text-sm font-medium text-gray-700 mb-1">
                사용자 지정 패턴
              </label>
              <input
                type="text"
                id="customPattern"
                value={formData.customPattern}
                onChange={(e) => setFormData({ ...formData, customPattern: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="* * * * *"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cron 표현식을 사용하여 패턴을 지정할 수 있습니다.
              </p>
            </div>
          )}
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                시간 슬롯
              </label>
              <button
                type="button"
                onClick={handleAddTimeSlot}
                className="text-sm text-primary hover:text-blue-700"
              >
                + 슬롯 추가
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <TimeSelector
                    time={slot.startTime}
                    onChange={(newTime) => handleUpdateTimeSlot(index, { ...slot, startTime: newTime })}
                    prefix={`modal-start-${index}`}
                  />
                  <span>~</span>
                  <TimeSelector
                    time={slot.endTime}
                    onChange={(newTime) => handleUpdateTimeSlot(index, { ...slot, endTime: newTime })}
                    prefix={`modal-end-${index}`}
                  />
                  
                  {formData.timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTimeSlot(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
            >
              {editingPattern ? '수정하기' : '저장하기'}
            </button>
          </div>
        </form>
      </Modal>
    </Modal>
  );
};

export default SchedulePatternManager;