import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, InviteCode, Connection, UserType } from '../types';

// 인증 서비스
export class AuthService {
  // Google 로그인 (popup 방식으로 복구)
  static async signInWithGoogle() {
    try {
      console.log('🔄 Google 로그인 시도 중...');
      
      const result = await signInWithPopup(auth, googleProvider);
      return await this.processAuthResult(result);
    } catch (error) {
      console.error('❌ Google 로그인 오류:', error);
      throw error;
    }
  }

  // 로그인 결과 처리 (redirect 후 호출)
  static async handleRedirectResult() {
    try {
      console.log('🔍 getRedirectResult 호출 중...');
      const result = await getRedirectResult(auth);
      console.log('📋 getRedirectResult 결과:', result);
      
      if (result) {
        console.log('🔄 Redirect 로그인 결과 처리 중...', result.user.email);
        return await this.processAuthResult(result);
      }
      
      console.log('ℹ️ Redirect 결과가 null - 정상적인 페이지 로드');
      return null;
    } catch (error) {
      console.error('❌ Redirect 결과 처리 오류:', error);
      throw error;
    }
  }

  // 공통 인증 결과 처리
  static async processAuthResult(result: any) {
    const user = result.user;
    console.log('✅ Google 로그인 성공:', user.email);
    
    // 기존 사용자 프로필 확인
    console.log('🔍 사용자 프로필 확인 중...', user.uid);
    let profile = await this.getUserProfile(user.uid);
    console.log('📋 프로필 결과:', profile);
    
    // 신규 사용자인 경우 프로필 생성 안내
    if (!profile) {
      console.log('🆕 신규 사용자 - 프로필 설정 필요');
      return { user, profile: null, isNewUser: true };
    }
    
    console.log('👤 기존 사용자 - 로그인 완료');
    return { user, profile, isNewUser: false };
  }

  // 사용자 프로필 생성 (Google 로그인 후 호출)
  static async createUserProfile(user: User, additionalData: Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>) {
    try {
      console.log('🔄 프로필 생성 시작:', {
        uid: user.uid,
        email: user.email,
        authenticated: !!auth.currentUser,
        currentUserUid: auth.currentUser?.uid
      });

      const userProfile: UserProfile = {
        ...additionalData,
        id: user.uid,
        email: user.email || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      console.log('✅ 프로필 생성 성공');
      
      return userProfile;
    } catch (error) {
      console.error('사용자 프로필 생성 오류:', error);
      throw error;
    }
  }

  // 로그아웃
  static async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 오류:', error);
      throw error;
    }
  }

  // 사용자 프로필 가져오기
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('프로필 가져오기 오류:', error);
      throw error;
    }
  }

  // 사용자 프로필 업데이트
  static async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      throw error;
    }
  }

  // 인증 상태 감시
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // 계정 삭제
  static async deleteAccount(user: User) {
    try {
      const { deleteUser } = await import('firebase/auth');
      await deleteUser(user);
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      throw error;
    }
  }
}

// 초대 코드 서비스
export class InviteCodeService {
  // 초대 코드 생성
  static async generateInviteCode(userId: string, userType: UserType): Promise<string> {
    try {
      // 6자리 랜덤 코드 생성
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const inviteCode: InviteCode = {
        code,
        createdBy: userId,
        userType,
        isUsed: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후 만료
        createdAt: new Date()
      };
      
      await setDoc(doc(db, 'inviteCodes', code), inviteCode);
      
      // 사용자 프로필에 초대 코드 저장
      await AuthService.updateUserProfile(userId, { inviteCode: code });
      
      return code;
    } catch (error) {
      console.error('초대 코드 생성 오류:', error);
      throw error;
    }
  }

  // 초대 코드 상태 확인
  static async checkInviteCodeStatus(code: string): Promise<{ exists: boolean, isUsed: boolean, isExpired: boolean }> {
    try {
      const inviteDocRef = doc(db, 'inviteCodes', code);
      const inviteDoc = await getDoc(inviteDocRef);
      
      if (!inviteDoc.exists()) {
        return { exists: false, isUsed: false, isExpired: false };
      }
      
      const inviteData = inviteDoc.data() as InviteCode;
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
      
      return {
        exists: true,
        isUsed: inviteData.isUsed,
        isExpired: expiresAt < now
      };
    } catch (error) {
      console.error('초대 코드 상태 확인 오류:', error);
      return { exists: false, isUsed: false, isExpired: false };
    }
  }

  // 초대 코드 사용
  static async useInviteCode(code: string, userId: string): Promise<{ success: boolean, inviterProfile?: UserProfile }> {
    try {
      console.log('🔍 초대 코드 사용 시도:', code, 'by user:', userId);
      const inviteDocRef = doc(db, 'inviteCodes', code);
      const inviteDoc = await getDoc(inviteDocRef);
      
      console.log('📄 초대 코드 문서 존재 여부:', inviteDoc.exists());
      
      if (!inviteDoc.exists()) {
        console.log('❌ 초대 코드를 찾을 수 없음:', code);
        return { success: false };
      }
      
      const inviteData = inviteDoc.data() as InviteCode;
      console.log('📋 초대 코드 데이터:', inviteData);
      
      // 유효성 검사
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
      console.log('⏰ 현재 시간:', now);
      console.log('⏰ 만료 시간 (변환됨):', expiresAt);
      console.log('🔄 사용 여부:', inviteData.isUsed);
      console.log('👤 생성자:', inviteData.createdBy, '사용자:', userId);
      
      if (inviteData.isUsed) {
        console.log('❌ 이미 사용된 코드');
        return { success: false };
      }
      
      if (expiresAt < now) {
        console.log('❌ 만료된 코드');
        return { success: false };
      }
      
      if (inviteData.createdBy === userId) {
        console.log('❌ 자신이 생성한 코드는 사용할 수 없음');
        return { success: false };
      }
      
      console.log('✅ 유효한 초대 코드 - 트랜잭션으로 연결 생성 시작');
      
      // 초대한 사용자 정보 가져오기
      const inviterProfile = await AuthService.getUserProfile(inviteData.createdBy);
      console.log('👤 초대자 프로필:', inviterProfile);
      
      if (!inviterProfile) {
        console.log('❌ 초대자 프로필을 찾을 수 없음');
        return { success: false };
      }
      
      // 먼저 초대코드를 사용됨으로 표시
      await updateDoc(inviteDocRef, {
        isUsed: true,
        usedBy: userId
      });
      
      try {
        console.log('🔗 연결 생성 시작');
        // 연결 생성
        const connectionId = await ConnectionService.createConnection(userId, inviteData.createdBy);
        
        const result = { success: true, inviterProfile, connectionId };
        console.log('✅ 초대코드 사용 및 연결 생성 완료');
        return result;
      } catch (error) {
        // 연결 생성 실패 시 초대코드 상태 되돌리기
        console.log('❌ 연결 생성 실패, 초대코드 상태 되돌리는 중...');
        await updateDoc(inviteDocRef, {
          isUsed: false,
          usedBy: null
        });
        throw error;
      }
    } catch (error) {
      console.error('❌ 초대 코드 사용 오류:', error);
      throw error;
    }
  }
}

// 연결 서비스
export class ConnectionService {

  // 연결 생성
  static async createConnection(userId1: string, userId2: string) {
    try {
      console.log('📌 연결 생성 시작 - 사용자1:', userId1, '사용자2:', userId2);
      
      const user1Profile = await AuthService.getUserProfile(userId1);
      const user2Profile = await AuthService.getUserProfile(userId2);
      
      console.log('📄 사용자1 프로필:', user1Profile);
      console.log('📄 사용자2 프로필:', user2Profile);
      
      if (!user1Profile || !user2Profile) {
        console.log('❌ 사용자 프로필을 찾을 수 없습니다.');
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }
      
      // 부모와 돌봄 선생님 구분
      const isUser1Parent = user1Profile.userType === UserType.PARENT;
      const parentId = isUser1Parent ? userId1 : userId2;
      const careProviderId = isUser1Parent ? userId2 : userId1;
      const parentProfile = isUser1Parent ? user1Profile : user2Profile;
      const careProviderProfile = isUser1Parent ? user2Profile : user1Profile;
      
      console.log('👨‍👩‍👧‍👦 부모 ID:', parentId);
      console.log('👩‍🏫 돌봄 선생님 ID:', careProviderId);
      
      // 부모 프로필에서 아이 정보 가져오기
      const childrenInfo = parentProfile.children || [];
      console.log('👶 아이 정보:', childrenInfo);
      
      const connection: Omit<Connection, 'id'> = {
        parentId,
        careProviderId,
        parentProfile,
        careProviderProfile,
        children: childrenInfo, // 부모 프로필에서 아이 정보 복사
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('📁 연결 데이터 준비 완료');
      console.log('💾 커넥션 컬렉션에 추가 시도...');
      
      const connectionRef = await addDoc(collection(db, 'connections'), connection);
      const connectionId = connectionRef.id;
      
      console.log('✅ 연결 문서 생성 성공, ID:', connectionId);
      
      // 각 사용자가 자신의 프로필을 개별적으로 업데이트 (권한 문제 해결)
      console.log('🔄 사용자 프로필 개별 업데이트 시작...');
      
      // 현재 사용자(사용자1) 프로필 업데이트
      const user1Ref = doc(db, 'users', userId1);
      const user1ConnectionIds = user1Profile.connectionIds || (user1Profile.connectionId ? [user1Profile.connectionId] : []);
      if (!user1ConnectionIds.includes(connectionId)) {
        user1ConnectionIds.push(connectionId);
      }
      await updateDoc(user1Ref, {
        connectionId, // 하위 호환성을 위해 유지 (가장 최근 연결)
        connectionIds: user1ConnectionIds, // 다중 연결 지원
        updatedAt: serverTimestamp()
      });
      console.log('✅ 사용자1 프로필 업데이트 완료');
      
      // 상대방(사용자2) 프로필은 별도 트리거로 업데이트하거나, 
      // 여기서는 연결 문서만 생성하고 각자 로그인 시 connectionIds 동기화
      console.log('ℹ️ 사용자2 프로필은 다음 로그인 시 자동 동기화됩니다.');
      
      console.log('✅ 연결 생성 완전히 완료, 연결 ID:', connectionId);
      
      return connectionId;
    } catch (error) {
      console.error('❌ 연결 생성 오류:', error);
      throw error;
    }
  }

  // 연결 정보 가져오기
  static async getConnection(connectionId: string): Promise<Connection | null> {
    try {
      const docSnap = await getDoc(doc(db, 'connections', connectionId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Connection;
      }
      return null;
    } catch (error) {
      console.error('연결 정보 가져오기 오류:', error);
      throw error;
    }
  }

  // 사용자의 연결 정보 가져오기 (단일)
  static async getUserConnection(userId: string): Promise<Connection | null> {
    try {
      const q = query(
        collection(db, 'connections'),
        where('parentId', '==', userId)
      );
      
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // 돌봄 선생님으로 검색
        const q2 = query(
          collection(db, 'connections'),
          where('careProviderId', '==', userId)
        );
        querySnapshot = await getDocs(q2);
      }
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Connection;
      }
      
      return null;
    } catch (error) {
      console.error('사용자 연결 정보 가져오기 오류:', error);
      throw error;
    }
  }

  // 사용자의 모든 연결 정보 가져오기 (다중)
  static async getAllUserConnections(userId: string): Promise<Connection[]> {
    try {
      const connections: Connection[] = [];
      
      // 부모로서의 연결 검색
      const parentQuery = query(
        collection(db, 'connections'),
        where('parentId', '==', userId)
      );
      const parentSnapshot = await getDocs(parentQuery);
      parentSnapshot.forEach(doc => {
        connections.push({ id: doc.id, ...doc.data() } as Connection);
      });
      
      // 돌봄 선생님으로서의 연결 검색
      const careProviderQuery = query(
        collection(db, 'connections'),
        where('careProviderId', '==', userId)
      );
      const careProviderSnapshot = await getDocs(careProviderQuery);
      careProviderSnapshot.forEach(doc => {
        connections.push({ id: doc.id, ...doc.data() } as Connection);
      });
      
      return connections;
    } catch (error) {
      console.error('사용자 모든 연결 정보 가져오기 오류:', error);
      throw error;
    }
  }

  // 연결 해제 (다중 연결 지원)
  static async disconnectUsers(connectionId: string, userId1: string, userId2: string) {
    try {
      console.log('🔄 연결 해제 시작:', connectionId);
      
      // 사용자 프로필 가져오기
      const user1Profile = await AuthService.getUserProfile(userId1);
      const user2Profile = await AuthService.getUserProfile(userId2);
      
      if (!user1Profile || !user2Profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }
      
      // 배치로 모든 작업을 원자적으로 처리
      const batch = writeBatch(db);
      
      // 연결 문서 삭제
      batch.delete(doc(db, 'connections', connectionId));
      
      // 사용자1 프로필에서 connectionId 제거
      const user1Ref = doc(db, 'users', userId1);
      const user1ConnectionIds = (user1Profile.connectionIds || []).filter(id => id !== connectionId);
      const user1NewConnectionId = user1ConnectionIds.length > 0 ? user1ConnectionIds[user1ConnectionIds.length - 1] : null;
      batch.update(user1Ref, {
        connectionId: user1NewConnectionId, // 가장 최근 연결로 설정
        connectionIds: user1ConnectionIds,
        updatedAt: serverTimestamp()
      });
      
      // 사용자2 프로필에서 connectionId 제거
      const user2Ref = doc(db, 'users', userId2);
      const user2ConnectionIds = (user2Profile.connectionIds || []).filter(id => id !== connectionId);
      const user2NewConnectionId = user2ConnectionIds.length > 0 ? user2ConnectionIds[user2ConnectionIds.length - 1] : null;
      batch.update(user2Ref, {
        connectionId: user2NewConnectionId, // 가장 최근 연결로 설정
        connectionIds: user2ConnectionIds,
        updatedAt: serverTimestamp()
      });
      
      // 배치 실행
      await batch.commit();
      console.log('✅ 연결 해제 완료');
      
      return true;
    } catch (error) {
      console.error('❌ 연결 해제 오류:', error);
      throw error;
    }
  }
}

export default {
  AuthService,
  InviteCodeService,
  ConnectionService
};
