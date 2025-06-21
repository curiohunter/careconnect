// Firebase 설정
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { logger } from './errorMonitor';

// 필수 환경변수 검증
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY'
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`필수 환경변수 ${envVar}가 설정되지 않았습니다. .env 파일을 확인해주세요.`);
  }
}

// Firebase 설정 - 환경변수만 사용 (보안 강화)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 초기화
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// 구글 로그인 설정
googleProvider.addScope('email');
googleProvider.addScope('profile');

// 개발 환경에서 에뮬레이터 사용 (선택사항)
if (import.meta.env.DEV) {
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

// FCM 초기화 (브라우저 환경에서만)
let messaging: any = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    logger.error(error as Error, 'firebase', 'initializeMessaging');
  }
}

export { messaging };

// FCM 토큰 요청
export const requestFCMToken = async () => {
  if (!messaging) return null;
  
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    // VAPID 키 유효성 검사
    if (!vapidKey || vapidKey === 'PLACEHOLDER_VAPID_KEY') {
      logger.warn('VAPID 키가 설정되지 않았습니다. Firebase Console에서 Web Push certificates를 생성하고 환경변수에 설정해주세요.');
      logger.warn('1. Firebase Console > Project Settings > Cloud Messaging');
      logger.warn('2. Web Push certificates > Generate key pair');
      logger.warn('3. 생성된 키를 VITE_FIREBASE_VAPID_KEY 환경변수에 설정');
      return null;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: vapidKey
      });
      return token;
    }
  } catch (error) {
    logger.error(error as Error, 'firebase', 'requestFCMToken');
  }
  return null;
};

// 포그라운드 메시지 수신
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export default app;
