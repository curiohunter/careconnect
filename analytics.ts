// Analytics 및 모니터링 설정
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { getPerformance, trace } from 'firebase/performance';
import app from './firebase';

let analytics: any = null;
let performance: any = null;

// 프로덕션 환경에서만 Analytics 초기화
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  try {
    analytics = getAnalytics(app);
    performance = getPerformance(app);
    console.log('✅ Analytics 및 Performance 모니터링 활성화');
  } catch (error) {
    console.warn('Analytics 초기화 실패:', error);
  }
}

// 사용자 추적 함수들
export const trackUser = (userId: string, properties?: Record<string, any>) => {
  if (!analytics) return;
  
  setUserId(analytics, userId);
  if (properties) {
    setUserProperties(analytics, properties);
  }
};

// 사용자 행동 추적
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (!analytics) return;
  
  logEvent(analytics, eventName, {
    timestamp: Date.now(),
    ...parameters
  });
};

// 주요 사용자 액션 추적 함수들
export const trackLogin = (method: 'google' | 'email') => {
  trackEvent('login', { method });
};

export const trackSignup = (method: 'google' | 'email') => {
  trackEvent('sign_up', { method });
};

export const trackConnectionCreated = (userType: 'parent' | 'caregiver') => {
  trackEvent('connection_created', { user_type: userType });
};

export const trackScheduleUpdated = (scheduleType: 'meal' | 'medication' | 'special') => {
  trackEvent('schedule_updated', { schedule_type: scheduleType });
};

export const trackInviteCodeUsed = () => {
  trackEvent('invite_code_used');
};

// 성능 측정 함수들
export const startTrace = (traceName: string) => {
  if (!performance) return null;
  
  try {
    return trace(performance, traceName);
  } catch (error) {
    console.warn('성능 추적 시작 실패:', error);
    return null;
  }
};

export const stopTrace = (traceInstance: any) => {
  if (!traceInstance) return;
  
  try {
    traceInstance.stop();
  } catch (error) {
    console.warn('성능 추적 종료 실패:', error);
  }
};

// 자동 성능 측정 래퍼
export const measurePerformance = async <T>(
  traceName: string, 
  fn: () => Promise<T>
): Promise<T> => {
  const traceInstance = startTrace(traceName);
  
  try {
    const result = await fn();
    stopTrace(traceInstance);
    return result;
  } catch (error) {
    stopTrace(traceInstance);
    throw error;
  }
};

// 에러 추적
export const trackError = (error: Error, context?: string) => {
  trackEvent('exception', {
    description: error.message,
    fatal: false,
    context: context || 'unknown'
  });
  
  console.error('추적된 에러:', error, '컨텍스트:', context);
};