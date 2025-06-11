import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '../services/authService';
import { UserProfile, Connection } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  connection: Connection | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);

  // 연결 정보 새로고침
  const refreshConnection = async () => {
    if (userProfile?.connectionId) {
      try {
        const { ConnectionService } = await import('../services/authService');
        const connectionData = await ConnectionService.getConnection(userProfile.connectionId);
        setConnection(connectionData);
      } catch (error) {
        console.error('연결 정보 새로고침 오류:', error);
      }
    }
  };

  // 사용자 프로필 업데이트
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    
    try {
      await AuthService.updateUserProfile(user.uid, updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('프로필이 업데이트되었습니다.');
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      toast.error('프로필 업데이트에 실패했습니다.');
      throw error;
    }
  };

  // 로그인
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: firebaseUser, profile } = await AuthService.signIn(email, password);
      setUser(firebaseUser);
      setUserProfile(profile);
      
      // 연결 정보 가져오기
      if (profile?.connectionId) {
        const { ConnectionService } = await import('../services/authService');
        const connectionData = await ConnectionService.getConnection(profile.connectionId);
        setConnection(connectionData);
      }
      
      toast.success('로그인되었습니다.');
    } catch (error: any) {
      console.error('로그인 오류:', error);
      
      // Firebase 오류 메시지 한국어화
      let errorMessage = '로그인에 실패했습니다.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = '존재하지 않는 계정입니다.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = '잘못된 비밀번호입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바르지 않은 이메일 형식입니다.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const signUp = async (email: string, password: string, profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const { user: firebaseUser, profile: userProfile } = await AuthService.signUp(email, password, profile);
      setUser(firebaseUser);
      setUserProfile(userProfile);
      toast.success('회원가입이 완료되었습니다.');
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      
      // Firebase 오류 메시지 한국어화
      let errorMessage = '회원가입에 실패했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다. (최소 6자리)';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바르지 않은 이메일 형식입니다.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
      setUserProfile(null);
      setConnection(null);
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast.error('로그아웃에 실패했습니다.');
    }
  };

  // 인증 상태 변화 감지
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          const profile = await AuthService.getUserProfile(firebaseUser.uid);
          setUser(firebaseUser);
          setUserProfile(profile);
          
          // 연결 정보 가져오기
          if (profile?.connectionId) {
            const { ConnectionService } = await import('../services/authService');
            const connectionData = await ConnectionService.getConnection(profile.connectionId);
            setConnection(connectionData);
          }
        } catch (error) {
          console.error('사용자 정보 로드 오류:', error);
          setUser(null);
          setUserProfile(null);
          setConnection(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setConnection(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    userProfile,
    connection,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshConnection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 인증 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
