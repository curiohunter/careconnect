import React, { useState } from 'react';
import { SpecialScheduleItem, UserType, Connection } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { PlusIcon } from './icons/PlusIcon';

// 시간 드롭다운 생성 (시/분 분리)
const generateHourOptions = () => {
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    hours.push(hour.toString().padStart(2, '0'));
  }
  return hours;
};

const generateMinuteOptions = () => {
  const minutes = [];
  for (let minute = 0; minute < 60; minute += 5) {
    minutes.push(minute.toString().padStart(2, '0'));
  }
  return minutes;
};

const HOUR_OPTIONS = generateHourOptions();
const MINUTE_OPTIONS = generateMinuteOptions();

interface AddSpecialScheduleItemFormProps {
  type: 'VACATION' | 'OVERTIME_REQUEST' | 'NOTICE';
  currentUserType: UserType;
  connections?: Connection[]; // 연결된 돌봄선생님 목록
  itemToEdit?: SpecialScheduleItem; // 수정할 아이템
  onSubmit: (item: Omit<SpecialScheduleItem, 'id'>) => void;
  onClose: () => void;
}

export const AddSpecialScheduleItemForm: React.FC<AddSpecialScheduleItemFormProps> = ({ type, currentUserType, connections, itemToEdit, onSubmit, onClose }) => {
  const [date, setDate] = useState(itemToEdit?.date || new Date().toISOString().split('T')[0]); 
  const [startDate, setStartDate] = useState(itemToEdit?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(itemToEdit?.endDate || new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState(itemToEdit?.title || '');
  const [details, setDetails] = useState(itemToEdit?.details || '');
  const [startHour, setStartHour] = useState(itemToEdit?.startTime?.split(':')[0] || '');
  const [startMinute, setStartMinute] = useState(itemToEdit?.startTime?.split(':')[1] || '');
  const [endHour, setEndHour] = useState(itemToEdit?.endTime?.split(':')[0] || '');
  const [endMinute, setEndMinute] = useState(itemToEdit?.endTime?.split(':')[1] || '');
  // targetUserType 삭제됨 - 휴가는 항상 돌보선생님이 신청
  const [targetUserId, setTargetUserId] = useState<string>(itemToEdit?.targetUserId || ''); // 연장근무 담당자 ID
  
  // 다중 날짜 선택을 위한 상태 (연장근무용)
  const [dates, setDates] = useState<string[]>(
    itemToEdit?.dates || (type === 'OVERTIME_REQUEST' && date ? [date] : [])
  );

  // 날짜 추가 함수
  const addDate = (newDate: string) => {
    if (!dates.includes(newDate)) {
      const updatedDates = [...dates, newDate].sort();
      setDates(updatedDates);
    }
  };

  // 날짜 삭제 함수
  const removeDate = (dateToRemove: string) => {
    setDates(dates.filter(d => d !== dateToRemove));
  };

  // 권한 기반 UI 제어
  const canCreateType = (requestType: string) => {
    switch(requestType) {
      case 'OVERTIME_REQUEST': 
        return currentUserType === UserType.PARENT; // 부모만 연장근무 요청 가능
      case 'VACATION': 
        return currentUserType === UserType.CARE_PROVIDER; // 돌봄선생님만 휴가 신청 가능
      case 'NOTICE': 
        return currentUserType === UserType.PARENT; // 부모만 안내사항 작성 가능
      default: 
        return true;
    }
  };

  // 연결된 돌봄선생님 목록 가져오기 (연장근무 요청용)
  const getCareProviders = () => {
    if (!connections || currentUserType !== UserType.PARENT) return [];
    return connections.map(conn => ({
      id: conn.careProviderId,
      name: conn.careProviderProfile.name || '돌봄선생님'
    }));
  };

  const getTitlePlaceholder = () => {
    switch(type) {
      case 'VACATION': return '휴가 사유 (예: 개인 휴가)';
      case 'OVERTIME_REQUEST': return '연장 근무 사유 (예: 긴급 상황)';
      case 'NOTICE': return '안내 제목 (예: 준비물 안내)';
      default: return '제목';
    }
  };

  const getDetailsPlaceholder = () => {
     switch(type) {
      case 'VACATION': return '상세 내용';
      case 'OVERTIME_REQUEST': return '상세 내용';
      case 'NOTICE': return '상세 내용';
      default: return '상세 내용';
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 권한 검증
    if (!canCreateType(type)) {
      const typeNames = { 
        'OVERTIME_REQUEST': '연장근무 요청', 
        'VACATION': '휴가 신청', 
        'NOTICE': '안내사항' 
      };
      alert(`${typeNames[type as keyof typeof typeNames]}은(는) 권한이 없습니다.`);
      return;
    }
    
    // 공통 검증
    if (type !== 'VACATION' && !date) {
        alert('날짜는 필수입니다.');
        return;
    }
    if (!title) {
        alert('제목은 필수입니다.');
        return;
    }
    
    // 휴가 검증
    if (type === 'VACATION') {
        if (!startDate || !endDate) {
            alert('휴가 신청 시 시작일과 종료일은 필수입니다.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('시작일은 종료일보다 이전이어야 합니다.');
            return;
        }
    }
    
    // 연장근무 검증
    if (type === 'OVERTIME_REQUEST') {
      // 다중 날짜 선택 검증
      if (dates.length === 0) {
        alert('연장 근무 요청 시 최소 하나 이상의 날짜를 선택해주세요.');
        return;
      }
      if (!startHour || !startMinute || !endHour || !endMinute) {
        alert('연장 근무 요청 시 시작 시간과 종료 시간은 필수입니다.');
        return;
      }
      if (currentUserType === UserType.PARENT && !targetUserId) {
        alert('담당 돌봄선생님을 선택해주세요.');
        return;
      }
    }

    const itemData: Omit<SpecialScheduleItem, 'id'> = {
      date: type === 'VACATION' ? endDate : (type === 'OVERTIME_REQUEST' && dates.length > 0 ? dates[0] : date), // 연장근무는 첫 번째 날짜, 휴가는 종료일
      type,
      title,
      details,
      creatorUserType: currentUserType,
    };

    if (type === 'VACATION') {
      itemData.targetUserType = UserType.CARE_PROVIDER; // 휴가는 항상 돌보선생님이 신청
      itemData.startDate = startDate;
      itemData.endDate = endDate;
    }

    if (type === 'OVERTIME_REQUEST') {
      itemData.startTime = `${startHour}:${startMinute}`;
      itemData.endTime = `${endHour}:${endMinute}`;
      if (targetUserId) {
        itemData.targetUserId = targetUserId;
      }
      // 다중 날짜 배열 추가
      if (dates.length > 0) {
        itemData.dates = dates;
      }
    }
    
    onSubmit(itemData);
  };

  // 권한이 없는 경우 에러 메시지 표시
  if (!canCreateType(type)) {
    const typeNames = { 
      'OVERTIME_REQUEST': '연장근무 요청', 
      'VACATION': '휴가 신청', 
      'NOTICE': '안내사항' 
    };
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800 text-sm">
          {typeNames[type as keyof typeof typeNames]}은(는) 권한이 없습니다.
          {type === 'OVERTIME_REQUEST' && ' 연장근무 요청은 부모만 작성할 수 있습니다.'}
          {type === 'VACATION' && ' 휴가 신청은 돌봄선생님만 작성할 수 있습니다.'}
          {type === 'NOTICE' && ' 안내사항은 부모만 작성할 수 있습니다.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type !== 'VACATION' && (
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            {type === 'OVERTIME_REQUEST' ? '날짜 선택' : '날짜'}
          </label>
          {type === 'OVERTIME_REQUEST' ? (
            <>
              <div className="flex gap-2 mt-1">
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (date && dates.length < 7) {
                      addDate(date);
                    }
                  }}
                  disabled={!date || dates.includes(date) || dates.length >= 7}
                  className="px-3 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  추가
                </button>
              </div>
              
              {/* 선택된 날짜 목록 */}
              {dates.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">선택된 날짜 ({dates.length}/7)</p>
                  <div className="flex flex-wrap gap-2">
                    {dates.map((selectedDate) => (
                      <span
                        key={selectedDate}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {new Date(selectedDate).toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric'
                        })}
                        <button
                          type="button"
                          onClick={() => removeDate(selectedDate)}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              required
            />
          )}
        </div>
      )}
      
      {type === 'VACATION' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">시작일</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">종료일</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              required
            />
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">제목</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={getTitlePlaceholder()}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          required
        />
      </div>
      
      {type === 'VACATION' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            휴가 신청은 돌봄선생님에게 적용됩니다.
          </p>
        </div>
      )}
      
      {type === 'OVERTIME_REQUEST' && (
        <div className="space-y-4">
          {/* 담당 선생님 선택 (부모 사용자만) */}
          {currentUserType === UserType.PARENT && getCareProviders().length > 0 && (
            <div>
              <label htmlFor="targetUserId" className="block text-sm font-medium text-gray-700">담당 돌봄선생님</label>
              <select
                id="targetUserId"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              >
                <option value="">담당 선생님을 선택하세요</option>
                {getCareProviders().map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                연장근무를 담당할 돌봄선생님을 선택해주세요.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">시작 시간</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={startHour} 
                onChange={e => setStartHour(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              >
                <option value="">시</option>
                {HOUR_OPTIONS.map(h => <option key={`start-hour-${h}`} value={h}>{h}시</option>)}
              </select>
              <select 
                value={startMinute} 
                onChange={e => setStartMinute(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              >
                <option value="">분</option>
                {MINUTE_OPTIONS.map(m => <option key={`start-minute-${m}`} value={m}>{m}분</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">종료 시간</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={endHour} 
                onChange={e => setEndHour(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              >
                <option value="">시</option>
                {HOUR_OPTIONS.map(h => <option key={`end-hour-${h}`} value={h}>{h}시</option>)}
              </select>
              <select 
                value={endMinute} 
                onChange={e => setEndMinute(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                required
              >
                <option value="">분</option>
                {MINUTE_OPTIONS.map(m => <option key={`end-minute-${m}`} value={m}>{m}분</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="details" className="block text-sm font-medium text-gray-700">상세 내용 (선택)</label>
        <textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder={getDetailsPlaceholder()}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
         <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {itemToEdit ? '수정 완료' : (type === 'NOTICE' ? '작성 완료' : '요청하기')}
        </button>
      </div>
    </form>
  );
};