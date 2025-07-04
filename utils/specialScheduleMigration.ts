import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { SpecialScheduleItem } from '../types';

/**
 * 기존 특별 일정 데이터에 createdByName 필드를 추가하는 마이그레이션 함수
 * 
 * @param parentId - 특정 부모 ID의 데이터만 마이그레이션 (선택적)
 * @returns 마이그레이션된 문서 수
 */
export async function migrateSpecialScheduleCreatedByName(parentId?: string): Promise<number> {
  try {
    let specialSchedulesQuery;
    
    // parentId가 제공된 경우 해당 부모의 데이터만, 아니면 전체 데이터
    if (parentId) {
      specialSchedulesQuery = query(
        collection(db, 'specialSchedules'),
        where('parentId', '==', parentId)
      );
    } else {
      specialSchedulesQuery = collection(db, 'specialSchedules');
    }
    
    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(specialSchedulesQuery);
    
    let migratedCount = 0;
    const batchSize = 10; // 배치 처리 크기
    const promises: Promise<void>[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data() as SpecialScheduleItem;
      
      // 이미 createdByName이 있는 경우 스킵
      if (data.createdByName) {
        continue;
      }
      
      // createdBy가 없는 경우도 스킵
      if (!data.createdBy) {
        console.warn(`Document ${docSnapshot.id} has no createdBy field`);
        continue;
      }
      
      // 배치 처리를 위한 Promise 생성
      const updatePromise = (async () => {
        try {
          // 사용자 정보 조회
          const userDoc = await getDoc(doc(db, 'users', data.createdBy!));
          
          if (!userDoc.exists()) {
            console.warn(`User ${data.createdBy} not found for document ${docSnapshot.id}`);
            return;
          }
          
          const userData = userDoc.data();
          const createdByName = userData.name || '알 수 없음';
          
          // 문서 업데이트
          await updateDoc(doc(db, 'specialSchedules', docSnapshot.id), {
            createdByName: createdByName
          });
          
          migratedCount++;
          console.log(`Migrated document ${docSnapshot.id} with name: ${createdByName}`);
        } catch (error) {
          console.error(`Error migrating document ${docSnapshot.id}:`, error);
        }
      })();
      
      promises.push(updatePromise);
      
      // 배치 크기에 도달하면 현재 배치 처리
      if (promises.length >= batchSize) {
        await Promise.all(promises);
        promises.length = 0; // 배열 초기화
      }
    }
    
    // 남은 Promise들 처리
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    console.log(`Migration completed. Total documents migrated: ${migratedCount}`);
    return migratedCount;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * 특정 연결(connection)의 모든 특별 일정 마이그레이션
 * 
 * @param connectionId - 연결 ID
 * @returns 마이그레이션된 문서 수
 */
export async function migrateSpecialScheduleByConnection(connectionId: string): Promise<number> {
  try {
    const specialSchedulesQuery = query(
      collection(db, 'specialSchedules'),
      where('connectionId', '==', connectionId)
    );
    
    const querySnapshot = await getDocs(specialSchedulesQuery);
    
    // parentId 추출 (모든 문서가 같은 parentId를 가져야 함)
    if (querySnapshot.empty) {
      console.log('No documents found for this connection');
      return 0;
    }
    
    const firstDoc = querySnapshot.docs[0].data();
    const parentId = firstDoc.parentId;
    
    if (!parentId) {
      throw new Error('No parentId found in documents');
    }
    
    // parentId 기반 마이그레이션 실행
    return await migrateSpecialScheduleCreatedByName(parentId);
  } catch (error) {
    console.error('Migration by connection failed:', error);
    throw error;
  }
}

/**
 * 마이그레이션 상태 확인 함수
 * 
 * @param parentId - 특정 부모 ID (선택적)
 * @returns 마이그레이션이 필요한 문서 수
 */
export async function checkMigrationStatus(parentId?: string): Promise<{
  total: number;
  needsMigration: number;
  alreadyMigrated: number;
}> {
  try {
    let specialSchedulesQuery;
    
    if (parentId) {
      specialSchedulesQuery = query(
        collection(db, 'specialSchedules'),
        where('parentId', '==', parentId)
      );
    } else {
      specialSchedulesQuery = collection(db, 'specialSchedules');
    }
    
    const querySnapshot = await getDocs(specialSchedulesQuery);
    
    let needsMigration = 0;
    let alreadyMigrated = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.createdByName) {
        alreadyMigrated++;
      } else if (data.createdBy) {
        needsMigration++;
      }
    });
    
    const total = querySnapshot.size;
    
    console.log(`Migration Status:
      Total documents: ${total}
      Already migrated: ${alreadyMigrated}
      Needs migration: ${needsMigration}
    `);
    
    return {
      total,
      needsMigration,
      alreadyMigrated
    };
  } catch (error) {
    console.error('Failed to check migration status:', error);
    throw error;
  }
}