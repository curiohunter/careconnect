import React from 'react';
import { SpecialScheduleItem, UserType } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClockIcon } from './icons/ClockIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon'; 
import { ActiveModal } from './MiddleSection'; // Import ActiveModal type for onOpenModal

interface BottomSectionProps {
  userType: UserType;
  onOpenModal: (type: Extract<ActiveModal, 'overtime' | 'vacation' | 'notice'>) => void; // Use Extract for specific types
  specialScheduleItems: SpecialScheduleItem[];
  onMarkNoticeAsRead: (itemId: string) => void;
}

export const BottomSection: React.FC<BottomSectionProps> = ({ 
    userType,
    onOpenModal,
    specialScheduleItems,
    onMarkNoticeAsRead
}) => {

  const today = new Date();
  today.setHours(0,0,0,0); // For date comparison

  const activeItems = specialScheduleItems.filter(item => {
    if (item.type === 'NOTICE') {
      const itemDate = new Date(item.date);
      itemDate.setHours(0,0,0,0); 
      const isPast = itemDate < today;
      const isRecipient = item.creatorUserType !== userType;
      
      if (isPast && (item.isRead || !isRecipient)) { 
          return false;
      }
    }
    return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

  return (
    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading" className="text-xl font-semibold text-primary mb-4">근무 및 안내 관리</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => onOpenModal('overtime')}
          className="flex flex-col items-center justify-center p-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md h-32"
        >
          <ClockIcon className="w-8 h-8 mb-2" />
          <span className="font-medium">연장 근무 요청</span>
        </button>
        <button
          onClick={() => onOpenModal('vacation')}
          className="flex flex-col items-center justify-center p-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md h-32"
        >
          <CalendarIcon className="w-8 h-8 mb-2" />
          <span className="font-medium">휴가/휴무 신청</span>
        </button>
        <button
          onClick={() => onOpenModal('notice')}
          className="flex flex-col items-center justify-center p-6 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors shadow-md h-32"
        >
          <InformationCircleIcon className="w-8 h-8 mb-2" />
          <span className="font-medium">안내사항 전달</span>
        </button>
      </div>
      
      {activeItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">등록된 요청/안내사항</h3>
          <ul className="space-y-3">
            {activeItems.map(item => {
              const itemDate = new Date(item.date);
              const isPastNotice = item.type === 'NOTICE' && itemDate < today && itemDate.toDateString() !== today.toDateString();
              const canMarkAsRead = item.type === 'NOTICE' && item.creatorUserType !== userType && !item.isRead;

              return (
              <li key={item.id} className={`p-4 bg-white rounded-md border border-gray-200 shadow-sm ${isPastNotice && item.isRead ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-medium text-gray-800">
                        {item.type === 'OVERTIME_REQUEST' ? '연장근무' : item.type === 'VACATION' ? '휴가' : '안내'}: {item.title}
                        </p>
                        <p className="text-sm text-gray-600">
                            날짜: {itemDate.toLocaleDateString()}
                            {item.type === 'OVERTIME_REQUEST' && item.startTime && item.endTime && (
                                <span className="ml-2">({item.startTime} ~ {item.endTime})</span>
                            )}
                        </p>
                    </div>
                    {item.type === 'NOTICE' && item.isRead && item.creatorUserType !== userType && (
                         <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            읽음
                        </span>
                    )}
                </div>
                {item.details && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{item.details}</p>}
                
                {item.type === 'OVERTIME_REQUEST' && item.isApproved !== undefined && (
                    <p className={`mt-1 text-sm font-semibold ${item.isApproved ? 'text-green-600' : 'text-red-600'}`}>
                        {item.isApproved ? '승인됨' : (item.isApproved === false ? '반려됨' : '승인 대기중')}
                    </p>
                )}

                {canMarkAsRead && (
                    <button
                        onClick={() => onMarkNoticeAsRead(item.id)}
                        className="mt-2 text-sm text-primary hover:underline focus:outline-none"
                    >
                        읽음으로 표시
                    </button>
                )}
              </li>
            )})}
          </ul>
        </div>
      )}
      {activeItems.length === 0 && <p className="text-sm text-gray-500 text-center">현재 등록된 특별 요청이나 안내사항이 없습니다.</p>}
    </section>
  );
};