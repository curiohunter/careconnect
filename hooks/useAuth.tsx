import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '../services/authService';
import { UserProfile, Connection } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  connection: Connection | null; // 현재 활성 연결 (하위 호환성)
  connections: Connection[]; // 모든 연결 목록
  activeConnectionId: string | null; // 현재 활성 연결 ID
  loading: boolean;
  signInWithGoogle: () => Promise<{ user: User; profile: UserProfile | null; isNewUser: boolean }>;
  createProfile: (user: User, profileData: Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshConnection: () => Promise<void>;
  switchConnection: (connectionId: string) => Promise<void>; // 연결 전환
  loadAllConnections: () => Promise<void>; // 모든 연결 로드
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 사용자 연결 동기화
  const syncUserConnections = async (userId: string, profile: UserProfile | null) => {
    if (!profile) return;
    
    try {
      console.log('🔄 연결 동기화 시작...');
      const { ConnectionService } = await import('../services/authService');
      
      // 사용자가 참여한 모든 연결 찾기
      const allUserConnections = await ConnectionService.getAllUserConnections(userId);
      console.log('📋 발견된 연결:', allUserConnections.length, '개');
      
      if (allUserConnections.length > 0) {
        const connectionIds = allUserConnections.map(conn => conn.id);
        const currentConnectionIds = profile.connectionIds || [];
        
        // 새로운 연결이 있으면 프로필 업데이트
        const hasNewConnections = connectionIds.some(id => !currentConnectionIds.includes(id));
        
        if (hasNewConnections) {
          console.log('🔄 새로운 연결 발견, 프로필 업데이트 중...');
          await AuthService.updateUserProfile(userId, {
            connectionIds: connectionIds,
            connectionId: connectionIds[connectionIds.length - 1] // 가장 최근 연결
          });
          
          // 로컬 상태 업데이트
          setUserProfile(prev => prev ? {
            ...prev,
            connectionIds: connectionIds,
            connectionId: connectionIds[connectionIds.length - 1]
          } : null);
        }
      }
    } catch (error) {
      console.error('❌ 연결 동기화 오류:', error);
    }
  };

  // 모든 연결 로드
  const loadAllConnections = async () => {
    if (!userProfile) return;
    
    try {
      const { ConnectionService } = await import('../services/authService');
      const allConnections: Connection[] = [];
      
      // connectionIds가 있는 경우 (새로운 다중 연결)
      if (userProfile.connectionIds && userProfile.connectionIds.length > 0) {
        for (const connId of userProfile.connectionIds) {
          try {
            const conn = await ConnectionService.getConnection(connId);
            if (conn) allConnections.push(conn);
          } catch (error) {
            console.error(`연결 ${connId} 로드 실패:`, error);
          }
        }
      } 
      // connectionId만 있는 경우 (기존 단일 연결 - 하위 호환성)
      else if (userProfile.connectionId) {
        try {
          const conn = await ConnectionService.getConnection(userProfile.connectionId);
          if (conn) allConnections.push(conn);
        } catch (error) {
          console.error('연결 로드 실패:', error);
        }
      }
      
      setConnections(allConnections);
      
      // 활성 연결 설정
      if (allConnections.length > 0 && !activeConnectionId) {
        setActiveConnectionId(allConnections[0].id);
        setConnection(allConnections[0]);
      }
    } catch (error) {
      console.error('모든 연결 로드 오류:', error);
    }
  };

  // 연결 전환
  const switchConnection = async (connectionId: string) => {
    const selectedConnection = connections.find(conn => conn.id === connectionId);
    if (selectedConnection) {
      setActiveConnectionId(connectionId);
      setConnection(selectedConnection);
      toast.success('연결이 전환되었습니다.');
    } else {
      toast.error('선택한 연결을 찾을 수 없습니다.');
    }
  };

  // 연결 정보 새로고침 (기존 함수 수정)
  const refreshConnection = async () => {
    await loadAllConnections();
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
      setConnections([]);
      setActiveConnectionId(null);
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      toast.error('로그아웃에 실패했습니다.');
    }
  };

  // 인증 상태 변화 감지
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (firebaseUser) => {
      console.log('🔄 AuthStateChanged - firebaseUser:', !!firebaseUser, firebaseUser?.email);
      setLoading(true);
      
      if (firebaseUser) {
        try {
          console.log('👤 사용자 프로필 로드 중...', firebaseUser.uid);
          const profile = await AuthService.getUserProfile(firebaseUser.uid);
          console.log('📋 프로필 로드 결과:', profile);
          
          setUser(firebaseUser);
          setUserProfile(profile);
          
          // 연결 동기화: 사용자가 참여한 모든 연결을 찾아서 프로필 업데이트
          await syncUserConnections(firebaseUser.uid, profile);
          
          // 연결 정보 가져오기 - 다중 연결 우선, 단일 연결 호환
          if (profile?.connectionIds && profile.connectionIds.length > 0) {
            console.log('🔗 다중 연결 정보 로드 중...', profile.connectionIds);
            const { ConnectionService } = await import('../services/authService');
            const allConnections: Connection[] = [];
            
            for (const connId of profile.connectionIds) {
              try {
                const conn = await ConnectionService.getConnection(connId);
                if (conn) allConnections.push(conn);
              } catch (error) {
                console.error(`연결 ${connId} 로드 실패:`, error);
              }
            }
            
            setConnections(allConnections);
            if (allConnections.length > 0) {
              setActiveConnectionId(allConnections[0].id);
              setConnection(allConnections[0]);
            }
            console.log('🔗 다중 연결 로드 완료:', allConnections.length, '개');
          } else if (profile?.connectionId) {
            console.log('🔗 단일 연결 정보 로드 중...', profile.connectionId);
            const { ConnectionService } = await import('../services/authService');
            const connectionData = await ConnectionService.getConnection(profile.connectionId);
            console.log('🔗 단일 연결 정보 로드 완료:', !!connectionData);
            setConnection(connectionData);
            setConnections(connectionData ? [connectionData] : []);
            setActiveConnectionId(connectionData?.id || null);
          }
        } catch (error) {
          console.error('❌ 사용자 정보 로드 오류:', error);
          setUser(null);
          setUserProfile(null);
          setConnection(null);
          setConnections([]);
          setActiveConnectionId(null);
        }
      } else {
        console.log('🚪 사용자 로그아웃 상태');
        setUser(null);
        setUserProfile(null);
        setConnection(null);
        setConnections([]);
        setActiveConnectionId(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 프로필이 변경되었을 때 연결 정보 다시 로드
  useEffect(() => {
    if (userProfile) {
      loadAllConnections();
    }
  }, [userProfile?.connectionIds, userProfile?.connectionId]);

  // popup 방식으로 변경했으므로 redirect 결과 처리 제거

  const value: AuthContextType = {
    user,
    userProfile,
    connection,
    connections,
    activeConnectionId,
    loading,
    signInWithGoogle,
    createProfile,
    signOut,
    updateProfile,
    refreshConnection,
    switchConnection,
    loadAllConnections
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
