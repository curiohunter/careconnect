// 에러 모니터링 및 로깅 시스템
import React from 'react';
import { trackError } from './analytics';

// 환경 변수 확인
const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';

export interface ErrorLog {
  id: string;
  timestamp: number;
  userId?: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    url: string;
    userAgent: string;
    component?: string;
    action?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorMonitor {
  private errorQueue: ErrorLog[] = [];
  private maxQueueSize = 100;

  constructor() {
    // 전역 에러 핸들러 설정
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }
  }

  // 전역 JavaScript 에러 처리
  private handleGlobalError(event: ErrorEvent) {
    this.logError(event.error || new Error(event.message), {
      component: 'global',
      action: 'javascript_error'
    }, 'high');
  }

  // Promise rejection 처리
  private handlePromiseRejection(event: PromiseRejectionEvent) {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.logError(error, {
      component: 'global',
      action: 'promise_rejection'
    }, 'high');
  }

  // 에러 로깅
  logError(
    error: Error, 
    context: { component?: string; action?: string } = {},
    severity: ErrorLog['severity'] = 'medium'
  ) {
    const errorLog: ErrorLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      severity
    };

    // 큐에 추가
    this.errorQueue.push(errorLog);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // 오래된 에러 제거
    }

    // Analytics로 전송
    trackError(error, context.component);

    // 개발 환경에서만 상세 에러 로그 출력
    if (isDevelopment) {
      console.error('🚨 에러 모니터링:', errorLog);
    } else {
      // 프로덕션에서는 간단한 에러 메시지만
      console.error('에러 발생:', error.message);
    }

    // 심각한 에러는 즉시 알림
    if (severity === 'critical') {
      this.handleCriticalError(errorLog);
    }
  }

  // 심각한 에러 처리
  private handleCriticalError(errorLog: ErrorLog) {
    // 여기에 슬랙, 이메일 등 즉시 알림 로직 추가 가능
    console.error('🔥 CRITICAL ERROR:', errorLog);
    
    // 사용자에게 친화적인 에러 메시지 표시
    this.showUserFriendlyError();
  }

  // 사용자 친화적 에러 메시지
  private showUserFriendlyError() {
    // 실제 구현에서는 토스트 메시지나 모달로 표시
    console.log('사용자에게 표시할 에러 메시지: 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  // 현재 사용자 ID 가져오기
  private getCurrentUserId(): string | undefined {
    try {
      // Firebase Auth에서 현재 사용자 정보 가져오기
      const user = JSON.parse(localStorage.getItem('firebase:authUser') || '{}');
      return user.uid;
    } catch {
      return undefined;
    }
  }

  // 에러 로그 조회
  getErrorLogs(): ErrorLog[] {
    return [...this.errorQueue];
  }

  // 에러 로그 초기화
  clearErrorLogs() {
    this.errorQueue = [];
  }

  // 특정 심각도 이상의 에러만 조회
  getErrorsBySeverity(minSeverity: ErrorLog['severity']): ErrorLog[] {
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minLevel = severityOrder[minSeverity];
    
    return this.errorQueue.filter(
      error => severityOrder[error.severity] >= minLevel
    );
  }

  // 개발 환경에서만 디버그 로그 출력
  debug(...args: any[]) {
    if (isDevelopment) {
      console.log('🔍', ...args);
    }
  }

  // 개발 환경에서만 정보 로그 출력
  info(...args: any[]) {
    if (isDevelopment) {
      console.log('ℹ️', ...args);
    }
  }

  // 개발 환경에서만 성공 로그 출력
  success(...args: any[]) {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  }

  // 항상 경고 로그 출력 (프로덕션에서도 필요)
  warn(...args: any[]) {
    console.warn('⚠️', ...args);
  }
}

// 전역 에러 모니터 인스턴스
export const errorMonitor = new ErrorMonitor();

// 편의 함수들
export const logError = (error: Error, component?: string, action?: string) => {
  errorMonitor.logError(error, { component, action });
};

export const logCriticalError = (error: Error, component?: string, action?: string) => {
  errorMonitor.logError(error, { component, action }, 'critical');
};

// 편의 로그 함수들
export const logger = {
  debug: (...args: any[]) => errorMonitor.debug(...args),
  info: (...args: any[]) => errorMonitor.info(...args),
  success: (...args: any[]) => errorMonitor.success(...args),
  warn: (...args: any[]) => errorMonitor.warn(...args),
  error: (error: Error, component?: string, action?: string) => errorMonitor.logError(error, { component, action })
};

// React 컴포넌트용 에러 바운더리 HOC
export const withErrorBoundary = function<P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<{ error: Error }>
) {
  return class ErrorBoundary extends React.Component<P, { hasError: boolean; error?: Error }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
      logError(error, 'react_component', Component.name);
    }

    render() {
      if (this.state.hasError) {
        if (fallbackComponent) {
          const FallbackComponent = fallbackComponent;
          return React.createElement(FallbackComponent, { error: this.state.error! });
        }
        return React.createElement('div', null, '오류가 발생했습니다. 페이지를 새로고침해주세요.');
      }

      return React.createElement(Component, this.props);
    }
  };
};