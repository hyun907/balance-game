# 05. 내 질문 관리와 권한

"로그인했는가"(인증)와 "권한이 있는가"(인가)를 구분해서 처리합니다.

| 상황 | 인증 | 인가 |
|---|---|---|
| 비로그인 사용자가 수정 | 실패 | 확인 전에 거부 |
| 로그인한 다른 사용자가 수정 | 통과 | 실패 |
| 작성자가 수정 | 통과 | 통과 |

## 설계 질문

- 투표가 시작된 질문을 수정할 수 있어야 할까요? 100명이 투표한 뒤 선택지가 바뀌면 결과는 무슨 의미일까요?
- 투표가 시작된 질문을 삭제할 수 있어야 할까요?
- 다른 사람의 질문을 수정하려 할 때 403과 404 중 무엇이 알맞을까요?

<details>
<summary>힌트: 수정 정책 예시</summary>

- 투표가 시작되면 선택지 수정을 금지
- 오타만 고치도록 짧은 시간 동안 허용
- 수정은 전면 금지하고 삭제 후 다시 등록

어느 쪽이든 정책을 정한 이유를 README나 `notes/`에 적어 두세요.

</details>

<details>
<summary>힌트: 403과 404</summary>

질문은 누구나 볼 수 있으니 존재를 숨길 필요가 없습니다. 이럴 때는 403이 의미를 더 정확히 전달합니다. 비공개 자료처럼 존재 자체를 숨겨야 한다면 404를 씁니다.

</details>

## API 명세

| 메서드 | 주소 | 권한 | 성공 응답 |
|---|---|---|---|
| GET | `/api/users/me/questions` | 로그인 | 200, 내 질문 목록 |
| PATCH | `/api/questions/{id}` | 작성자 | 200, 수정된 질문 |
| DELETE | `/api/questions/{id}` | 작성자 | 204 |

## 만드는 순서

1. `questions/permissions.py`에 권한 클래스를 만듭니다.
2. 상세 뷰가 PATCH와 DELETE를 받도록 바꿉니다.
3. 수정 정책을 구현합니다.
4. 내 질문 목록 API를 만듭니다.
5. 권한 테스트를 작성합니다.
6. 화면을 연결합니다.

## 구현 힌트

<details>
<summary>힌트: 권한 클래스</summary>

`BasePermission`을 상속해 `has_object_permission(self, request, view, obj)`를 구현합니다. 읽기 요청은 `permissions.SAFE_METHODS`로 구분합니다.

</details>

<details>
<summary>힌트: 객체 권한이 실행되지 않을 때</summary>

`has_object_permission`은 `get_object()`를 호출할 때 실행됩니다. 뷰에서 직접 `Question.objects.get()`으로 가져오면 권한 검사가 빠집니다. 제네릭 뷰를 쓰거나 `get_object()`를 쓰세요.

</details>

<details>
<summary>힌트: PUT을 열어 둘까</summary>

`RetrieveUpdateDestroyAPIView`는 PUT도 받습니다. PATCH만 쓸 거라면 `http_method_names`로 허용 메서드를 제한할 수 있습니다. 투표가 시작된 뒤 막아야 할 필드가 있다면 PATCH와 PUT 양쪽 경로를 모두 막아야 합니다.

</details>

## 화면

- 수정, 삭제 버튼은 작성자에게만 보이게 합니다. 상세 응답에 `is_author` 같은 값을 넣으면 편합니다.
- 삭제 전에 확인 단계를 둡니다.
- 버튼을 숨겨도 API 권한 검사는 그대로 필요합니다.

## 테스트

수정과 삭제 각각에 대해 비로그인, 다른 사용자, 작성자 세 경우를 테스트합니다.

- 비로그인은 403
- 다른 사용자는 403이고 DB 값이 그대로
- 작성자는 성공
- 정한 정책대로 투표가 시작된 질문의 수정이 처리됨
- 내 질문 목록에 다른 사용자의 질문이 나오지 않음

상태 코드만 보지 말고, 실패한 요청 후에 DB 값이 바뀌지 않았는지도 확인하세요.

## 완료 확인

- [ ] API를 직접 호출해도 남의 질문을 수정·삭제할 수 없다.
- [ ] 삭제는 DELETE 요청으로만 동작한다.
- [ ] 투표가 시작된 질문의 수정 정책이 API에서 지켜진다.
- [ ] 배포 환경에서도 같은 동작을 확인했다.

## 공식 문서

- [DRF 권한](https://www.django-rest-framework.org/api-guide/permissions/)
