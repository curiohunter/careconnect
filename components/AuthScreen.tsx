import React, { useState, useEffect } from 'react';
import { UserType, UserProfile, ChildInfo, Gender, InstitutionType } from '../types';
import { USER_TYPES, GENDER_OPTIONS, INSTITUTION_TYPE_OPTIONS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import toast from 'react-hot-toast';

interface AuthScreenProps {
  onLogin: (profile: any, children: any[]) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { signInWithGoogle, createProfile, user, userProfile } = useAuth();
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // 로그인된 사용자가 있지만 프로필이 없으니 프로필 설정 화면 표시
  useEffect(() => {
    console.log('🔄 AuthScreen useEffect - user:', !!user, 'userProfile:', !!userProfile);
    if (user && !userProfile) {
      console.log('🏠 프로필 설정 화면 표시');
      setCurrentUser(user);
      setShowSetupForm(true);
      setProfileForm(prev => ({
        ...prev,
        name: user.displayName || ''
      }));
    } else if (user && userProfile) {
      console.log('✅ 사용자 로그인 완료 - Dashboard로 이동 예정');
    } else {
      console.log('🚀 로그인 대기 중');
    }
  }, [user, userProfile]);
  
  // 프로필 설정 폼 상태
  const [profileForm, setProfileForm] = useState({
    name: '',
    contact: '',
    userType: UserType.PARENT as UserType,
    inviteCode: ''
  });

  const [children, setChildren] = useState<Partial<ChildInfo>[]>([{ 
    id: Date.now().toString(), 
    name: '', 
    specialNeeds: '', 
    age: undefined, 
    gender: undefined,
    institutionType: '해당없음',
    institutionName: ''
  }]);

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Google 로그인 처리
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle();
      
      if (result && result.isNewUser) {
        // 신규 사용자의 경우 프로필 설정 화면으로
        setCurrentUser(result.user);
        setShowSetupForm(true);
        setProfileForm(prev => ({
          ...prev,
          name: result.user.displayName || ''
        }));
      } else if (result && !result.isNewUser) {
        // 기존 사용자는 자동으로 대시보드로 이동 (onAuthStateChanged에서 처리)
        console.log('✅ 기존 사용자 로그인 완료');
      }
    } catch (error: any) {
      console.error('Google 로그인 오류:', error);
      
      let errorMessage = '로그인에 실패했습니다.';
      if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = '로그인이 취소되었습니다.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = '로그인 창이 차단되었습니다.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 프로필 설정 완료
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileForm.name || !profileForm.contact || !agreedToTerms) {
      toast.error('모든 필수 정보를 입력하고 약관에 동의해주세요.');
      return;
    }

    // 부모의 경우 아이 정보 검증
    let validChildren: ChildInfo[] = [];
    if (profileForm.userType === UserType.PARENT) {
      const safeChildren = Array.isArray(children) ? children : [];
      const childrenWithNames = safeChildren.filter(child => child.name && child.name.trim());
      if (childrenWithNames.length === 0) {
        toast.error('최소 한 명의 아이 정보를 입력해주세요.');
        return;
      }
      
      // 아이 정보 가공
      validChildren = childrenWithNames.map(child => ({
        id: child.id || Date.now().toString(),
        name: child.name!.trim(),
        age: child.age,
        gender: child.gender,
        specialNeeds: child.specialNeeds?.trim() || '',
        institutionType: child.institutionType || '해당없음',
        institutionName: child.institutionType !== '해당없음' ? child.institutionName?.trim() : undefined
      }));
    }

    try {
      setLoading(true);
      
      const profileData = {
        userType: profileForm.userType,
        name: profileForm.name,
        contact: profileForm.contact,
        children: validChildren // 아이 정보 추가
      };

      await createProfile(currentUser, profileData);
      toast.success('프로필 설정이 완료되었습니다!');
      
      // 초대 코드 처리는 추후 구현
      
    } catch (error) {
      console.error('프로필 설정 오류:', error);
      toast.error('프로필 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 아이 정보 관리
  const handleAddChild = () => {
    setChildren([...children, { 
      id: Date.now().toString(), 
      name: '', 
      specialNeeds: '', 
      age: undefined, 
      gender: undefined,
      institutionType: '해당없음',
      institutionName: ''
    }]);
  };

  const handleChildChange = (index: number, field: keyof ChildInfo, value: string | number | Gender | InstitutionType) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
  };

  const handleRemoveChild = (index: number) => {
    if (children.length > 1) {
      const safeChildren = Array.isArray(children) ? children : [];
      setChildren(safeChildren.filter((_, i) => i !== index));
    }
  };

  const inputBaseClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-gray-900 placeholder-gray-500";
  const selectBaseClasses = `${inputBaseClasses} bg-white`;
  const buttonBaseClasses = "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2";

  // 신규 사용자 프로필 설정 화면
  if (showSetupForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">        
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h1 className="text-3xl font-bold text-center text-primary mb-8">
            프로필 설정
          </h1>
          
          <form onSubmit={handleCompleteSetup} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">이름</label>
              <input
                type="text"
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className={inputBaseClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700">연락처</label>
              <input
                type="tel"
                id="contact"
                value={profileForm.contact}
                onChange={(e) => setProfileForm({ ...profileForm, contact: e.target.value })}
                className={inputBaseClasses}
                placeholder="01012345678"
                required
              />
            </div>

            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">사용자 유형</label>
              <select
                id="userType"
                value={profileForm.userType}
                onChange={(e) => setProfileForm({ ...profileForm, userType: e.target.value as UserType })}
                className={selectBaseClasses}
              >
                {USER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* 부모인 경우 아이 정보 입력 */}
            {profileForm.userType === UserType.PARENT && (
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-700">아이 정보 등록</h3>
                {children.map((child, index) => (
                  <div key={child.id || index} className="p-3 border rounded-md space-y-3">
                    <div className="flex justify-between items-center">
                       <label className="block text-sm font-medium text-gray-700">아이 {index + 1}</label>
                       {children.length > 1 && ( 
                          <button type="button" onClick={() => handleRemoveChild(index)} className="text-red-500 hover:text-red-700">
                              <TrashIcon className="w-5 h-5" />
                          </button>
                       )}
                    </div>
                    <input
                      type="text"
                      placeholder="아이 이름"
                      value={child.name || ''}
                      onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                      className={inputBaseClasses}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="나이 (세)"
                        value={child.age || ''}
                        onChange={(e) => handleChildChange(index, 'age', parseInt(e.target.value) || undefined)}
                        className={inputBaseClasses}
                      />
                      <select
                        value={child.gender || ''}
                        onChange={(e) => handleChildChange(index, 'gender', e.target.value as Gender)}
                        className={selectBaseClasses}
                      >
                        <option value="" disabled>성별 선택</option>
                        {GENDER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`institutionType-${index}`} className="block text-sm font-medium text-gray-700">기관 유형</label>
                      <select
                          id={`institutionType-${index}`}
                          value={child.institutionType || '해당없음'}
                          onChange={(e) => handleChildChange(index, 'institutionType', e.target.value as InstitutionType)}
                          className={selectBaseClasses}
                      >
                          {INSTITUTION_TYPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                      </select>
                    </div>
                    {child.institutionType && child.institutionType !== '해당없음' && (
                      <div>
                          <label htmlFor={`institutionName-${index}`} className="block text-sm font-medium text-gray-700">기관명</label>
                          <input
                              type="text"
                              id={`institutionName-${index}`}
                              placeholder="기관명 입력 (예: 사랑 어린이집)"
                              value={child.institutionName || ''}
                              onChange={(e) => handleChildChange(index, 'institutionName', e.target.value)}
                              className={inputBaseClasses}
                          />
                      </div>
                    )}
                    <textarea
                      placeholder="특이사항 (알러지, 특별히 주의할 점 등)"
                      value={child.specialNeeds || ''}
                      onChange={(e) => handleChildChange(index, 'specialNeeds', e.target.value)}
                      rows={2}
                      className={inputBaseClasses}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddChild}
                  className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 text-sm font-medium rounded-md text-primary hover:bg-indigo-50"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  아이 추가
                </button>
              </div>
            )}
            
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                개인정보 수집 및 이용에 동의합니다.
              </label>
            </div>

            <button
              type="submit"
              disabled={!agreedToTerms || loading}
              className={`${buttonBaseClasses} bg-primary hover:bg-blue-700 focus:ring-primary ${(!agreedToTerms || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? '설정 중...' : '프로필 설정 완료'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 메인 로그인 화면
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">      
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-4">CareConnect</h1>
          <p className="text-gray-600">돌봄 선생님과 부모를 연결하는<br/>통합 정보 공유 플랫폼</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={`w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? '로그인 중...' : 'Google로 시작하기'}
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              간편하고 안전한 Google 계정으로<br/>
              CareConnect를 시작해보세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
