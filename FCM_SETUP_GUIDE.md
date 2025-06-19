# Firebase Cloud Messaging (FCM) VAPID 키 설정 가이드

## 개요
CareConnect 앱에서 푸시 알림 기능을 활성화하려면 Firebase Console에서 VAPID 키를 생성하고 환경변수에 설정해야 합니다.

## 설정 단계

### 1. Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. `careconnect-444da` 프로젝트 선택

### 2. Cloud Messaging 설정 페이지 이동
1. 프로젝트 설정 (⚙️ 아이콘) 클릭
2. "Cloud Messaging" 탭 클릭

### 3. Web Push certificates 생성
1. "Web Push certificates" 섹션 찾기
2. "Generate key pair" 버튼 클릭
3. 생성된 키 복사 (형식: 길긴 문자열, 예: `BJ7j...`)

### 4. 환경변수 설정
생성된 VAPID 키를 다음 파일들에 설정:

#### `.env` (개발 환경)
```
VITE_FIREBASE_VAPID_KEY=생성된_VAPID_키
```

#### `.env.production` (프로덕션 환경)
```
VITE_FIREBASE_VAPID_KEY=생성된_VAPID_키
```

### 5. 설정 확인
1. 개발 서버 재시작: `npm run dev`
2. 브라우저 개발자 도구 콘솔에서 VAPID 키 관련 경고 메시지 확인
3. 알림 권한 요청 테스트

## 주의사항
- VAPID 키는 Base64로 인코딩된 68자 길이의 문자열입니다
- 키가 올바르지 않으면 FCM 토큰 생성이 실패합니다
- 개발/프로덕션 환경 모두 동일한 키를 사용해야 합니다

## 문제 해결
- 키 생성이 안 되는 경우: Firebase 프로젝트의 Cloud Messaging API가 활성화되어 있는지 확인
- 토큰 생성 실패: 브라우저가 HTTPS 환경인지 확인 (localhost는 예외)
- 알림이 오지 않는 경우: 브라우저 알림 권한이 허용되어 있는지 확인

## 현재 상태
- ✅ FCM 초기화 구조 설정 완료
- ✅ 환경변수 검증 로직 추가
- ⏳ **VAPID 키 생성 필요** - Firebase Console에서 수동 생성 후 환경변수 설정
- ⏳ 푸시 알림 테스트 대기 중