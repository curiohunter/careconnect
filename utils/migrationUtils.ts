import { 
  Connection, 
  MultiConnection, 
  Permission, 
  CareProviderAssignment,
  UserProfile
} from '../types';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

/**
 * 기존 1:1 연결을 다대다 연결로 변환하는 함수
 * @param connectionId 기존 Connection의 ID
 * @returns 새로 생성된 MultiConnection의 ID
 */
export async function convertConnectionToMulti(connectionId: string): Promise<string> {
  try {
    // 기존 연결 정보 가져오기
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionSnap = await getDoc(connectionRef);
    
    if (!connectionSnap.exists()) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    
    const connection = connectionSnap.data() as Connection;
    const batch = writeBatch(db);
    
    // 새 MultiConnection 생성
    const multiConnectionRef = doc(collection(db, 'multiConnections'));
    const multiConnection: Omit<MultiConnection, 'id'> = {
      connectionType: 'PARENT_PROVIDER',
      isActive: connection.isActive,
      permissions: {
        // 부모에게 모든 권한 부여
        [connection.parentId]: [
          Permission.VIEW,
          Permission.EDIT,
          Permission.ADMIN,
          Permission.SCHEDULE_MANAGE,
          Permission.MEAL_MANAGE
        ],
        // 돌봄 선생님에게 기본 권한 부여
        [connection.careProviderId]: [
          Permission.VIEW,
          Permission.SCHEDULE_MANAGE,
          Permission.MEDICATION_MANAGE,
          Permission.HANDOVER_MANAGE
        ]
      },
      createdAt: connection.createdAt,
      updatedAt: new Date()
    };
    
    batch.set(multiConnectionRef, multiConnection);
    
    // 아이들에 대한 돌봄 선생님 할당 생성
    if (connection.children && connection.children.length > 0) {
      for (const child of connection.children) {
        const assignmentRef = doc(collection(db, 'careProviderAssignments'));
        const assignment: Omit<CareProviderAssignment, 'id'> = {
          connectionId: multiConnectionRef.id,
          careProviderId: connection.careProviderId,
          childId: child.id,
          assignmentType: 'PRIMARY',
          permissions: [
            Permission.VIEW,
            Permission.SCHEDULE_MANAGE,
            Permission.MEDICATION_MANAGE
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        batch.set(assignmentRef, assignment);
      }
    }
    
    // 사용자 프로필 업데이트 (기존 connectionId를 새 연결 ID로 변경)
    const parentProfileRef = doc(db, 'userProfiles', connection.parentId);
    const providerProfileRef = doc(db, 'userProfiles', connection.careProviderId);
    
    batch.update(parentProfileRef, { 
      connectionId: multiConnectionRef.id,
      updatedAt: serverTimestamp()
    });
    
    batch.update(providerProfileRef, { 
      connectionId: multiConnectionRef.id,
      updatedAt: serverTimestamp()
    });
    
    // 변경사항 저장
    await batch.commit();
    
    // 마이그레이션 로그 생성
    await setDoc(doc(db, 'migrationLogs', multiConnectionRef.id), {
      originalConnectionId: connectionId,
      multiConnectionId: multiConnectionRef.id,
      migratedAt: serverTimestamp(),
      status: 'SUCCESS'
    });
    
    return multiConnectionRef.id;
  } catch (error) {
    console.error('Migration error:', error);
    
    // 오류 로그 생성
    await setDoc(doc(db, 'migrationLogs', `error-${Date.now()}`), {
      originalConnectionId: connectionId,
      error: (error as Error).message,
      migratedAt: serverTimestamp(),
      status: 'ERROR'
    });
    
    throw error;
  }
}

/**
 * 마이그레이션 결과 검증 함수
 * @param originalConnectionId 원본 Connection ID
 * @param newMultiConnectionId 새 MultiConnection ID
 * @returns 검증 결과 객체
 */
export async function validateMigration(
  originalConnectionId: string, 
  newMultiConnectionId: string
): Promise<{ success: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    // 원본 연결 정보 가져오기
    const connectionRef = doc(db, 'connections', originalConnectionId);
    const connectionSnap = await getDoc(connectionRef);
    
    if (!connectionSnap.exists()) {
      issues.push(`Original connection not found: ${originalConnectionId}`);
      return { success: false, issues };
    }
    
    const connection = connectionSnap.data() as Connection;
    
    // 새 다대다 연결 정보 가져오기
    const multiConnectionRef = doc(db, 'multiConnections', newMultiConnectionId);
    const multiConnectionSnap = await getDoc(multiConnectionRef);
    
    if (!multiConnectionSnap.exists()) {
      issues.push(`New multi-connection not found: ${newMultiConnectionId}`);
      return { success: false, issues };
    }
    
    const multiConnection = multiConnectionSnap.data() as MultiConnection;
    
    // 부모와 돌봄 선생님의 권한 확인
    if (!multiConnection.permissions[connection.parentId]) {
      issues.push(`Parent permissions missing for: ${connection.parentId}`);
    }
    
    if (!multiConnection.permissions[connection.careProviderId]) {
      issues.push(`Care provider permissions missing for: ${connection.careProviderId}`);
    }
    
    // 아이별 돌봄 선생님 할당 확인
    if (connection.children && connection.children.length > 0) {
      const assignmentsQuery = query(
        collection(db, 'careProviderAssignments'),
        where('connectionId', '==', newMultiConnectionId)
      );
      
      const assignmentsSnap = await getDocs(assignmentsQuery);
      const assignmentsByChildId = new Map<string, boolean>();
      
      assignmentsSnap.forEach(doc => {
        const assignment = doc.data() as CareProviderAssignment;
        assignmentsByChildId.set(assignment.childId, true);
      });
      
      for (const child of connection.children) {
        if (!assignmentsByChildId.has(child.id)) {
          issues.push(`Assignment missing for child: ${child.id}`);
        }
      }
    }
    
    // 사용자 프로필 연결 ID 확인
    const parentProfileRef = doc(db, 'userProfiles', connection.parentId);
    const parentProfileSnap = await getDoc(parentProfileRef);
    
    if (parentProfileSnap.exists()) {
      const parentProfile = parentProfileSnap.data() as UserProfile;
      if (parentProfile.connectionId !== newMultiConnectionId) {
        issues.push(`Parent profile has incorrect connectionId: ${parentProfile.connectionId}`);
      }
    } else {
      issues.push(`Parent profile not found: ${connection.parentId}`);
    }
    
    const providerProfileRef = doc(db, 'userProfiles', connection.careProviderId);
    const providerProfileSnap = await getDoc(providerProfileRef);
    
    if (providerProfileSnap.exists()) {
      const providerProfile = providerProfileSnap.data() as UserProfile;
      if (providerProfile.connectionId !== newMultiConnectionId) {
        issues.push(`Provider profile has incorrect connectionId: ${providerProfile.connectionId}`);
      }
    } else {
      issues.push(`Provider profile not found: ${connection.careProviderId}`);
    }
    
    return {
      success: issues.length === 0,
      issues
    };
  } catch (error) {
    issues.push(`Validation error: ${(error as Error).message}`);
    return { success: false, issues };
  }
}

/**
 * 모든 기존 연결을 다대다 연결로 마이그레이션하는 배치 함수
 * @returns 마이그레이션 결과 배열
 */
export async function migrateAllConnections(): Promise<
  Array<{ originalId: string; newId: string; success: boolean }>
> {
  const results: Array<{ originalId: string; newId: string; success: boolean }> = [];
  
  try {
    // 모든 기존 연결 가져오기
    const connectionsQuery = query(collection(db, 'connections'));
    const connectionsSnap = await getDocs(connectionsQuery);
    
    console.log(`Found ${connectionsSnap.size} connections to migrate`);
    
    // 각 연결에 대해 마이그레이션 수행
    for (const connectionDoc of connectionsSnap.docs) {
      const connectionId = connectionDoc.id;
      
      try {
        console.log(`Migrating connection: ${connectionId}`);
        const newId = await convertConnectionToMulti(connectionId);
        
        // 검증
        const validation = await validateMigration(connectionId, newId);
        
        results.push({
          originalId: connectionId,
          newId,
          success: validation.success
        });
        
        if (!validation.success) {
          console.warn(`Validation issues for ${connectionId}:`, validation.issues);
        }
      } catch (error) {
        console.error(`Failed to migrate connection ${connectionId}:`, error);
        results.push({
          originalId: connectionId,
          newId: '',
          success: false
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Batch migration error:', error);
    throw error;
  }
}