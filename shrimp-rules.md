# CareConnect 개발 가이드라인

## 프로젝트 개요

### 기술 스택
- **Frontend**: React 19.1.0 + TypeScript 5.7.2 + Vite 6.2.0
- **Backend**: Firebase 10.8.0 (Auth, Firestore, FCM)
- **라우팅**: React Router DOM 7.6.2 (Hash 라우팅)
- **스타일링**: Tailwind CSS
- **AI 통합**: Gemini API
- **알림**: React Hot Toast 2.4.1

### 핵심 기능
- 부모와 돌봄제공자 매칭 시스템
- 실시간 스케줄 관리 (식단, 투약, 활동)
- Firebase 기반 실시간 데이터 동기화
- FCM 푸시 알림

## 파일 수정 우선순위

### 필수 수정 순서
1. **types.ts** - 모든 타입 정의 먼저 수정
2. **services/** - Firebase 서비스 레이어 업데이트
3. **hooks/** - Custom hooks 수정
4. **components/** - UI 컴포넌트 마지막 수정

### 주요 파일 역할
- `types.ts` - 모든 인터페이스 및 enum 중앙 관리
- `firebase.ts` - Firebase 설정 및 초기화
- `App.tsx` - 라우팅 및 인증 플로우
- `hooks/useAuth.tsx` - 인증 상태 관리
- `hooks/useData.ts` - 데이터 CRUD 작업
- `services/authService.ts` - 인증 비즈니스 로직
- `services/dataService.ts` - Firestore 데이터 조작

## 컴포넌트 개발 패턴

### 명명 규칙
- **컴포넌트**: PascalCase (예: `MedicationCard.tsx`)
- **Hook**: camelCase, 'use' 접두사 (예: `useAuth.tsx`)
- **타입**: PascalCase (예: `UserProfile`)
- **Enum**: PascalCase (예: `UserType`)

### 컴포넌트 구조
```typescript
import React from 'react';
import { 필요한_타입들 } from '../types';

interface ComponentProps {
  // Props 타입 정의 필수
}

const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 컴포넌트 로직
  return (
    <div className="tailwind-classes">
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

### Props 타입 정의 규칙
- 모든 Props는 인터페이스로 명시적 정의
- Optional props는 `?` 사용
- 함수 props는 화살표 함수 타입 명시
- children이 필요한 경우 `React.ReactNode` 사용

## Firebase 통합 규칙

### 데이터 구조 규칙
- Firestore 컬렉션명은 camelCase 사용
- 문서 ID는 자동 생성 또는 UUID 사용
- 날짜는 `YYYY-MM-DD` 형식 문자열 저장
- 중첩 객체 깊이 3단계 이하 유지

### 실시간 업데이트 패턴
- `onSnapshot` 사용하여 실시간 리스너 구현
- 컴포넌트 언마운트시 반드시 `unsubscribe()` 호출
- `useEffect` 의존성 배열에 필요한 값만 포함

### 에러 처리 규칙
- 모든 Firebase 작업에 try-catch 블록 사용
- `react-hot-toast`로 사용자 친화적 에러 메시지 표시
- `errorMonitor.ts`를 통한 에러 로깅 구현

## 백업 및 배포 프로세스

### 백업 파일 관리
- **절대 금지**: `.backup` 파일 삭제
- 컴포넌트 수정 전 백업 파일 생성 권장
- 백업 파일명: `ComponentName.tsx.backup`

### 배포 전 검증 단계
1. `npm run type-check` - TypeScript 컴파일 에러 확인
2. `npm run build` - 빌드 성공 여부 확인
3. Firebase 규칙 검증
4. 환경변수 설정 확인

### 배포 스크립트 사용
- **개발**: `npm run deploy:dev`
- **프로덕션**: `npm run deploy:prod`
- **백업**: `npm run backup:prod`

## 코드 품질 기준

### TypeScript 엄격 모드
- `strict: true` 설정 준수
- 모든 변수에 명시적 타입 지정
- `any` 타입 사용 금지
- Union 타입 적극 활용

### 컴포넌트 분리 원칙
- 단일 책임 원칙 준수
- 200줄 이상 컴포넌트는 분리 검토
- 재사용 가능한 로직은 Custom Hook으로 추출
- Props drilling 3단계 이상 시 Context 사용 검토

### 스타일링 규칙
- Tailwind CSS 유틸리티 클래스 우선 사용
- 인라인 스타일 사용 금지
- 반응형 디자인 모바일 퍼스트 적용
- 다크모드 고려한 색상 사용

## 금지사항 및 주의사항

### 절대 금지
- **localStorage/sessionStorage** 사용 (Firebase 우선)
- **직접 DOM 조작** (React 패러다임 위반)
- **백업 파일 삭제** (복구 불가능)
- **프로덕션 환경변수 하드코딩**
- **Firebase 실시간 리스너 정리 누락**

### 신중히 사용
- **useEffect 의존성 배열** - 무한 루프 주의
- **React Router Link** - Hash 라우팅 고려
- **Firebase 쿼리** - 성능 최적화 필수
- **상태 업데이트** - 비동기 특성 고려

## 실제 작업 시나리오

### 새로운 기능 추가
1. `types.ts`에 필요한 인터페이스 정의
2. Firebase 컬렉션 구조 설계
3. `services/`에 데이터 CRUD 함수 구현
4. Custom Hook 생성 또는 수정
5. UI 컴포넌트 개발
6. 라우팅 및 네비게이션 연동

### 기존 기능 수정
1. 영향받는 타입 먼저 확인
2. 백업 파일 생성
3. 타입 수정 → 서비스 → 훅 → 컴포넌트 순서
4. TypeScript 에러 모두 해결
5. 빌드 테스트 후 배포

### 데이터 스키마 변경
1. `types.ts`에서 인터페이스 수정
2. Firebase 마이그레이션 스크립트 작성
3. 기존 컴포넌트 호환성 확인
4. 단계적 배포 진행

### 성능 최적화
1. React DevTools Profiler 활용
2. 불필요한 리렌더링 방지 (`React.memo`, `useMemo`)
3. Firebase 쿼리 최적화 (인덱스, 제한)
4. 이미지 및 번들 크기 최적화

## AI 에이전트 특별 지침

### 작업 시작 전 확인사항
- 현재 Git 브랜치 확인
- TypeScript 컴파일 에러 여부 확인
- Firebase 연결 상태 확인
- 환경변수 설정 검증

### 파일 수정 시 주의사항
- 타입 변경 시 관련 모든 파일 영향도 분석
- 컴포넌트 수정 전 props 인터페이스 검토
- Firebase 스키마 변경 시 마이그레이션 계획 수립
- 실시간 리스너 생명주기 관리 철저히

### 에러 대응 프로세스
1. TypeScript 에러 우선 해결
2. Firebase 콘솔에서 규칙 및 인덱스 확인
3. 브라우저 DevTools 콘솔 에러 검토
4. 네트워크 탭에서 API 호출 상태 확인

### 최종 검증 체크리스트
- [ ] TypeScript 컴파일 성공
- [ ] 빌드 에러 없음
- [ ] 주요 기능 동작 확인
- [ ] Firebase 실시간 동기화 테스트
- [ ] 모바일 반응형 확인