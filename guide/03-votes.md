# 03. 투표와 결과

1인 1표를 애플리케이션과 DB 양쪽에서 보장하고, 결과를 집계합니다.

## 설계 질문

- `Vote`는 어떤 필드로 구성될까요? 누가, 어떤 질문의, 어떤 선택지를 골랐는지 어떻게 표현할까요?
- 1인 1표의 기준이 되는 필드 조합은 무엇일까요?
- 사용자가 탈퇴하면 그 사람의 투표는 어떻게 될까요? 결과가 바뀌어도 괜찮을까요?
- 질문이 삭제되면 투표는 어떻게 될까요?
- 이미 투표한 사용자가 다시 요청하면 어떤 상태 코드가 알맞을까요?

## 왜 애플리케이션과 DB 양쪽에서 막나

```text
요청 A: 투표 기록 있음? → 없음 ┐
요청 B: 투표 기록 있음? → 없음 ┤ 동시에 확인
요청 A: 저장                   ┘
요청 B: 저장 → 중복 투표
```

버튼을 빠르게 두 번 누르면 이런 일이 생길 수 있습니다. `UniqueConstraint`가 있으면 두 번째 저장을 DB가 거부하고, 애플리케이션은 `IntegrityError`를 잡아 정상적인 오류 응답으로 바꿉니다.

## API 명세

| 메서드 | 주소 | 권한 | 성공 응답 |
|---|---|---|---|
| POST | `/api/questions/{id}/vote` | 로그인 | 201, 결과 포함 상세 |
| GET | `/api/questions/{id}` | 누구나 | 200, 투표 상태에 따라 결과 포함 |

상세 응답 예시입니다. 필드 구성은 02 챕터의 설계에 맞게 바꾸세요.

```jsonc
// 투표 전이거나 비로그인
{ "id": 1, "my_choice": null, "results": null }

// 투표 후
{
  "id": 1,
  "my_choice": "A",
  "results": { "total": 10, "a_count": 7, "b_count": 3, "a_percent": 70, "b_percent": 30 }
}
```

## 만드는 순서

1. `Vote` 모델과 `UniqueConstraint`를 작성합니다.
2. 투표 API를 만들고 `IntegrityError`를 처리합니다.
3. `annotate`와 `Count`로 득표수를 집계합니다.
4. 상세 응답에 `my_choice`, `results`를 추가합니다.
5. 테스트를 작성합니다.
6. Next.js 투표 버튼과 결과 화면을 연결합니다.

## 구현 힌트

<details>
<summary>힌트: IntegrityError 처리</summary>

PostgreSQL은 트랜잭션 안에서 오류가 나면 그 트랜잭션을 더 쓸 수 없습니다. 저장 부분만 `transaction.atomic()`으로 감싼 뒤 그 바깥에서 `IntegrityError`를 잡습니다.

```python
try:
    with transaction.atomic():
        ...  # 저장
except IntegrityError:
    ...  # 이미 투표했다는 응답
```

</details>

<details>
<summary>힌트: 존재하지 않는 선택지</summary>

입력은 `serializers.ChoiceField`나 Serializer 검증으로 확인합니다. `Choice` 모델을 골랐다면 그 선택지가 **이 질문의 선택지인지**도 확인해야 합니다.

</details>

<details>
<summary>힌트: 득표수 집계</summary>

`Count`의 `filter` 인자를 쓰면 선택지별 개수를 한 쿼리로 구할 수 있습니다.

```python
Count("votes", filter=Q(...))
```

여러 `Count`를 조인과 함께 쓰면 값이 부풀 수 있으니, 댓글 수 등을 함께 집계할 때는 `distinct=True`를 확인하세요.

</details>

<details>
<summary>힌트: 득표율 합이 100이 되게 만들기</summary>

두 값을 각각 반올림하면 합이 100이 아닐 수 있습니다. 선택지가 두 개라면 한쪽만 계산하고 다른 쪽은 `100 - 그 값`으로 구합니다. 전체가 0표면 나눗셈을 하지 않습니다.

</details>

## 공개 범위

득표 정보는 화면에서 숨기는 것으로는 부족합니다. API 응답에 들어 있으면 개발자 도구로 볼 수 있습니다. 투표하지 않은 사용자의 응답에는 값을 아예 넣지 마세요. 02 챕터의 목록 API에 득표 정보를 추가할 때도 같은 규칙을 적용합니다.

## 테스트

- 투표 성공과 중복 투표 거부
- 비로그인 투표 거부
- `GET` 요청으로 투표되지 않음
- 없는 선택지, 없는 질문 거부
- 투표 전 응답에 득표 정보 없음
- 0표 질문의 상세 조회 정상 동작
- 7:3, 1:2처럼 나누어떨어지지 않는 경우까지 득표율 합이 100
- 애플리케이션 사전 검사 없이도 DB 제약으로 중복이 막히는지 확인

마지막 항목은 `Vote.objects.create()`를 같은 값으로 두 번 호출하고 `assertRaises(IntegrityError)`로 확인할 수 있습니다. 이때 두 번째 호출은 `transaction.atomic()` 안에 넣어야 다음 쿼리가 실패하지 않습니다.

## 완료 확인

- [ ] 같은 사용자가 같은 질문에 두 번 투표할 수 없다.
- [ ] 투표 버튼을 빠르게 연속으로 눌러도 500 오류가 나지 않는다.
- [ ] 존재하지 않는 선택지를 보내면 저장되지 않는다.
- [ ] 투표 전에는 API 응답에 득표수와 득표율이 포함되지 않는다.
- [ ] 투표가 0개여도 오류가 나지 않는다.
- [ ] 득표율 합이 100%로 표시된다.

## 공식 문서

- [제약 조건](https://docs.djangoproject.com/en/5.2/ref/models/constraints/)
- [집계](https://docs.djangoproject.com/en/5.2/topics/db/aggregation/)
