import React, { useState } from 'react';
import { SpecialScheduleItem, UserType } from '../types';

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
  for (let minute = 0; minute < 60; minute += 10) {
    minutes.push(minute.toString().padStart(2, '0'));
  }
  return minutes;
};

const HOUR_OPTIONS = generateHourOptions();
const MINUTE_OPTIONS = generateMinuteOptions();

interface AddSpecialScheduleItemFormProps {
  type: 'VACATION' | 'OVERTIME_REQUEST' | 'NOTICE';
  currentUserType: UserType;
  itemToEdit?: SpecialScheduleItem; // 수정할 아이템
  onSubmit: (item: Omit<SpecialScheduleItem, 'id'>) => void;
  onClose: () => void;
}

export const AddSpecialScheduleItemForm: React.FC<AddSpecialScheduleItemFormProps> = ({ type, currentUserType, itemToEdit, onSubmit, onClose }) => {
  const [date, setDate] = useState(itemToEdit?.date || new Date().toISOString().split('T')[0]); 
  const [startDate, setStartDate] = useState(itemToEdit?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(itemToEdit?.endDate || new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState(itemToEdit?.title || '');
  const [details, setDetails] = useState(itemToEdit?.details || '');
  const [startHour, setStartHour] = useState(itemToEdit?.startTime?.split(':')[0] || '');
  const [startMinute, setStartMinute] = useState(itemToEdit?.startTime?.split(':')[1] || '');
  const [endHour, setEndHour] = useState(itemToEdit?.endTime?.split(':')[0] || '');
  const [endMinute, setEndMinute] = useState(itemToEdit?.endTime?.split(':')[1] || '');
  const [targetUserType, setTargetUserType] = useState<UserType>(itemToEdit?.targetUserType || currentUserType); // 휴가 대상자

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
    if (type === 'OVERTIME_REQUEST' && (!startHour || !startMinute || !endHour || !endMinute)) {
        alert('연장 근무 요청 시 시작 시간과 종료 시간은 필수입니다.');
        return;
    }

    const itemData: Omit<SpecialScheduleItem, 'id'> = {
      date: type === 'VACATION' ? endDate : date, // 휴가는 종료일을 기본 날짜로
      type,
      title,
      details,
      creatorUserType: currentUserType,
    };

    if (type === 'VACATION') {
      itemData.targetUserType = targetUserType;
      itemData.startDate = startDate;
      itemData.endDate = endDate;
    }

    if (type === 'OVERTIME_REQUEST') {
      itemData.startTime = `${startHour}:${startMinute}`;
      itemData.endTime = `${endHour}:${endMinute}`;
    }
    
    onSubmit(itemData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type !== 'VACATION' && (
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">날짜</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            required
          />
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
        <div>
          <label className="block text-sm font-medium text-gray-700">휴가 대상자</label>
          <div className="mt-2 space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={UserType.PARENT}
                checked={targetUserType === UserType.PARENT}
                onChange={(e) => setTargetUserType(e.target.value as UserType)}
                className="form-radio h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">부모</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={UserType.CARE_PROVIDER}
                checked={targetUserType === UserType.CARE_PROVIDER}
                onChange={(e) => setTargetUserType(e.target.value as UserType)}
                className="form-radio h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">돌봄 선생님</span>
            </label>
          </div>
        </div>
      )}
      
      {type === 'OVERTIME_REQUEST' && (
        <div className="space-y-4">
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