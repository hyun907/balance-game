# 07. 재미 요소

친구에게 공유하고 싶어지는 기능을 붙입니다. 기능끼리 독립적이니 원하는 순서로 하나씩 만들고 배포하세요.

## API 명세

| 메서드 | 주소 | 권한 | 성공 응답 |
|---|---|---|---|
| GET | `/api/questions?sort=latest&page=1` | 누구나 | 200, 페이지 정보와 목록 |
| GET | `/api/questions?sort=popular&page=1` | 누구나 | 200, 페이지 정보와 목록 |
| GET | `/api/questions/random` | 누구나 | 200, 질문 또는 `null` |

## 1. 정렬

- "인기순"의 기준을 정합니다. 투표 수일까요, 최근 투표 수일까요?
- 허용되지 않은 `sort` 값이 오면 기본값을 쓸지 400을 응답할지 정합니다.

<details>
<summary>힌트: 정렬 구현</summary>

`annotate(vote_count=Count("votes"))`로 투표 수를 붙이고 `order_by`로 정렬합니다. 클라이언트가 보낸 값을 `order_by`에 그대로 넣지 말고, 허용된 값만 코드에서 매핑하세요. 투표 수가 같은 질문의 순서가 흔들리지 않도록 `-id` 같은 두 번째 정렬 기준을 둡니다.

</details>

## 2. 페이지네이션

`PageNumberPagination`을 적용하면 응답이 배열에서 객체로 바뀌므로, 02 챕터에서 만든 목록 화면도 함께 고칩니다.

```json
{ "count": 42, "next": "...", "previous": null, "results": [] }
```

> 응답의 `next`, `previous`는 Django가 보는 주소로 만들어져 `http://127.0.0.1:8000/...`처럼 나올 수 있습니다. 이 URL을 프론트에서 그대로 호출하지 말고, `count`와 현재 페이지 번호로 다음 요청을 계산하세요.

## 3. 랜덤 질문

- 비로그인 사용자에게는 무엇을 보여줄까요?
- 모든 질문에 투표한 사용자에게는 무엇을 보여줄까요?

<details>
<summary>힌트: 아직 투표하지 않은 질문</summary>

`Question.objects.exclude(votes__user=request.user)`처럼 제외하고, `order_by("?").first()`로 하나를 고릅니다. 질문이 수백만 개라면 느리지만 이 프로젝트 규모에서는 충분합니다. 결과가 없으면 `None`이 되니 그 경우를 응답으로 처리합니다.

</details>

## 4. 소수파·다수파 문구

"내 선택은 소수파 12%" 같은 문구는 03 챕터의 `my_choice`, `results`로 프론트에서 만들 수 있습니다. 50:50이나 나 혼자 투표한 경우에도 어색하지 않게 문구를 정하세요.

## 5. 공유 미리보기

`generateMetadata`는 서버에서 실행되므로 브라우저 쿠키 없이 Django를 호출합니다. 비로그인 응답에는 득표 정보가 없어 결과가 노출되지 않습니다.

- 서버에서는 상대 경로가 동작하지 않으니 `process.env.DJANGO_API_URL`로 전체 주소를 만듭니다.
- `generateMetadata`는 서버 컴포넌트에서만 내보낼 수 있습니다. 상세 페이지의 `page.tsx`는 서버 컴포넌트로 두고 투표 화면을 클라이언트 컴포넌트로 분리합니다.
- 없는 질문의 메타데이터 요청도 오류 없이 처리합니다.
- 메신저는 미리보기를 캐시하므로, 수정 후에도 예전 내용이 보일 수 있습니다. 새 질문의 링크로 확인하세요.

## 6. 모바일 화면

- 두 선택지가 좁은 화면에서도 비슷한 무게로 보이는지 확인합니다.
- 긴 선택지가 줄바꿈되어도 버튼이 깨지지 않게 합니다.
- 실제 휴대폰으로 가입부터 결과 확인까지 한 번에 해 봅니다.

## 테스트

- `sort`별 순서, 잘못된 `sort` 값
- 페이지 크기, 범위를 벗어난 페이지
- 랜덤 질문에 이미 투표한 질문이 나오지 않음
- 모두 투표했을 때 오류 없이 빈 응답
- 비로그인 랜덤 요청

## 완료 확인

- [ ] 질문을 전부 투표한 사용자에게도 빈 화면이나 오류가 나오지 않는다.
- [ ] 공유 미리보기에 득표수나 득표율이 노출되지 않는다.
- [ ] 휴대폰에서 투표부터 결과 확인까지 불편하지 않다.

## 공식 문서

- [DRF 페이지네이션](https://www.django-rest-framework.org/api-guide/pagination/)
- [DRF 필터링](https://www.django-rest-framework.org/api-guide/filtering/)
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
