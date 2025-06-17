import React, { useState, useEffect } from 'react';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserType, Permission, CareProviderAssignment } from '../types';

interface ProviderSwitcherProps {
  providers: Array<{
    id: string;
    name: string;
    isActive: boolean;
    permissions: Permission[];
    assignmentType?: 'PRIMARY' | 'SECONDARY' | 'TEMPORARY';
    workStatus?: 'AVAILABLE' | 'WORKING' | 'OFF' | 'ON_LEAVE';
  }>;
  activeProviderId: string | null;
  onProviderChange: (providerId: string) => void;
  showAllOption?: boolean;
}

export const ProviderSwitcher: React.FC<ProviderSwitcherProps> = ({
  providers,
  activeProviderId,
  onProviderChange,
  showAllOption = true
}) => {
  const [selected, setSelected] = useState<string | null>(activeProviderId);

  useEffect(() => {
    setSelected(activeProviderId);
  }, [activeProviderId]);

  const handleProviderChange = (providerId: string) => {
    setSelected(providerId);
    onProviderChange(providerId);
  };

  // 권한 표시용 색상 매핑
  const permissionColors: Record<Permission, string> = {
    [Permission.VIEW]: 'bg-gray-200 text-gray-700',
    [Permission.EDIT]: 'bg-blue-100 text-blue-700',
    [Permission.ADMIN]: 'bg-purple-100 text-purple-700',
    [Permission.SCHEDULE_MANAGE]: 'bg-green-100 text-green-700',
    [Permission.MEDICATION_MANAGE]: 'bg-red-100 text-red-700',
    [Permission.MEAL_MANAGE]: 'bg-yellow-100 text-yellow-700',
    [Permission.HANDOVER_MANAGE]: 'bg-indigo-100 text-indigo-700',
  };

  // 할당 유형별 아이콘/색상
  const assignmentStyles: Record<string, string> = {
    'PRIMARY': 'border-green-500 bg-green-50',
    'SECONDARY': 'border-blue-500 bg-blue-50',
    'TEMPORARY': 'border-amber-500 bg-amber-50',
  };

  // 근무 상태별 표시
  const workStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
    'AVAILABLE': { bg: 'bg-green-100', text: 'text-green-800', label: '근무 가능' },
    'WORKING': { bg: 'bg-blue-100', text: 'text-blue-800', label: '근무 중' },
    'OFF': { bg: 'bg-gray-100', text: 'text-gray-800', label: '휴무' },
    'ON_LEAVE': { bg: 'bg-amber-100', text: 'text-amber-800', label: '휴가 중' },
  };

  // 권한 표시 레이블
  const permissionLabels: Record<Permission, string> = {
    [Permission.VIEW]: '조회',
    [Permission.EDIT]: '수정',
    [Permission.ADMIN]: '관리자',
    [Permission.SCHEDULE_MANAGE]: '스케줄',
    [Permission.MEDICATION_MANAGE]: '투약',
    [Permission.MEAL_MANAGE]: '식단',
    [Permission.HANDOVER_MANAGE]: '인수인계',
  };

  return (
    <div className="w-full">
      <div className="flex overflow-x-auto pb-3 scrollbar-hide -mx-2 px-2">
        <div className="flex space-x-2">
          {/* 전체 현황 탭 */}
          {showAllOption && (
            <button
              onClick={() => handleProviderChange('all')}
              className={`flex-shrink-0 flex flex-col items-center py-2 px-4 rounded-lg border-2 ${
                selected === 'all' ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'
              } transition-colors`}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <UserCircleIcon className="w-8 h-8 text-primary" />
              </div>
              <span className="text-sm font-medium">전체 현황</span>
              {selected === 'all' && (
                <CheckCircleIcon className="w-5 h-5 text-primary mt-1" />
              )}
            </button>
          )}

          {/* 선생님 탭들 */}
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              className={`flex-shrink-0 flex flex-col items-center py-2 px-4 rounded-lg border-2 ${
                selected === provider.id
                  ? 'border-primary bg-blue-50'
                  : provider.assignmentType
                  ? assignmentStyles[provider.assignmentType]
                  : 'border-gray-200 bg-white'
              } transition-colors`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <UserCircleIcon className="w-8 h-8 text-gray-600" />
                </div>
                
                {/* 근무 상태 배지 */}
                {provider.workStatus && (
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${workStatusStyles[provider.workStatus].bg} flex items-center justify-center`}>
                    <div className={`w-3 h-3 rounded-full ${
                      provider.workStatus === 'AVAILABLE' || provider.workStatus === 'WORKING' 
                        ? 'bg-green-500' 
                        : provider.workStatus === 'OFF' 
                        ? 'bg-gray-500' 
                        : 'bg-amber-500'
                    }`}></div>
                  </div>
                )}
              </div>
              
              <span className="text-sm font-medium">{provider.name}</span>
              
              {/* 할당 유형 표시 */}
              {provider.assignmentType && (
                <span className={`text-xs ${
                  provider.assignmentType === 'PRIMARY' 
                    ? 'text-green-700' 
                    : provider.assignmentType === 'SECONDARY' 
                    ? 'text-blue-700' 
                    : 'text-amber-700'
                } mt-1`}>
                  {provider.assignmentType === 'PRIMARY' 
                    ? '주 담당' 
                    : provider.assignmentType === 'SECONDARY' 
                    ? '부 담당' 
                    : '임시 담당'}
                </span>
              )}
              
              {/* 권한 배지 표시 */}
              {provider.permissions && provider.permissions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {provider.permissions.slice(0, 2).map((permission) => (
                    <span 
                      key={permission}
                      className={`inline-flex text-xs px-1.5 py-0.5 rounded-full ${permissionColors[permission]}`}
                    >
                      {permissionLabels[permission]}
                    </span>
                  ))}
                  
                  {/* 추가 권한이 있는 경우 +N으로 표시 */}
                  {provider.permissions.length > 2 && (
                    <span className="inline-flex text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      +{provider.permissions.length - 2}
                    </span>
                  )}
                </div>
              )}
              
              {selected === provider.id && (
                <CheckCircleIcon className="w-5 h-5 text-primary mt-1" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* 선택된 담당자 정보 상세 표시 (선택적) */}
      {selected !== 'all' && selected && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">
                {providers.find(p => p.id === selected)?.name} 선생님
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {providers.find(p => p.id === selected)?.workStatus && 
                  workStatusStyles[providers.find(p => p.id === selected)?.workStatus || 'AVAILABLE'].label}
              </p>
            </div>
            
            {/* 모든 권한 표시 */}
            <div className="flex flex-wrap gap-1 justify-end">
              {providers.find(p => p.id === selected)?.permissions.map((permission) => (
                <span 
                  key={permission}
                  className={`inline-flex text-xs px-2 py-1 rounded-full ${permissionColors[permission]}`}
                >
                  {permissionLabels[permission]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSwitcher;