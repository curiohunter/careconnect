import React, { useState } from 'react';
import { UserType, UserProfile, ChildInfo, Gender, InstitutionType } from '../types';
import { USER_TYPES, GENDER_OPTIONS, INSTITUTION_TYPE_OPTIONS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { InviteCodeService } from '../services/authService';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';
import toast from 'react-hot-toast';

interface AuthScreenProps {
  onLogin: (profile: UserProfile, children: ChildInfo[]) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { signIn, signUp, refreshConnection } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [loading, setLoading] = useState(false);

  // 로그인 폼 상태
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // 회원가입 폼 상태
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
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

  const inputBaseClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white text-gray-900 placeholder-gray-500";
  const selectBaseClasses = `${inputBaseClasses} bg-white`;
  const buttonBaseClasses = "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2";

  // 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await signIn(loginForm.email, loginForm.password);
      // AuthProvider에서 자동으로 사용자 정보 로드됨
    } catch (error) {
      // 오류는 AuthProvider에서 toast로 처리됨
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 처리
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupForm.email || !signupForm.password || !signupForm.name || !signupForm.contact || !agreedToTerms) {
      toast.error('모든 필수 정보를 입력하고 약관에 동의해주세요.');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (signupForm.password.length < 6) {
      toast.error('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    // 부모의 경우 아이 정보 검증
    if (signupForm.userType === UserType.PARENT) {
      const validChildren = children.filter(child => child.name);
      if (validChildren.length === 0) {
        toast.error('최소 한 명의 아이 정보를 입력해주세요.');
        return;
      }
    }

    try {
      setLoading(true);
      
      const profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
        userType: signupForm.userType,
        name: signupForm.name,
        contact: signupForm.contact,
        email: signupForm.email
      };

      await signUp(signupForm.email, signupForm.password, profile);
      
      // 초대 코드 사용 처리는 회원가입 완료 후 자동으로 처리됨
      
    } catch (error) {
      // 오류는 AuthProvider에서 toast로 처리됨
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
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h1 className="text-3xl font-bold text-center text-primary mb-8">
          CareConnect {isLogin ? '로그인' : '회원가입'}
        </h1>
        
        {/* 로그인/회원가입 탭 */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isLogin ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isLogin ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            회원가입
          </button>
        </div>

        {isLogin ? (
          /* 로그인 폼 */
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                id="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className={inputBaseClasses}
                placeholder="example@email.com"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className={inputBaseClasses}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${buttonBaseClasses} bg-primary hover:bg-blue-700 focus:ring-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        ) : (
          /* 회원가입 폼 */
          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                id="signup-email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                className={inputBaseClasses}
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className={inputBaseClasses}
                  placeholder="최소 6자리"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5 text-gray-400" /> : <EyeIcon className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">비밀번호 확인</label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirm-password"
                value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                className={inputBaseClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">이름</label>
              <input
                type="text"
                id="name"
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                className={inputBaseClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700">연락처</label>
              <input
                type="tel"
                id="contact"
                value={signupForm.contact}
                onChange={(e) => setSignupForm({ ...signupForm, contact: e.target.value })}
                className={inputBaseClasses}
                placeholder="01012345678"
                required
              />
            </div>

            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">사용자 유형</label>
              <select
                id="userType"
                value={signupForm.userType}
                onChange={(e) => setSignupForm({ ...signupForm, userType: e.target.value as UserType })}
                className={selectBaseClasses}
              >
                {USER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* 초대 코드 섹션 */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700">
                  초대 코드 (선택사항)
                </label>
                <button
                  type="button"
                  onClick={() => setShowInviteCode(!showInviteCode)}
                  className="text-sm text-primary hover:underline"
                >
                  {showInviteCode ? '숨기기' : '입력하기'}
                </button>
              </div>
              {showInviteCode && (
                <div className="mt-2">
                  <input
                    type="text"
                    id="invite-code"
                    value={signupForm.inviteCode}
                    onChange={(e) => setSignupForm({ ...signupForm, inviteCode: e.target.value.toUpperCase() })}
                    className={inputBaseClasses}
                    placeholder="초대 코드 입력 (예: ABC123)"
                    maxLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    초대 코드가 있으면 상대방과 자동으로 연결됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* 부모인 경우 아이 정보 입력 */}
            {signupForm.userType === UserType.PARENT && (
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
              {loading ? '회원가입 중...' : '회원가입'}
            </button>
          </form>
        )}
        
        <p className="mt-6 text-center text-xs text-gray-500">
          {isLogin ? 
            '계정이 없으신가요? 회원가입 탭을 클릭하세요.' : 
            '초대 코드는 가입 후 대시보드에서 생성하고 공유할 수 있습니다.'
          }
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
