import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
import { auth, db } from '../firebase';
import { UserProfile, InviteCode, Connection, UserType } from '../types';

// 인증 서비스
export class AuthService {
  // 회원가입
  static async signUp(email: string, password: string, profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 사용자 프로필 저장
      const userProfile: UserProfile = {
        ...profile,
        id: user.uid,
        email,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      return { user, profile: userProfile };
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    }
  }

  // 로그인
  static async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 사용자 프로필 가져오기
      const profile = await this.getUserProfile(user.uid);
      
      return { user, profile };
    } catch (error) {
      console.error('로그인 오류:', error);
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
      const inviteDocRef = doc(db, 'inviteCodes', code);
      const inviteDoc = await getDoc(inviteDocRef);
      
      if (!inviteDoc.exists()) {
        return { success: false };
      }
      
      const inviteData = inviteDoc.data() as InviteCode;
      
      // 유효성 검사
      if (inviteData.isUsed || inviteData.expiresAt < new Date() || inviteData.createdBy === userId) {
        return { success: false };
      }
      
      // 초대 코드 사용 처리
      await updateDoc(inviteDocRef, {
        isUsed: true,
        usedBy: userId
      });
      
      // 초대한 사용자 정보 가져오기
      const inviterProfile = await AuthService.getUserProfile(inviteData.createdBy);
      
      if (inviterProfile) {
        // 연결 생성
        await ConnectionService.createConnection(userId, inviteData.createdBy);
        
        return { success: true, inviterProfile };
      }
      
      return { success: false };
    } catch (error) {
      console.error('초대 코드 사용 오류:', error);
      throw error;
    }
  }
}

// 연결 서비스
export class ConnectionService {
  // 연결 생성
  static async createConnection(userId1: string, userId2: string) {
    try {
      const user1Profile = await AuthService.getUserProfile(userId1);
      const user2Profile = await AuthService.getUserProfile(userId2);
      
      if (!user1Profile || !user2Profile) {
        throw new Error('사용자 프로필을 찾을 수 없습니다.');
      }
      
      // 부모와 돌봄 선생님 구분
      const isUser1Parent = user1Profile.userType === UserType.PARENT;
      const parentId = isUser1Parent ? userId1 : userId2;
      const careProviderId = isUser1Parent ? userId2 : userId1;
      const parentProfile = isUser1Parent ? user1Profile : user2Profile;
      const careProviderProfile = isUser1Parent ? user2Profile : user1Profile;
      
      const connection: Omit<Connection, 'id'> = {
        parentId,
        careProviderId,
        parentProfile,
        careProviderProfile,
        children: [], // 나중에 추가
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const connectionRef = await addDoc(collection(db, 'connections'), connection);
      
      // 양쪽 사용자 프로필에 연결 ID 저장
      await AuthService.updateUserProfile(userId1, { connectionId: connectionRef.id });
      await AuthService.updateUserProfile(userId2, { connectionId: connectionRef.id });
      
      return connectionRef.id;
    } catch (error) {
      console.error('연결 생성 오류:', error);
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
