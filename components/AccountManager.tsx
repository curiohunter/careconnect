import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { auth, db } from '../firebase';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Modal } from './Modal';
import { AlertCircleIcon } from './icons/AlertCircleIcon';
import toast from 'react-hot-toast';

interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [password, setPassword] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '계정삭제') {
      toast.error('확인 문구를 정확히 입력해주세요.');
      return;
    }

    if (!user || !userProfile) return;

    try {
      setIsDeleting(true);
      
      // 1. 연결된 데이터 삭제를 위한 배치 작업 시작
      const batch = writeBatch(db);

      // 2. 사용자의 연결 정보 삭제 (연결이 있는 경우에만)
      if (userProfile.connectionId) {
        try {
          // 연결 문서 삭제
          batch.delete(doc(db, 'connections', userProfile.connectionId));

          // 연결과 관련된 모든 하위 데이터 삭제
          // 일정 삭제
          const schedulesQuery = query(
            collection(db, 'schedules'),
            where('connectionId', '==', userProfile.connectionId)
          );
          const schedulesDocs = await getDocs(schedulesQuery);
          schedulesDocs.forEach(doc => batch.delete(doc.ref));

          // 투약 정보 삭제
          const medicationsQuery = query(
            collection(db, 'medications'),
            where('connectionId', '==', userProfile.connectionId)
          );
          const medicationsDocs = await getDocs(medicationsQuery);
          medicationsDocs.forEach(doc => batch.delete(doc.ref));

          // 식사 계획 삭제
          const mealPlansQuery = query(
            collection(db, 'mealPlans'),
            where('connectionId', '==', userProfile.connectionId)
          );
          const mealPlansDocs = await getDocs(mealPlansQuery);
          mealPlansDocs.forEach(doc => batch.delete(doc.ref));

          // 특별 일정 삭제
          const specialSchedulesQuery = query(
            collection(db, 'specialSchedules'),
            where('connectionId', '==', userProfile.connectionId)
          );
          const specialSchedulesDocs = await getDocs(specialSchedulesQuery);
          specialSchedulesDocs.forEach(doc => batch.delete(doc.ref));

          // 인수인계 메모 삭제
          const handoverNotesQuery = query(
            collection(db, 'handoverNotes'),
            where('connectionId', '==', userProfile.connectionId)
          );
          const handoverNotesDocs = await getDocs(handoverNotesQuery);
          handoverNotesDocs.forEach(doc => batch.delete(doc.ref));
        } catch (connectionError: any) {
          console.warn('연결 데이터 삭제 중 오류 (계속 진행):', connectionError);
          // 연결 데이터 삭제 실패해도 계정 삭제는 계속 진행
        }
      }

      // 3. 초대 코드 삭제
      if (userProfile.inviteCode) {
        batch.delete(doc(db, 'inviteCodes', userProfile.inviteCode));
      }

      // 4. 사용자 프로필 삭제
      batch.delete(doc(db, 'users', user.uid));

      // 5. 배치 실행
      await batch.commit();

      // 6. Firebase Auth에서 사용자 삭제
      await deleteUser(user);
      
      toast.success('계정이 삭제되었습니다.');
      navigate('/');
    } catch (error: any) {
      console.error('계정 삭제 오류:', error);
      
      // 재인증이 필요한 경우
      if (error.code === 'auth/requires-recent-login') {
        setNeedsReauth(true);
        toast.error('보안을 위해 비밀번호를 다시 입력해주세요.');
      } else {
        toast.error('계정 삭제에 실패했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReauthAndDelete = async () => {
    if (!password.trim()) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    if (!user || !userProfile) return;

    try {
      setIsDeleting(true);
      
      // 재인증
      const credential = EmailAuthProvider.credential(userProfile.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // 재인증 후 Firebase Auth에서 사용자 삭제
      await deleteUser(user);
      
      toast.success('계정이 완전히 삭제되었습니다.');
      navigate('/');
    } catch (error: any) {
      console.error('재인증 및 삭제 오류:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('비밀번호가 올바르지 않습니다.');
      } else {
        toast.error('계정 삭제에 실패했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!userProfile) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="계정 관리">
      <div className="space-y-6">
        {/* 계정 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">계정 정보</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">이름:</span>{' '}
              <span className="text-gray-900 font-medium">{userProfile.name}</span>
            </div>
            <div>
              <span className="text-gray-600">이메일:</span>{' '}
              <span className="text-gray-900 font-medium">{userProfile.email}</span>
            </div>
            <div>
              <span className="text-gray-600">연락처:</span>{' '}
              <span className="text-gray-900 font-medium">{userProfile.contact}</span>
            </div>
            <div>
              <span className="text-gray-600">계정 유형:</span>{' '}
              <span className="text-gray-900 font-medium">
                {userProfile.userType === 'PARENT' ? '부모' : '돌봄 선생님'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">가입일:</span>{' '}
              <span className="text-gray-900 font-medium">
                {userProfile.createdAt && userProfile.createdAt.toDate ? 
                  userProfile.createdAt.toDate().toLocaleDateString() :
                  userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : '정보 없음'
                }
              </span>
            </div>
          </div>
        </div>


        {/* 계정 삭제 */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-red-600 mb-3">계정 삭제</h3>
          <p className="text-sm text-gray-600 mb-4">
            계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              계정 삭제
            </button>
          ) : needsReauth ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600 font-medium">
                보안을 위해 비밀번호를 다시 입력해주세요.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="비밀번호 입력"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setNeedsReauth(false);
                    setPassword('');
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  onClick={handleReauthAndDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isDeleting || !password.trim()}
                >
                  {isDeleting ? '삭제 중...' : '계정 삭제'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  계정을 삭제하려면 <span className="font-bold text-red-600">"계정삭제"</span>를 입력하세요:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="계정삭제"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={isDeleting || deleteConfirmText !== '계정삭제'}
                >
                  {isDeleting ? '삭제 중...' : '영구 삭제'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AccountManager;