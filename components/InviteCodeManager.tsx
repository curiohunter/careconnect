import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { InviteCodeService } from '../services/authService';
import { CopyIcon } from './icons/CopyIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import toast from 'react-hot-toast';

interface InviteCodeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteCodeManager: React.FC<InviteCodeManagerProps> = ({ isOpen, onClose }) => {
  const { userProfile, user, updateProfile, connection } = useAuth();
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (userProfile?.inviteCode) {
      setInviteCode(userProfile.inviteCode);
    }
  }, [userProfile]);

  // 초대 코드 생성
  const handleGenerateCode = async () => {
    if (!user?.uid || !userProfile?.userType) return;
    
    try {
      setGenerating(true);
      const newCode = await InviteCodeService.generateInviteCode(user.uid, userProfile.userType);
      setInviteCode(newCode);
      toast.success('초대 코드가 생성되었습니다!');
    } catch (error) {
      console.error('초대 코드 생성 오류:', error);
      toast.error('초대 코드 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
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
        {connection ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <div>
                <p className="text-sm font-medium text-green-800">연결됨</p>
                <p className="text-sm text-green-600">
                  {userProfile?.userType === 'PARENT' ? 
                    `돌봄 선생님: ${connection.careProviderProfile.name}` : 
                    `부모: ${connection.parentProfile.name}`
                  }
                </p>
              </div>
            </div>
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
            <h4 className="text-md font-medium mb-3">내 초대 코드</h4>
            {inviteCode ? (
              <div className="flex items-center space-x-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border rounded-md font-mono text-lg tracking-wide text-center">
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-2 bg-primary text-white rounded-md hover:bg-blue-700"
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
              이 코드를 {userProfile?.userType === 'PARENT' ? '돌봄 선생님' : '부모'}에게 공유하세요.
            </p>
          </div>

          {/* 초대 코드 입력 */}
          {!connection && (
            <div>
              <h4 className="text-md font-medium mb-3">초대 코드 입력</h4>
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
                  {loading ? '연결 중...' : '코드 사용하여 연결'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {userProfile?.userType === 'PARENT' ? '돌봄 선생님' : '부모'}의 초대 코드를 입력하세요.
              </p>
            </div>
          )}
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
