# userProfiles 문서 확인 방법

## 브라우저 콘솔에서 확인

CareConnect 앱에 로그인한 상태에서 개발자 도구 콘솔에 다음 코드를 입력하세요:

```javascript
// 현재 사용자의 userProfiles 문서 확인
(async () => {
  const { auth, db } = await import('./firebase.js');
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
  
  const user = auth.currentUser;
  if (!user) {
    console.log('로그인이 필요합니다.');
    return;
  }
  
  console.log('현재 사용자 UID:', user.uid);
  console.log('현재 사용자 이메일:', user.email);
  
  // userProfiles 문서 확인
  const userProfileRef = doc(db, 'userProfiles', user.uid);
  const userProfileDoc = await getDoc(userProfileRef);
  
  if (userProfileDoc.exists()) {
    console.log('userProfiles 문서 존재:', userProfileDoc.data());
    const data = userProfileDoc.data();
    if (data.allowedParentIds) {
      console.log('allowedParentIds:', data.allowedParentIds);
    } else {
      console.log('allowedParentIds 필드가 없습니다.');
    }
  } else {
    console.log('userProfiles 문서가 존재하지 않습니다.');
  }
  
  // users 문서도 확인
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    console.log('users 문서:', userDoc.data());
  } else {
    console.log('users 문서가 존재하지 않습니다.');
  }
})();
```

## Firebase Console에서 확인

1. https://console.firebase.google.com/project/careconnect-444da/firestore 접속
2. `userProfiles` 컬렉션 클릭
3. 본인의 사용자 ID 문서 찾기
4. `allowedParentIds` 필드 확인

## 예상 결과

정상적으로 동기화되었다면:
- `userProfiles/{userId}` 문서에 `allowedParentIds` 필드가 있어야 함
- `allowedParentIds`는 배열이고, 연결된 부모의 ID들이 포함되어야 함

예시:
```json
{
  "allowedParentIds": ["parent-user-id-1", "parent-user-id-2"],
  "updatedAt": "2025-06-19T06:40:00.000Z"
}
```