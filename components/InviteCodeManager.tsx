import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { InviteCodeService, ConnectionService } from '../services/authService';
import { CopyIcon } from './icons/CopyIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import toast from 'react-hot-toast';

interface InviteCodeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteCodeManager: React.FC<InviteCodeManagerProps> = ({ isOpen, onClose }) => {
  const { userProfile, user, connection, connections, refreshConnection } = useAuth();
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [codeStatus, setCodeStatus] = useState<{ isUsed: boolean, isExpired: boolean } | null>(null);

  useEffect(() => {
    if (userProfile?.inviteCode) {
      setInviteCode(userProfile.inviteCode);
      // 초대코드 상태 확인
      checkCodeStatus(userProfile.inviteCode);
    }
  }, [userProfile]);

  // 초대코드 상태 확인
  const checkCodeStatus = async (code: string) => {
    try {
      const status = await InviteCodeService.checkInviteCodeStatus(code);
      setCodeStatus({ isUsed: status.isUsed, isExpired: status.isExpired });
    } catch (error) {
      console.error('초대코드 상태 확인 오류:', error);
    }
  };

  // 초대 코드 생성
  const handleGenerateCode = async () => {
    if (!user?.uid || !userProfile?.userType) return;
    
    try {
      setGenerating(true);
      const newCode = await InviteCodeService.generateInviteCode(user.uid, userProfile.userType);
      setInviteCode(newCode);
      setCodeStatus({ isUsed: false, isExpired: false }); // 새 코드는 사용되지 않음
      toast.success('새로운 초대 코드가 생성되었습니다!');
    } catch (error) {
      console.error('초대 코드 생성 오류:', error);
      toast.error('초대 코드 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 연결 해제
  const handleDisconnect = async () => {
    if (!connection || !user?.uid) return;
    
    const confirmMessage = '연결을 해제하시겠습니까?\n\n주의: 연결을 해제하면 현재 공유 중인 모든 정보에 대한 접근이 중단됩니다.';
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setDisconnecting(true);
      
      const otherUserId = connection.parentId === user.uid ? connection.careProviderId : connection.parentId;
      await ConnectionService.disconnectUsers(connection.id, user.uid, otherUserId);
      
      toast.success('연결이 해제되었습니다.');
      
      // 연결 정보 새로고침
      await refreshConnection();
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('연결 해제 오류:', error);
      toast.error('연결 해제에 실패했습니다.');
    } finally {
      setDisconnecting(false);
    }
  };

  // 초대 코드 복사
  const handleCopyCode = async () => {
    if (!inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast.success('초대 코드가 복사되었습니다!');
    } catch (error) {
      // 복사 실패 시 대체 방법
      const textArea = document.createElement('textarea');
      textArea.value = inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('초대 코드가 복사되었습니다!');
    }
  };

  // 초대 코드 사용
  const handleUseCode = async () => {
    if (!inputCode.trim() || !user?.uid) {
      toast.error('초대 코드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const result = await InviteCodeService.useInviteCode(inputCode.trim().toUpperCase(), user.uid);
      
      if (result.success) {
        toast.success('연결이 완료되었습니다!');
        setInputCode('');
        onClose();
        // 연결 정보 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error('유효하지 않거나 만료된 초대 코드입니다.');
      }
    } catch (error) {
      console.error('초대 코드 사용 오류:', error);
      toast.error('초대 코드 사용에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">초대 코드 관리</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 연결 상태 표시 */}
        {connections.length > 0 ? (
          <div className="mb-6 space-y-3">
            <h4 className="text-md font-medium">현재 연결 목록</h4>
            {connections.map((conn, index) => (
              <div key={conn.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        연결 {index + 1}
                      </p>
                      <p className="text-sm text-green-600">
                        {userProfile?.userType === 'PARENT' ? 
                          `돌봄 선생님: ${conn.careProviderProfile.name}` : 
                          `부모: ${conn.parentProfile.name}`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect()}
                    disabled={disconnecting}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {disconnecting ? '해제 중...' : '연결 해제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-yellow-800">연결 대기 중</p>
                <p className="text-sm text-yellow-600">
                  아직 상대방과 연결되지 않았습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* 내 초대 코드 생성/공유 */}
          <div>
            <h4 className="text-md font-medium mb-3">
              {connections.length > 0 ? '새 초대 코드 생성' : '내 초대 코드'}
            </h4>
            {inviteCode && !codeStatus?.isUsed ? (
              <div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 border rounded-md font-mono text-lg tracking-wide text-center bg-gray-50">
                    {inviteCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 text-white rounded-md bg-primary hover:bg-blue-700"
                    title="복사"
                  >
                    <CopyIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generating}
                    className="p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    title="새로 생성"
                  >
                    <RefreshIcon className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {codeStatus?.isExpired && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <p className="text-red-800 font-medium">❌ 이 코드는 만료되었습니다</p>
                    <p className="text-red-600">새로운 코드를 생성하세요.</p>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className={`w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {generating ? '생성 중...' : '초대 코드 생성'}
              </button>
            )}
            
            <p className="mt-2 text-sm text-gray-500">
              {connections.length > 0 ?
                `새로운 ${userProfile?.userType === 'PARENT' ? '돌봄 선생님' : '부모'}과 연결하기 위한 초대 코드를 생성하세요.` :
                codeStatus?.isUsed ? 
                  '새로운 코드를 생성하여 연결하세요.' :
                  `이 코드를 ${userProfile?.userType === 'PARENT' ? '돌봄 선생님' : '부모'}에게 공유하세요.`
              }
            </p>
          </div>

          {/* 초대 코드 입력 - 다중 연결 지원 */}
          <div>
            <h4 className="text-md font-medium mb-3">
              {connections.length > 0 ? '새 연결 추가' : '초대 코드 입력'}
            </h4>
            <div className="space-y-3">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="초대 코드 입력 (예: ABC123)"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono tracking-wide text-center uppercase focus:outline-none focus:ring-primary focus:border-primary"
              />
              <button
                onClick={handleUseCode}
                disabled={loading || !inputCode.trim()}
                className={`w-full px-4 py-2 bg-secondary text-white rounded-md hover:bg-green-600 ${(loading || !inputCode.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? '연결 중...' : connections.length > 0 ? '새 연결 추가' : '코드 사용하여 연결'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {connections.length > 0 
                ? `추가로 연결할 ${userProfile?.userType === 'PARENT' ? '돌봄 선생님' : '부모'}의 초대 코드를 입력하세요.`
                : `${userProfile?.userType === 'PARENT' ? '돌봄 선생님' : '부모'}의 초대 코드를 입력하세요.`
              }
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteCodeManager;
