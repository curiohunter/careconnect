import React, { useState } from 'react';
import { SpecialScheduleItem, UserType } from '../types'; // Added UserType
import { generateTimeOptions } from '../constants';

const TIME_OPTIONS = generateTimeOptions(10);

interface AddSpecialScheduleItemFormProps {
  type: 'VACATION' | 'OVERTIME_REQUEST' | 'NOTICE';
  currentUserType: UserType; // To set creatorUserType
  onSubmit: (item: Omit<SpecialScheduleItem, 'id'>) => void;
  onClose: () => void;
}

export const AddSpecialScheduleItemForm: React.FC<AddSpecialScheduleItemFormProps> = ({ type, currentUserType, onSubmit, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

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
      case 'VACATION': return '상세 내용 (예: O월 O일 ~ O월 O일)';
      case 'OVERTIME_REQUEST': return '상세 내용 (예: O시 ~ O시 연장 근무 필요)';
      case 'NOTICE': return '상세 내용';
      default: return '상세 내용';
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!date || !title) {
        alert('날짜와 제목은 필수입니다.');
        return;
    }
    if(type === 'OVERTIME_REQUEST' && (!startTime || !endTime)) {
        alert('연장 근무 요청 시 시작 시간과 종료 시간은 필수입니다.');
        return;
    }

    const itemData: Omit<SpecialScheduleItem, 'id'> = {
      date,
      type,
      title,
      details,
      creatorUserType: currentUserType,
    };

    if (type === 'OVERTIME_REQUEST') {
      itemData.startTime = startTime;
      itemData.endTime = endTime;
      itemData.isApproved = false; // Default to not approved for overtime
    }
    if (type === 'NOTICE') {
        itemData.isRead = false; // Default new notices to unread
    }
    
    onSubmit(itemData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      {type === 'OVERTIME_REQUEST' && (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">시작 시간</label>
                <select 
                    id="startTime" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    required
                >
                    <option value="">선택</option>
                    {TIME_OPTIONS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">종료 시간</label>
                 <select 
                    id="endTime" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    required
                >
                    <option value="">선택</option>
                    {TIME_OPTIONS.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                </select>
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
          {type === 'NOTICE' ? '작성 완료' : '요청하기'}
        </button>
      </div>
    </form>
  );
};