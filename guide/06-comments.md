# 06. 댓글

여러 모델이 연결된 API를 구현하고 쿼리 수를 관리합니다.

## 설계 질문

- `Comment`는 어떤 필드로 구성될까요?
- 투표하지 않은 사용자도 댓글을 읽을 수 있어야 할까요? 댓글에 작성자의 선택이 표시되면 결과가 미리 드러나지 않을까요?
- 작성자의 선택은 어떻게 가져올까요? `Vote`를 매번 조회할까요, `Comment`가 `Vote`를 가리키게 할까요?
- 작성자가 탈퇴하면 댓글은 어떻게 될까요?
- 댓글은 수정할 수 있어야 할까요? README 계획에는 작성과 삭제만 있습니다.

<details>
<summary>힌트: 작성자의 선택 가져오기</summary>

`Comment`에 `ForeignKey`로 `Vote`를 연결하면 `select_related`로 한 번에 가져올 수 있습니다. `Vote`가 없는 댓글은 만들 수 없다는 규칙도 모델에 드러납니다. 대신 `Vote`가 삭제될 때의 동작을 정해야 합니다.

연결하지 않는다면 댓글 작성자 목록으로 `Vote`를 한 번에 조회해 딕셔너리로 합치거나, `Subquery`로 주석을 다는 방법이 있습니다.

</details>

## API 명세

| 메서드 | 주소 | 권한 | 성공 응답 |
|---|---|---|---|
| GET | `/api/questions/{id}/comments` | 설계에 따라 결정 | 200, 댓글 목록 |
| POST | `/api/questions/{id}/comments` | 해당 질문 투표자 | 201, 생성된 댓글 |
| DELETE | `/api/comments/{id}` | 댓글 작성자 | 204 |

## 만드는 순서

1. `Comment` 모델을 설계하고 리뷰를 받습니다.
2. 목록, 작성 API를 만듭니다.
3. 투표자만 작성하도록 제한합니다.
4. 삭제 API에 05 챕터의 권한 클래스를 재사용합니다.
5. 쿼리 수를 측정하고 줄입니다.
6. 화면을 연결합니다.

## N+1 쿼리

```text
댓글 목록 조회 1번
└ 댓글마다 작성자 조회 1번  ← 댓글이 100개면 100번 추가
```

Serializer에서 `comment.author.username`을 읽는 순간 쿼리가 나갑니다. 코드에는 반복문이 보이지 않아 놓치기 쉽습니다.

`get_queryset()`에서 `select_related`로 미리 가져오면 한 번의 조인으로 줄어듭니다. 정방향 `ForeignKey`는 `select_related`, 역방향이나 다대다는 `prefetch_related`를 씁니다.

## 쿼리 수 테스트

댓글이 늘어도 쿼리 수가 같은지 비교합니다.

```python
from django.db import connection
from django.test.utils import CaptureQueriesContext

with CaptureQueriesContext(connection) as first:
    self.client.get(url)

# 댓글을 10개 더 만든 뒤

with CaptureQueriesContext(connection) as second:
    self.client.get(url)

self.assertEqual(len(first), len(second))
```

고정된 숫자보다 두 번의 쿼리 수를 비교하는 편이, 세션 조회 같은 다른 쿼리가 바뀌어도 잘 깨지지 않습니다.

## 테스트

- 투표자의 댓글 작성 성공
- 투표하지 않은 사용자의 작성 거부
- 다른 질문에 투표한 사용자의 작성 거부
- 다른 사람의 댓글 삭제 거부
- 빈 댓글, 너무 긴 댓글 거부
- 응답의 작성자 선택이 정확함
- 댓글 수가 늘어도 쿼리 수가 같음

## 완료 확인

- [ ] 다른 사람의 댓글은 삭제할 수 없다.
- [ ] 투표하지 않은 사용자가 API를 직접 호출해도 댓글을 작성할 수 없다.
- [ ] 투표 전 사용자에게 공개하기로 정한 범위를 API가 지킨다.
- [ ] 댓글 수가 늘어나도 API의 쿼리 수가 함께 늘지 않는다.

## 공식 문서

- [`select_related`, `prefetch_related`](https://docs.djangoproject.com/en/5.2/ref/models/querysets/)
- [Django 테스트 도구](https://docs.djangoproject.com/en/5.2/topics/testing/tools/)
