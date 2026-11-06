# 02. 질문 등록과 조회

`Question` 모델을 직접 설계하고, 작성자와 `ForeignKey`로 연결합니다.

## 설계 질문

코드를 쓰기 전에 답을 적고 리뷰를 받으세요.

- 질문 본문은 필요할까요? 선택지 두 개만으로 충분할까요?
- 선택지 저장 방식은 무엇이 좋을까요?
  - `Question`에 `option_a`, `option_b` 필드로 저장
  - 별도 `Choice` 모델로 분리
- 글자 수 제한은 얼마가 적당할까요? 휴대폰 화면에서 어떻게 보일까요?
- 작성자가 탈퇴하면 질문은 어떻게 될까요? `on_delete`로 무엇을 고를까요?
- 기본 정렬은 무엇이 좋을까요?
- 작성 시각과 수정 시각이 모두 필요할까요?

<details>
<summary>힌트: 선택지 저장 방식 비교</summary>

| | 필드 두 개 | `Choice` 모델 |
|---|---|---|
| 구현 | 단순함 | 관계가 하나 늘어남 |
| 투표 저장 | `"A"`, `"B"` 같은 값 | `Choice`로 `ForeignKey` |
| 잘못된 선택지 방지 | `choices` 검증 | 다른 질문의 선택지인지 검사 필요 |
| 선택지 3개로 확장 | 어려움 | 쉬움 |

"밸런스 게임은 항상 둘 중 하나"라는 전제를 유지할지 생각해 보고 고르세요. 03 챕터의 투표 모델도 이 결정을 따라갑니다.

</details>

<details>
<summary>힌트: on_delete</summary>

`CASCADE`는 작성자와 함께 질문이 사라지고, 다른 사람들의 투표와 댓글도 같이 사라집니다. `SET_NULL`은 질문을 남기는 대신 `null=True`가 필요합니다. 어떤 결과를 원하는지부터 정하세요.

</details>

## 만드는 순서

1. `questions` 앱을 만들고 `INSTALLED_APPS`에 추가합니다.
2. 모델을 작성하고 `makemigrations`, `migrate`를 실행합니다.
3. Admin에 등록하고 질문을 몇 개 직접 넣어 봅니다.
4. Serializer를 작성합니다.
5. 목록·상세·등록 API를 만듭니다.
6. 테스트를 작성합니다.
7. Next.js 화면을 연결합니다.

## API 명세

| 메서드 | 주소 | 권한 | 성공 응답 |
|---|---|---|---|
| GET | `/api/questions` | 누구나 | 200, 질문 목록 |
| POST | `/api/questions` | 로그인 | 201, 생성된 질문 |
| GET | `/api/questions/{id}` | 누구나 | 200, 질문 상세 |

## 구현 힌트

<details>
<summary>힌트: 어떤 뷰를 쓸까</summary>

`ListCreateAPIView`, `RetrieveAPIView` 같은 제네릭 뷰로 충분합니다. `ViewSet`을 쓴다면 `DefaultRouter(trailing_slash=False)`로 등록해야 끝 슬래시가 붙지 않습니다.

</details>

<details>
<summary>힌트: 작성자 저장</summary>

작성자는 클라이언트가 보낸 값을 받으면 안 됩니다. Serializer에서 읽기 전용으로 두고, 뷰의 `perform_create`에서 `serializer.save(author=self.request.user)`로 넣습니다.

</details>

<details>
<summary>힌트: 두 선택지 비교 검증</summary>

필드 두 개를 함께 비교하므로 Serializer의 `validate()`가 알맞습니다. 대소문자나 앞뒤 공백만 다른 경우도 같은 내용으로 볼지 정하세요.

</details>

## 화면

- 목록, 상세, 등록 화면을 만듭니다.
- 등록 화면은 로그인한 사용자만 사용할 수 있게 하되, 이 처리는 사용성을 위한 것입니다. 실제 보호는 API의 권한이 맡습니다.
- 없는 질문은 Next.js의 404 화면으로 처리합니다.
- API 검증 오류는 `{"필드명": ["메시지"]}` 형태로 오니 폼 필드별로 표시합니다.

## 테스트

- 비로그인 사용자의 등록 요청은 403
- 로그인 사용자의 등록은 201
- 요청에 다른 사용자의 `author`를 넣어도 로그인한 사용자로 저장
- 두 선택지가 같으면 400
- 글자 수 제한을 넘으면 400
- 없는 질문 조회는 404

## 완료 확인

- [ ] 로그인한 사용자만 질문을 등록할 수 있다.
- [ ] 요청에 다른 작성자를 넣어도 로그인한 사용자로 저장된다.
- [ ] 두 선택지가 같은 내용이면 등록되지 않는다.
- [ ] 없는 질문을 조회하면 API는 404를 응답하고, 화면에는 404 페이지가 나온다.

## 공식 문서

- [DRF Serializer](https://www.django-rest-framework.org/api-guide/serializers/)
- [DRF 제네릭 뷰](https://www.django-rest-framework.org/api-guide/generic-views/)
