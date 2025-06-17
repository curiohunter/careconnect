import React from 'react';
import { SpecialScheduleItem, UserType } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClockIcon } from './icons/ClockIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ActiveModal } from './MiddleSection';

interface BottomSectionProps {
  userType: UserType;
  onOpenModal: (type: Extract<ActiveModal, 'overtime' | 'vacation' | 'notice'>) => void;
  specialScheduleItems: SpecialScheduleItem[];
  onEditItem: (item: SpecialScheduleItem) => void;
  onDeleteItem: (itemId: string) => void;
}

export const BottomSection: React.FC<BottomSectionProps> = ({ 
    userType,
    onOpenModal,
    specialScheduleItems,
    onEditItem,
    onDeleteItem
}) => {

  const today = new Date();
  today.setHours(0,0,0,0); // For date comparison

  // 우선순위 정의: 안내(1), 연장근무(2), 휴가(3)
  const getTypePriority = (type: string) => {
    switch(type) {
      case 'NOTICE': return 1; // 안내
      case 'OVERTIME_REQUEST': return 2; // 연장근무
      case 'VACATION': return 3; // 휴가
      default: return 4;
    }
  };

  const safeSpecialScheduleItems = Array.isArray(specialScheduleItems) ? specialScheduleItems : [];
  const activeItems = safeSpecialScheduleItems.filter(item => {
    // 휴가는 종료일을 기준으로, 나머지는 날짜를 기준으로 필터링
    const targetDate = item.type === 'VACATION' && item.endDate 
      ? new Date(item.endDate) 
      : new Date(item.date);
    
    targetDate.setHours(0,0,0,0);
    
    // 해당 날짜가 지나면 (다음날부터) 숨김
    return targetDate >= today;
  }).sort((a, b) => {
    // 1. 타입에 따른 우선순위 정렬
    const typePriorityA = getTypePriority(a.type);
    const typePriorityB = getTypePriority(b.type);
    
    if (typePriorityA !== typePriorityB) {
      return typePriorityA - typePriorityB;
    }
    
    // 2. 같은 타입이면 날짜 역순으로 정렬 (최신 날짜 먼저)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

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
              
              // 타입에 따른 배경 색상 설정
              const getCardBgColor = () => {
                switch(item.type) {
                  case 'OVERTIME_REQUEST': return 'bg-blue-50 border-blue-200'; // 연장근무 - 파란색
                  case 'VACATION': return 'bg-green-50 border-green-200'; // 휴가 - 초록색
                  case 'NOTICE': return 'bg-yellow-50 border-yellow-200'; // 안내 - 노란색
                  default: return 'bg-white border-gray-200';
                }
              };

              return (
                <li key={item.id} className={`p-4 rounded-md border shadow-sm ${getCardBgColor()}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {item.type === 'OVERTIME_REQUEST' ? '연장근무' : item.type === 'VACATION' ? '휴가' : '안내'}: {item.title}
                      </p>
                      <p className="text-sm text-gray-600">
                          {/* 휴가 기간 표시 */}
                          {item.type === 'VACATION' && item.startDate && item.endDate ? (
                              <span>기간: {new Date(item.startDate).toLocaleDateString()} ~ {new Date(item.endDate).toLocaleDateString()}</span>
                          ) : (
                              <span>날짜: {itemDate.toLocaleDateString()}</span>
                          )}
                          
                          {item.type === 'OVERTIME_REQUEST' && item.startTime && item.endTime && (
                              <span className="ml-2">({item.startTime} ~ {item.endTime})</span>
                          )}
                          {item.type === 'VACATION' && item.targetUserType && (
                              <span className="ml-2">({item.targetUserType === UserType.PARENT ? '부모' : '돌봄선생님'} 휴가)</span>
                          )}
                      </p>
                      
                      {item.details && <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{item.details}</p>}
                    </div>
                    
                    {/* 수정/삭제 버튼 */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => onEditItem(item)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('정말로 삭제하시겠습니까?')) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {activeItems.length === 0 && <p className="text-sm text-gray-500 text-center">현재 등록된 특별 요청이나 안내사항이 없습니다.</p>}
    </section>
  );
};