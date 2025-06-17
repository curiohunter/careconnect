// Firebase 설정
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase 설정 - 환경변수 사용으로 보안 강화
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBM9c0Ik-UmH-696jDEToifiodRQ_evZ1M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "careconnect-444da.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "careconnect-444da",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "careconnect-444da.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "546857093781",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:546857093781:web:e1bad981e034a4b21aa99c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MJ1HPK498V"
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
    console.log('FCM 초기화 실패:', error);
  }
}

export { messaging };

// FCM 토큰 요청
export const requestFCMToken = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'your-vapid-key'
      });
      return token;
    }
  } catch (error) {
    console.error('FCM 토큰 요청 실패:', error);
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
