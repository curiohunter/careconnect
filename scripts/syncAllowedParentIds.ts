import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp, where, query } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBM9c0Ik-UmH-696jDEToifiodRQ_evZ1M",
  authDomain: "careconnect-444da.firebaseapp.com",
  projectId: "careconnect-444da",
  storageBucket: "careconnect-444da.firebasestorage.app",
  messagingSenderId: "546857093781",
  appId: "1:546857093781:web:e1bad981e034a4b21aa99c"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function syncAllowedParentIds() {
  try {
    console.log('🔄 allowedParentIds 동기화 시작...');
    
    // 모든 사용자 가져오기
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // 돌봄선생님인 경우만 처리
      if (userData.userType === 'CAREGIVER') {
        console.log(`\n👩‍🏫 돌봄선생님 처리: ${userData.name} (${userId})`);
        
        // 해당 돌봄선생님의 모든 연결 찾기
        const connectionsQuery = query(
          collection(db, 'connections'),
          where('careProviderId', '==', userId)
        );
        const connectionsSnapshot = await getDocs(connectionsQuery);
        
        // parentId 목록 추출
        const parentIds: string[] = [];
        connectionsSnapshot.forEach(connDoc => {
          const connData = connDoc.data();
          if (connData.parentId) {
            parentIds.push(connData.parentId);
          }
        });
        
        // userProfiles에 allowedParentIds 저장
        if (parentIds.length > 0) {
          const userProfileRef = doc(db, 'userProfiles', userId);
          await setDoc(userProfileRef, {
            allowedParentIds: parentIds,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          console.log(`  ✅ allowedParentIds 업데이트 완료:`, parentIds);
        } else {
          console.log(`  ⚠️ 연결된 부모가 없습니다.`);
        }
      }
    }
    
    console.log('\n✅ 전체 동기화 완료!');
  } catch (error) {
    console.error('❌ 동기화 중 오류 발생:', error);
  }
}

// 스크립트 실행
syncAllowedParentIds();