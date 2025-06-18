import React from 'react';
import { SpecialScheduleItem, UserType } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClockIcon } from './icons/ClockIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ActiveModal } from './MiddleSection';
import { useAuth } from '../hooks/useAuth';

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
  const { user, userProfile, connection, connections } = useAuth();

  const today = new Date();
  today.setHours(0,0,0,0); // For date comparison

  // 작성자 이름 가져오기 함수
  const getAuthorName = (item: SpecialScheduleItem): string => {
    // 본인이 작성한 경우
    if (item.createdBy === user?.uid) {
      return userProfile?.name || '본인';
    }
    
    // 연결된 상대방이 작성한 경우
    if (connection) {
      if (userType === UserType.PARENT) {
        // 부모인 경우 돌봄선생님 이름 표시
        return connection.careProviderProfile?.name || '돌봄선생님';
      } else {
        // 돌봄선생님인 경우 부모 이름 표시
        return connection.parentProfile?.name || '부모님';
      }
    }
    
    // 기본값
    return item.creatorUserType === UserType.PARENT ? '부모님' : '돌봄선생님';
  };

  // 담당자 정보 가져오기 함수 (연장근무용)
  const getAssigneeInfo = (item: SpecialScheduleItem): string | null => {
    if (item.type !== 'OVERTIME_REQUEST' || !item.targetUserId) {
      return null;
    }
    
    // 다중 연결에서 targetUserId에 해당하는 사용자 찾기
    if (connections && connections.length > 0) {
      for (const conn of connections) {
        if (conn.careProviderId === item.targetUserId) {
          return conn.careProviderProfile?.name || '담당 선생님';
        }
      }
    }
    
    // 단일 연결에서 찾기 (하위 호환성)
    if (connection?.careProviderId === item.targetUserId) {
      return connection.careProviderProfile?.name || '담당 선생님';
    }
    
    return '담당 선생님';
  };

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
    // 날짜 기반 필터링
    const targetDate = item.type === 'VACATION' && item.endDate 
      ? new Date(item.endDate) 
      : new Date(item.date);
    
    targetDate.setHours(0,0,0,0);
    
    // 해당 날짜가 지나면 (다음날부터) 숨김
    const isDateValid = targetDate >= today;
    
    // 권한별 필터링 (targetUserId 기반 개선)
    if (userType === UserType.PARENT) {
      // 부모는 모든 항목 표시
      return isDateValid;
    } else if (userType === UserType.CARE_PROVIDER) {
      // 돌봄선생님 필터링 로직 개선
      const isMyItem = item.createdBy === user?.uid; // 내가 작성한 항목
      const isAssignedToMe = item.targetUserId === user?.uid; // 나에게 할당된 항목 (연장근무)
      const isFromParent = item.creatorUserType === UserType.PARENT; // 부모가 작성한 항목
      
      // 안내사항은 항상 표시 (부모가 작성)
      if (item.type === 'NOTICE') {
        return isDateValid && isFromParent;
      }
      
      // 연장근무: 나에게 할당되었거나 부모가 작성한 것 (타겟이 없는 경우)
      if (item.type === 'OVERTIME_REQUEST') {
        // targetUserId가 지정된 경우: 나에게 할당된 것만 표시
        if (item.targetUserId) {
          return isDateValid && isAssignedToMe;
        }
        // targetUserId가 없는 경우: 부모가 작성한 모든 연장근무 요청 표시
        return isDateValid && isFromParent;
      }
      
      // 휴가: 내가 작성한 것만
      if (item.type === 'VACATION') {
        return isDateValid && isMyItem;
      }
      
      // 기타 항목: 기존 로직 유지
      return isDateValid && (isMyItem || isFromParent);
    }
    
    return isDateValid;
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
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-800">
                          {item.type === 'OVERTIME_REQUEST' ? '연장근무' : item.type === 'VACATION' ? '휴가' : '안내'}: {item.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                            {getAuthorName(item)}
                          </span>
                          {/* 담당자 정보 표시 (연장근무만) */}
                          {getAssigneeInfo(item) && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              담당: {getAssigneeInfo(item)}
                            </span>
                          )}
                        </div>
                      </div>
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