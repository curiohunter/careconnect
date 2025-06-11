import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ChildInfo, 
  ChildWeeklySchedules, 
  DailyMealPlan, 
  Medication, 
  SpecialScheduleItem, 
  WorkSchedule,
  DayOfWeek,
  Activity,
  DailyActivities
} from '../types';

// 데이터 서비스
export class DataService {
  // 아이 정보 관련
  static async saveChildren(connectionId: string, children: ChildInfo[]) {
    try {
      const batch = writeBatch(db);
      
      // 기존 아이 정보 삭제
      const existingQuery = query(
        collection(db, 'children'),
        where('connectionId', '==', connectionId)
      );
      const existingDocs = await getDocs(existingQuery);
      existingDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 새 아이 정보 저장
      children.forEach(child => {
        const childRef = doc(collection(db, 'children'));
        batch.set(childRef, {
          ...child,
          connectionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('아이 정보 저장 오류:', error);
      throw error;
    }
  }

  static async getChildren(connectionId: string): Promise<ChildInfo[]> {
    try {
      const q = query(
        collection(db, 'children'),
        where('connectionId', '==', connectionId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChildInfo[];
    } catch (error) {
      console.error('아이 정보 가져오기 오류:', error);
      throw error;
    }
  }

  // 주간 일정 관련
  static async saveWeeklySchedules(connectionId: string, schedules: ChildWeeklySchedules) {
    try {
      const docRef = doc(db, 'weeklySchedules', connectionId);
      await setDoc(docRef, {
        schedules,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('주간 일정 저장 오류:', error);
      throw error;
    }
  }

  static async getWeeklySchedules(connectionId: string): Promise<ChildWeeklySchedules> {
    try {
      const docSnap = await getDoc(doc(db, 'weeklySchedules', connectionId));
      if (docSnap.exists()) {
        return docSnap.data().schedules || {};
      }
      return {};
    } catch (error) {
      console.error('주간 일정 가져오기 오류:', error);
      throw error;
    }
  }

  static onWeeklySchedulesChange(connectionId: string, callback: (schedules: ChildWeeklySchedules) => void): Unsubscribe {
    return onSnapshot(doc(db, 'weeklySchedules', connectionId), (doc) => {
      if (doc.exists()) {
        callback(doc.data().schedules || {});
      } else {
        callback({});
      }
    });
  }

  // 식사 계획 관련
  static async saveMealPlan(connectionId: string, mealPlan: DailyMealPlan) {
    try {
      const docRef = doc(db, 'mealPlans', connectionId);
      await setDoc(docRef, {
        mealPlan,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('식사 계획 저장 오류:', error);
      throw error;
    }
  }

  static async getMealPlan(connectionId: string): Promise<DailyMealPlan | null> {
    try {
      const docSnap = await getDoc(doc(db, 'mealPlans', connectionId));
      if (docSnap.exists()) {
        return docSnap.data().mealPlan || null;
      }
      return null;
    } catch (error) {
      console.error('식사 계획 가져오기 오류:', error);
      throw error;
    }
  }

  static onMealPlanChange(connectionId: string, callback: (mealPlan: DailyMealPlan | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'mealPlans', connectionId), (doc) => {
      if (doc.exists()) {
        callback(doc.data().mealPlan || null);
      } else {
        callback(null);
      }
    });
  }

  // 투약 정보 관련
  static async addMedication(connectionId: string, medication: Omit<Medication, 'id'>) {
    try {
      const medicationRef = await addDoc(collection(db, 'medications'), {
        ...medication,
        connectionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return medicationRef.id;
    } catch (error) {
      console.error('투약 정보 추가 오류:', error);
      throw error;
    }
  }

  static async updateMedication(medicationId: string, updates: Partial<Medication>) {
    try {
      await updateDoc(doc(db, 'medications', medicationId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('투약 정보 업데이트 오류:', error);
      throw error;
    }
  }

  static async deleteMedication(medicationId: string) {
    try {
      await deleteDoc(doc(db, 'medications', medicationId));
    } catch (error) {
      console.error('투약 정보 삭제 오류:', error);
      throw error;
    }
  }

  static async getMedications(connectionId: string): Promise<Medication[]> {
    try {
      const q = query(
        collection(db, 'medications'),
        where('connectionId', '==', connectionId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
    } catch (error) {
      console.error('투약 정보 가져오기 오류:', error);
      throw error;
    }
  }

  static onMedicationsChange(connectionId: string, callback: (medications: Medication[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'medications'),
      where('connectionId', '==', connectionId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const medications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medication[];
      callback(medications);
    });
  }

  // 특별 일정 관련
  static async addSpecialScheduleItem(connectionId: string, item: Omit<SpecialScheduleItem, 'id'>) {
    try {
      const itemRef = await addDoc(collection(db, 'specialSchedules'), {
        ...item,
        connectionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return itemRef.id;
    } catch (error) {
      console.error('특별 일정 추가 오류:', error);
      throw error;
    }
  }

  static async updateSpecialScheduleItem(itemId: string, updates: Partial<SpecialScheduleItem>) {
    try {
      await updateDoc(doc(db, 'specialSchedules', itemId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('특별 일정 업데이트 오류:', error);
      throw error;
    }
  }

  static async getSpecialScheduleItems(connectionId: string): Promise<SpecialScheduleItem[]> {
    try {
      const q = query(
        collection(db, 'specialSchedules'),
        where('connectionId', '==', connectionId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];
    } catch (error) {
      console.error('특별 일정 가져오기 오류:', error);
      throw error;
    }
  }

  static onSpecialScheduleItemsChange(connectionId: string, callback: (items: SpecialScheduleItem[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'specialSchedules'),
      where('connectionId', '==', connectionId),
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpecialScheduleItem[];
      callback(items);
    });
  }

  // 근무 일정 관련
  static async saveWorkSchedule(userId: string, workSchedule: WorkSchedule) {
    try {
      const docRef = doc(db, 'workSchedules', userId);
      await setDoc(docRef, {
        workSchedule,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('근무 일정 저장 오류:', error);
      throw error;
    }
  }

  static async getWorkSchedule(userId: string): Promise<WorkSchedule | null> {
    try {
      const docSnap = await getDoc(doc(db, 'workSchedules', userId));
      if (docSnap.exists()) {
        return docSnap.data().workSchedule || null;
      }
      return null;
    } catch (error) {
      console.error('근무 일정 가져오기 오류:', error);
      throw error;
    }
  }

  static onWorkScheduleChange(userId: string, callback: (schedule: WorkSchedule | null) => void): Unsubscribe {
    return onSnapshot(doc(db, 'workSchedules', userId), (doc) => {
      if (doc.exists()) {
        callback(doc.data().workSchedule || null);
      } else {
        callback(null);
      }
    });
  }
}

export default DataService;
