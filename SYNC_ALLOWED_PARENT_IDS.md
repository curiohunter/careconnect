# allowedParentIds 동기화 가이드

## 보안 규칙 업데이트 내용

parentId 기반 데이터 접근을 위해 Firestore 보안 규칙이 업데이트되었습니다:
- 부모는 자신의 parentId 데이터에 직접 접근 가능
- 돌봄선생님은 `userProfiles/{userId}/allowedParentIds` 배열에 포함된 parentId만 접근 가능

## 수동 동기화 방법

현재 로그인한 돌봄선생님의 allowedParentIds를 동기화하려면:

1. CareConnect 앱에 돌봄선생님 계정으로 로그인
2. 브라우저 개발자 도구 콘솔 열기 (F12)
3. 다음 코드 실행:

```javascript
// 현재 로그인한 사용자의 allowedParentIds 동기화
(async () => {
  const { auth, db } = await import('/firebase.ts');
  const { collection, query, where, getDocs, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
  
  const user = auth.currentUser;
  if (!user) {
    console.log('로그인이 필요합니다.');
    return;
  }
  
  console.log('현재 사용자:', user.email);
  
  // 현재 사용자의 연결 찾기
  const connectionsQuery = query(
    collection(db, 'connections'),
    where('careProviderId', '==', user.uid)
  );
  
  const connectionsSnapshot = await getDocs(connectionsQuery);
  const parentIds = [];
  
  connectionsSnapshot.forEach(connDoc => {
    const connData = connDoc.data();
    if (connData.parentId) {
      parentIds.push(connData.parentId);
    }
  });
  
  console.log('연결된 부모 ID들:', parentIds);
  
  // userProfiles에 저장
  if (parentIds.length > 0) {
    const userProfileRef = doc(db, 'userProfiles', user.uid);
    await setDoc(userProfileRef, {
      allowedParentIds: parentIds,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log('✅ allowedParentIds 동기화 완료!');
    console.log('페이지를 새로고침하면 정상적으로 데이터에 접근할 수 있습니다.');
  } else {
    console.log('연결된 부모가 없습니다.');
  }
})();
```

4. 페이지 새로고침

## 자동 동기화

앞으로는 다음 상황에서 자동으로 동기화됩니다:
- 새로운 연결 생성 시
- 로그인 시 (돌봄선생님인 경우)

## 문제 해결

여전히 "Missing or insufficient permissions" 오류가 발생하면:
1. 위 스크립트가 성공적으로 실행되었는지 확인
2. Firebase Console에서 userProfiles 컬렉션 확인
3. 해당 사용자 문서에 allowedParentIds 필드가 올바르게 설정되었는지 확인