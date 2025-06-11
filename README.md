# CareConnect (케어커넥트)

돌봄 선생님과 부모 간의 통합 정보 공유 앱

## 🚀 프로젝트 개요

CareConnect는 돌봄 선생님과 부모 사이의 원활한 정보 공유를 통해 아이돌봄의 질을 향상시키고, 모든 필수 정보를 단일 화면에서 효율적으로 관리할 수 있는 통합 플랫폼입니다.

## ✨ 주요 기능

### 👥 사용자 관리
- **이메일 기반 회원가입/로그인**
- **사용자 유형 구분** (부모/돌봄 선생님)
- **초대 코드를 통한 연결 시스템**

### 📅 일정 관리
- **주간 아이 일정표** (기관 활동 + 하원 후 활동)
- **실시간 일정 동기화**
- **다중 아이 지원**

### 🍽️ 식사 관리
- **주간 식사 메뉴 계획**
- **특이사항 및 알러지 정보**

### 💊 투약 관리
- **투약 정보 등록** (증상, 약 종류, 용량, 시간, 보관방법)
- **투약 완료 체크리스트**
- **실시간 상태 업데이트**

### 🕐 근무 관리
- **기본 근무 일정 설정** (돌봄 선생님용)
- **연장 근무 요청**
- **휴가 신청**
- **안내사항 공유**

## 🛠️ 기술 스택

- **Frontend**: React 19.1.0 + TypeScript
- **Routing**: React Router DOM 7.6.2
- **Styling**: Tailwind CSS (Utility Classes)
- **Backend**: Firebase
  - Authentication (이메일/비밀번호)
  - Firestore (실시간 데이터베이스)
  - Cloud Messaging (푸시 알림)
- **State Management**: React Hooks + Context API
- **UI Components**: Custom Components + Lucide React Icons
- **Notifications**: React Hot Toast
- **Build Tool**: Vite 6.2.0

## 📱 프로젝트 구조

```
src/
├── components/           # UI 컴포넌트
│   ├── icons/           # 아이콘 컴포넌트
│   ├── AuthScreen.tsx   # 로그인/회원가입
│   ├── Dashboard.tsx    # 메인 대시보드
│   ├── TopSection.tsx   # 주간 일정 섹션
│   ├── MiddleSection.tsx # 식사/투약 섹션
│   ├── BottomSection.tsx # 근무 관리 섹션
│   └── ...
├── hooks/               # Custom Hooks
│   ├── useAuth.tsx      # 인증 관리
│   └── useData.ts       # 데이터 관리
├── services/            # Firebase 서비스
│   ├── authService.ts   # 인증 서비스
│   └── dataService.ts   # 데이터 서비스
├── types.ts             # TypeScript 타입 정의
├── constants.ts         # 상수 정의
├── firebase.ts          # Firebase 설정
└── App.tsx             # 메인 앱 컴포넌트
```

## 🔥 Firebase 설정 필요 사항

Firebase Studio에서 자동으로 설정해야 할 서비스들:

### Authentication
- Email/Password 인증 활성화
- 사용자 등록 허용

### Firestore Database
컬렉션 구조:
```
users/              # 사용자 프로필
connections/        # 부모-돌봄선생님 연결
inviteCodes/        # 초대 코드
children/           # 아이 정보
weeklySchedules/    # 주간 일정
mealPlans/          # 식사 계획
medications/        # 투약 정보
specialSchedules/   # 특별 일정 (연장근무, 휴가, 안내)
workSchedules/      # 기본 근무 일정
```

### Cloud Messaging (FCM)
- 웹 푸시 알림 설정
- VAPID 키 생성

### Security Rules
- 사용자 인증 기반 접근 제어
- 연결된 사용자 간 데이터 공유만 허용

## 🚀 배포 준비

이 프로젝트는 Firebase Hosting으로 배포 가능하도록 설정되어 있습니다:

- **PWA 지원** (추가 설정 필요)
- **반응형 디자인**
- **오프라인 지원** (Service Worker 추가 예정)

## 📋 환경 변수 설정

Firebase Studio에서 자동 생성할 환경 변수들:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=
```

## 🎯 핵심 특징

- **실시간 동기화**: 모든 데이터 변경사항이 즉시 반영
- **단일 페이지 인터페이스**: 탭 전환 없이 모든 정보 접근
- **모바일 최적화**: 반응형 디자인으로 모든 기기 지원
- **직관적 UX**: 별도 튜토리얼 없이도 사용 가능
- **보안**: Firebase 기반 안전한 데이터 관리

## 🔧 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 미리보기
npm run preview
```

---

**Firebase Studio에서 이 프로젝트를 분석하고 자동으로 Firebase 설정을 생성해주세요!** 🔥
