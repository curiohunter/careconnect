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
  signInWithGoogle: () => Promise<{ user: User; profile: UserProfile | null; isNewUser: boolean }>;
  createProfile: (user: User, profileData: Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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

  // Google 로그인
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await AuthService.signInWithGoogle();
      // AuthService에서 반환된 결과를 그대로 반환
      return result;
    } catch (error: any) {
      console.error('Google 로그인 오류:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 사용자 프로필 생성
  const createProfile = async (user: User, profileData: Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>) => {
    try {
      const profile = await AuthService.createUserProfile(user, profileData);
      setUserProfile(profile);
      toast.success('프로필이 생성되었습니다.');
    } catch (error) {
      console.error('프로필 생성 오류:', error);
      toast.error('프로필 생성에 실패했습니다.');
      throw error;
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
    signInWithGoogle,
    createProfile,
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
