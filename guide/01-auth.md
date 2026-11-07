# 01. 회원가입과 로그인

Django 세션 인증으로 회원가입부터 로그아웃까지 Next.js 화면에서 동작하게 합니다. 이 프로젝트에서 설정이 가장 까다로운 챕터이니, API를 하나 만들 때마다 `curl`이나 브라우저로 확인하며 진행하세요.

## 동작 흐름

```text
1. GET /api/auth/csrf      → csrftoken 쿠키 발급
2. POST /api/auth/login    → X-CSRFToken 헤더와 함께 로그인, sessionid 쿠키 발급
3. GET /api/auth/me        → 쿠키로 현재 사용자 확인
4. POST /api/auth/logout   → 로그아웃
```

쿠키는 브라우저가 자동으로 보내므로 프론트에서 토큰을 저장할 필요가 없습니다.

## API 명세

| 메서드 | 주소 | 권한 | 성공 응답 |
|---|---|---|---|
| GET | `/api/auth/csrf` | 누구나 | 204, CSRF 쿠키 |
| POST | `/api/auth/signup` | 누구나 | 201, 사용자 정보 |
| POST | `/api/auth/login` | 누구나 | 200, 사용자 정보 |
| POST | `/api/auth/logout` | 로그인 | 204 |
| GET | `/api/auth/me` | 로그인 | 200, 사용자 정보 |

## 설계 질문

- 가입할 때 무엇을 받을까요? 아이디와 비밀번호만이면 될까요, 이메일이나 닉네임도 필요할까요?
- 가입 직후 바로 로그인시킬까요, 로그인 화면으로 보낼까요?
- 응답의 사용자 정보에는 어떤 필드를 내보내고, 어떤 필드는 절대 내보내면 안 될까요?

## 1. CSRF API

```python
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status=204)
```

뷰는 URL에 연결해야 동작합니다. `accounts/urls.py`를 만들어 `path("csrf", CsrfView.as_view())`를 등록하고, `config/urls.py`에 `path("api/auth/", include("accounts.urls"))`를 추가합니다. 이후 API도 같은 방식으로 등록합니다.

## 2. 로그인 API

DRF의 세션 인증은 **로그인한 사용자의 요청만** CSRF를 검사합니다. 로그인과 회원가입 요청은 비로그인 상태이므로 검사가 빠지고, 다른 사이트가 사용자를 공격자 계정으로 로그인시키는 공격에 열립니다. 그래서 직접 적용합니다.

```python
from django.views.decorators.csrf import csrf_protect


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ...  # 직접 구현
```

<details>
<summary>힌트: 로그인 구현</summary>

`django.contrib.auth`의 `authenticate()`로 아이디와 비밀번호를 확인하고, 성공하면 `login(request, user)`를 호출합니다. 입력값 검증은 Serializer로 분리해도 좋습니다.

</details>

## 3. 회원가입 API

`LoginView`처럼 `csrf_protect`를 적용합니다.

<details>
<summary>힌트: 비밀번호 저장</summary>

`User.objects.create()`는 비밀번호를 그대로 저장합니다. `create_user()`를 쓰고, Serializer의 비밀번호 필드는 `write_only=True`로 둡니다. `django.contrib.auth.password_validation.validate_password`로 비밀번호 규칙도 검사할 수 있습니다.

</details>

## 4. `me`, 로그아웃 API

`permission_classes = [IsAuthenticated]`를 적용합니다. 로그아웃은 Django의 `logout(request)`를 호출합니다.

## 5. Next.js 연동 조건

- 앱이 시작될 때 `/api/auth/csrf`를 호출합니다.
- POST, PATCH, DELETE 요청에는 `X-CSRFToken` 헤더를 넣습니다.
- 토큰은 **요청할 때마다 `csrftoken` 쿠키에서 읽습니다.** 로그인하면 토큰이 바뀌어서, 이전 값을 보관해 두면 로그아웃이 403으로 실패합니다.
- 로그인 여부는 `/api/auth/me` 응답으로 판단합니다. 비로그인 상태의 정상 응답은 403입니다.
- 공통 fetch 함수를 만들어 헤더와 오류 처리를 한곳에 모아 두면 이후 챕터가 편합니다.

## 자주 막히는 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 비로그인인데 401이 아니라 403 | 세션 인증은 `WWW-Authenticate` 헤더가 없어 403을 응답 | 프론트에서 401과 403을 함께 처리 |
| `Origin checking failed` | `CSRF_TRUSTED_ORIGINS` 누락 | `.env`에 `http://localhost:3000` 추가 |
| `CSRF token missing` | 헤더 누락 또는 쿠키 미발급 | `/api/auth/csrf` 호출 순서 확인 |
| `CSRF token ... incorrect` | 로그인 전 토큰을 재사용 | 요청마다 쿠키에서 읽기 |
| `response.json()`에서 오류 | `csrf_protect`의 실패 응답은 JSON이 아닌 HTML | `response.ok`와 Content-Type 먼저 확인 |

## 테스트

`rest_framework.test.APITestCase`를 사용합니다. 기본 테스트 클라이언트는 CSRF를 검사하지 않으므로, CSRF 테스트에서는 클라이언트를 따로 만듭니다.

```python
from rest_framework.test import APIClient

client = APIClient(enforce_csrf_checks=True)
```

작성할 테스트:

- 회원가입 성공, 중복 아이디 거부, 응답에 비밀번호 없음
- 올바른 비밀번호로 로그인 성공, 잘못된 비밀번호로 실패
- 비로그인 상태의 `/api/auth/me`는 403
- 로그인한 뒤 `/api/auth/me`는 200
- CSRF 토큰 없는 로그인 요청은 403
- 로그아웃 후 `/api/auth/me`는 403

```bash
python manage.py test
```

## 완료 확인

- [ ] 비로그인 사용자가 보호된 페이지에 들어가면 로그인 화면으로 이동한다.
- [ ] 비로그인 상태로 보호된 API를 직접 호출하면 거부된다.
- [ ] 잘못된 비밀번호로는 로그인되지 않는다.
- [ ] 새로고침해도 로그인 상태가 유지된다.
- [ ] 로그아웃이 브라우저에서 403 없이 동작한다.
- [ ] Admin에서 비밀번호가 해시로 저장되어 있다.

## 공식 문서

- [Django의 CSRF 보호](https://docs.djangoproject.com/en/5.2/ref/csrf/)
- [DRF 인증](https://www.django-rest-framework.org/api-guide/authentication/)
- [DRF 테스트](https://www.django-rest-framework.org/api-guide/testing/)
