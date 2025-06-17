import {
  signInWithPopup,
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
  writeBatch
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, InviteCode, Connection, UserType } from '../types';

// 인증 서비스
export class AuthService {
  // Google 로그인
  static async signInWithGoogle() {
    try {
      console.log('🔄 Google 로그인 시도 중...');
      const result = await signInWithPopup(auth, googleProvider);
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
    } catch (error) {
      console.error('❌ Google 로그인 오류:', error);
      throw error;
    }
  }

  // 사용자 프로필 생성 (Google 로그인 후 호출)
  static async createUserProfile(user: User, additionalData: Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>) {
    try {
      const userProfile: UserProfile = {
        ...additionalData,
        id: user.uid,
        email: user.email || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
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
      
      console.log('✅ 유효한 초대 코드 - 사용 처리 진행');
      
      // 초대 코드 사용 처리
      await updateDoc(inviteDocRef, {
        isUsed: true,
        usedBy: userId
      });
      
      console.log('✅ 초대 코드 사용 처리 완료');
      
      // 초대한 사용자 정보 가져오기
      const inviterProfile = await AuthService.getUserProfile(inviteData.createdBy);
      console.log('👤 초대자 프로필:', inviterProfile);
      
      if (inviterProfile) {
        console.log('🔗 연결 생성 시작');
        // 연결 생성
        await ConnectionService.createConnection(userId, inviteData.createdBy);
        console.log('✅ 연결 생성 완료');
        
        return { success: true, inviterProfile };
      }
      
      console.log('❌ 초대자 프로필을 찾을 수 없음');
      return { success: false };
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
      
      // 배치로 사용자 프로필 업데이트 (원자적 처리)
      console.log('🔄 배치 업데이트 시작...');
      const batch = writeBatch(db);
      
      // 사용자1 프로필 업데이트
      const user1Ref = doc(db, 'users', userId1);
      batch.update(user1Ref, {
        connectionId,
        updatedAt: serverTimestamp()
      });
      
      // 사용자2 프로필 업데이트
      const user2Ref = doc(db, 'users', userId2);
      batch.update(user2Ref, {
        connectionId,
        updatedAt: serverTimestamp()
      });
      
      // 배치 실행
      await batch.commit();
      console.log('✅ 배치 업데이트 완료');
      
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

  // 사용자의 연결 정보 가져오기
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
}

export default {
  AuthService,
  InviteCodeService,
  ConnectionService
};
