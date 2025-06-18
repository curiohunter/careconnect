import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Connection } from '../types';

interface ConnectionSelectorProps {
  className?: string;
}

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({ className = '' }) => {
  const { connections, activeConnectionId, switchConnection, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  console.log('🔍 ConnectionSelector 렌더링:', { 
    connectionsLength: connections.length, 
    activeConnectionId, 
    userProfile: userProfile?.userType 
  });

  // 연결이 없으면 "연결 없음" 표시
  if (connections.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="px-3 py-1.5 text-xs text-white bg-red-500/20 border border-red-500/40 rounded-lg">
          연결 없음
        </div>
      </div>
    );
  }

  const handleConnectionSwitch = async (connectionId: string) => {
    if (connectionId === activeConnectionId || switching) return;
    
    setSwitching(true);
    try {
      await switchConnection(connectionId);
      setIsOpen(false);
    } catch (error) {
      console.error('연결 전환 오류:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getConnectionDisplayName = (connection: Connection) => {
    if (!connection) return '알 수 없음';
    
    // 현재 사용자가 부모인지 돌봄선생님인지 확인
    const isParent = userProfile?.userType === 'PARENT';
    
    if (isParent) {
      // 부모인 경우: 돌봄선생님 이름 표시
      return connection.careProviderProfile?.name || '돌봄선생님';
    } else {
      // 돌봄선생님인 경우: 부모 이름과 아이 정보 표시
      const parentName = connection.parentProfile?.name || '부모님';
      const childrenInfo = connection.children && connection.children.length > 0 
        ? ` (${connection.children.map(child => child.name).join(', ')})`
        : '';
      return `${parentName}${childrenInfo}`;
    }
  };

  const getConnectionDetailInfo = (connection: Connection) => {
    if (!connection) return '';
    
    const isParent = userProfile?.userType === 'PARENT';
    
    if (isParent) {
      // 부모인 경우: 연락처 정보 표시
      const contact = connection.careProviderProfile?.contact;
      return contact ? `연락처: ${contact}` : '연락처 없음';
    } else {
      // 돌봄선생님인 경우: 아이 나이와 연락처 정보 표시
      const children = connection.children || [];
      const contact = connection.parentProfile?.contact;
      
      if (children.length > 0) {
        const childAges = children.map(child => `${child.name}(${child.age}세)`).join(', ');
        return contact ? `${childAges} | ${contact}` : childAges;
      }
      
      return contact ? `연락처: ${contact}` : '정보 없음';
    }
  };

  const activeConnection = connections.find(conn => conn.id === activeConnectionId);

  return (
    <div className={`relative ${className}`}>
      {/* 통합 버튼 - 항상 표시 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm text-white bg-gradient-to-r from-white/20 to-white/10 border border-white/40 rounded-lg hover:from-white/30 hover:to-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 shadow-sm backdrop-blur-sm transition-all duration-200"
      >
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 bg-white/80 rounded-full"></div>
          <span className="max-w-16 sm:max-w-32 truncate font-medium">
            {switching ? '전환중' : (activeConnection ? activeConnection.parentProfile?.name || '연결' : `${connections.length}개 연결`)}
          </span>
        </div>
        <svg className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 모바일용 예쁜 드롭다운 메뉴 */}
          <div className="sm:hidden absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="py-3">
              <div className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50/80 border-b border-gray-200">
                가족 연결 목록
              </div>
              {connections.map((connection, index) => (
                <button
                  key={connection.id}
                  onClick={() => handleConnectionSwitch(connection.id)}
                  disabled={switching}
                  className={`w-full px-4 py-3 text-left transition-all duration-200 disabled:opacity-50 ${
                    connection.id === activeConnectionId
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border-l-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${connection.id === activeConnectionId ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <div className="text-sm font-semibold truncate">
                          {getConnectionDisplayName(connection)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 ml-4 truncate">
                        {getConnectionDetailInfo(connection)}
                      </div>
                    </div>
                    {connection.id === activeConnectionId && (
                      <div className="flex-shrink-0 ml-2">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 데스크톱용 예쁜 드롭다운 메뉴 */}
          <div className="hidden sm:block absolute right-0 z-20 mt-2 w-96 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="py-3">
              <div className="px-5 py-3 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                🏠 가족 연결 목록
              </div>
              {connections.map((connection, index) => (
                <button
                  key={connection.id}
                  onClick={() => handleConnectionSwitch(connection.id)}
                  disabled={switching}
                  className={`w-full px-5 py-4 text-left transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] ${
                    connection.id === activeConnectionId
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border-l-4 border-blue-500 shadow-sm'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${connection.id === activeConnectionId ? 'bg-blue-500 shadow-lg' : 'bg-gray-300'}`}></div>
                        <div className="text-sm font-semibold truncate">
                          {getConnectionDisplayName(connection)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1.5 ml-6">
                        {getConnectionDetailInfo(connection)}
                      </div>
                    </div>
                    {connection.id === activeConnectionId && (
                      <div className="flex-shrink-0 ml-3">
                        <div className="bg-blue-500 rounded-full p-1">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConnectionSelector;