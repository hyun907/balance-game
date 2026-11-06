# 00. 프로젝트 준비

Django가 로컬 PostgreSQL에 연결되고, Next.js 화면에서 Django API를 호출할 수 있는 상태를 만듭니다.

이 챕터의 코드는 대부분 복사해서 쓰는 설정입니다. 처음부터 전부 외울 필요 없이 "이게 왜 필요한지"만 이해하고 넘어가면 됩니다.

명령어는 저장소 루트(`balance-game/`)에서 시작합니다.

## 먼저 알아둘 용어

| 용어 | 뜻 | 프론트로 치면 |
|---|---|---|
| 가상환경 (`.venv`) | 이 프로젝트 전용 패키지 설치 공간 | `node_modules` |
| `pip` | 파이썬 패키지 설치 도구 | `npm` |
| `requirements.txt` | 설치한 패키지 목록 | `package-lock.json` |
| `manage.py` | Django 명령을 실행하는 파일 | `npm run ...` |
| DRF | Django로 JSON API를 쉽게 만드는 라이브러리 | API 전용 도구 모음 |
| 프로젝트 (`config/`) | 사이트 전체 설정이 있는 폴더 | 루트 설정 파일들 |
| 앱 (`accounts/`) | 기능 하나를 담는 폴더 | 기능별 폴더 |
| 모델 | DB 테이블을 파이썬 클래스로 적은 것 | Prisma 스키마 |
| 마이그레이션 | 모델 변경 내용을 DB에 반영하는 기록 파일 | Prisma migration |

## 큰 그림

이 챕터가 끝나면 아래 순서로 요청이 흐릅니다.

```text
브라우저 → Next.js(3000번 포트) → Django(8000번 포트) → PostgreSQL
```

브라우저는 Next.js하고만 통신합니다. `/api`로 시작하는 요청은 Next.js가 Django로 대신 전달합니다.

## 1. 폴더와 `.gitignore`

백엔드 코드를 넣을 `backend`와, 공부 내용을 적을 `notes` 폴더를 만듭니다.

```bash
mkdir backend notes
```

저장소 루트에 `.gitignore`를 만듭니다. 여기에 적은 파일은 Git이 무시합니다. 비밀값이 든 `.env`와 다시 만들 수 있는 `.venv` 같은 파일을 올리지 않기 위해서입니다.

```gitignore
.env
.venv/
__pycache__/
*.pyc
staticfiles/
.DS_Store
```

## 2. Django 설치

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python --version  # 3.11.x 확인
pip install "django~=5.2.0" djangorestframework "psycopg[binary]" django-environ
pip freeze > requirements.txt
django-admin startproject config .
python manage.py startapp accounts
```

한 줄씩 보면 이렇습니다.

| 명령 | 하는 일 |
|---|---|
| `python3 -m venv .venv` | 가상환경을 만듭니다. 처음 한 번만 실행합니다. |
| `source .venv/bin/activate` | 가상환경을 켭니다. 터미널을 새로 열 때마다 실행합니다. |
| `pip install ...` | 패키지 4개를 설치합니다. `django~=5.2.0`은 5.2 버전대를 쓴다는 뜻입니다. |
| `pip freeze > requirements.txt` | 설치된 패키지와 버전을 파일에 저장합니다. |
| `django-admin startproject config .` | 현재 폴더에 `config/`와 `manage.py`를 만듭니다. 끝의 `.`은 현재 폴더라는 뜻입니다. |
| `python manage.py startapp accounts` | 회원 기능을 담을 `accounts` 앱을 만듭니다. |

설치하는 패키지는 다음과 같습니다.

- `django`: 웹 프레임워크 본체입니다.
- `djangorestframework`: JSON API를 만드는 DRF입니다.
- `psycopg[binary]`: Django가 PostgreSQL과 대화할 때 쓰는 드라이버입니다.
- `django-environ`: `.env` 파일의 값을 읽어 옵니다.

> 가상환경을 켜지 않고 `pip`를 실행하면 패키지가 컴퓨터 전체(전역)에 깔리고, `requirements.txt`에도 관계없는 패키지가 잔뜩 들어갑니다. `which python` 결과가 `.../backend/.venv/bin/python`인지 확인하세요. 에러 메시지 경로가 `/opt/homebrew/...`로 나올 때도 가상환경이 꺼져 있다는 신호입니다.

> 아직 `migrate`를 실행하지 마세요. 커스텀 유저 모델을 먼저 설정해야 합니다. 이유는 6단계에서 설명합니다.

## 3. PostgreSQL 유저와 DB

Django가 사용할 DB와, 그 DB에 접속할 계정을 만드는 단계입니다.

`psql`은 PostgreSQL에 직접 명령을 내리는 터미널 도구입니다. 아래 명령으로 접속합니다.

```bash
psql postgres
```

접속하면 프롬프트가 바뀝니다. 그 안에서 아래 SQL을 실행합니다.

```sql
CREATE USER balance WITH PASSWORD '영문과숫자로만된비밀번호' CREATEDB;
CREATE DATABASE balance_game OWNER balance;
\q
```

- 첫 줄은 `balance`라는 DB 계정을 만듭니다.
- 둘째 줄은 `balance_game`이라는 DB를 만들고 주인을 `balance`로 정합니다.
- `\q`는 `psql`을 끝내고 터미널로 돌아갑니다.

비밀번호는 다음 단계에서 URL 안에 들어갑니다. 특수문자는 URL에서 문제를 일으킬 수 있어서 영문과 숫자만 씁니다.

`CREATEDB`는 `manage.py test`가 테스트용 DB를 만들 때 필요합니다. 없으면 `permission denied to create database` 오류가 납니다.

## 4. `.env`

`.env`는 비밀번호처럼 코드에 직접 쓰면 안 되는 값을 모아 두는 파일입니다. Next.js의 `.env.local`과 같은 역할입니다.

`backend/.env`를 만듭니다. `SECRET_KEY`는 아래 명령으로 생성합니다.

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

```dotenv
SECRET_KEY=생성한값
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:3000
DATABASE_URL=postgres://balance:비밀번호@127.0.0.1:5432/balance_game
```

| 값 | 뜻 |
|---|---|
| `SECRET_KEY` | Django가 세션과 서명에 쓰는 비밀 키입니다. 절대 공개하면 안 됩니다. |
| `DEBUG` | `True`면 에러 화면에 자세한 정보가 나옵니다. 개발 중에만 켭니다. |
| `ALLOWED_HOSTS` | 이 서버가 받아 줄 도메인 목록입니다. |
| `CSRF_TRUSTED_ORIGINS` | 로그인 같은 쓰기 요청을 믿고 받아 줄 출처 목록입니다. |
| `DATABASE_URL` | DB 접속 정보입니다. |

`DATABASE_URL`은 아래처럼 읽습니다.

```text
postgres://balance:비밀번호@127.0.0.1:5432/balance_game
           계정     비밀번호  주소      포트 DB 이름
```

같은 내용에서 비밀값만 지운 `backend/.env.example`도 만들어 커밋합니다. `.env`는 Git에 올라가지 않으므로, 어떤 값이 필요한지 알려 주는 견본입니다.

`CSRF_TRUSTED_ORIGINS`는 로컬에서도 필요합니다. 프록시를 거치면 Django가 보는 Host는 `127.0.0.1:8000`이고 브라우저의 Origin은 `http://localhost:3000`이라, 등록하지 않으면 로그인 때 `Origin checking failed`로 403이 납니다.

쉽게 말하면 Django는 쓰기 요청이 어디서 왔는지 검사합니다. 3000번 포트는 믿어도 된다고 미리 알려 주는 설정입니다.

## 5. `config/settings.py`

`settings.py`는 Django 전체 설정 파일입니다. 앞에서 만든 `.env` 값을 여기서 읽어 옵니다.

파일 위쪽을 수정합니다.

```python
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
```

- `import environ`: `.env`를 읽는 라이브러리를 가져옵니다. 빠뜨리면 `NameError: name 'environ' is not defined`가 납니다.
- `BASE_DIR`: `backend/` 폴더의 경로입니다.
- `environ.Env.read_env(...)`: `backend/.env` 파일을 읽습니다.
- `env("SECRET_KEY")`: 값을 문자열로 가져옵니다. `.env`에 없으면 에러가 납니다.
- `env.bool`, `env.list`: 값을 불리언이나 리스트로 바꿔서 가져옵니다. `.env`의 값은 전부 글자이기 때문입니다.

`INSTALLED_APPS`에 `"rest_framework"`와 `"accounts"`를 추가합니다. 이 목록에 있어야 Django가 앱으로 인식합니다.

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "accounts",
]
```

> 항목마다 끝에 쉼표를 붙이세요. 쉼표가 빠지면 Python이 다음 문자열과 붙여서 `"accountsdjango.contrib.admin"` 같은 이름으로 읽고, `ModuleNotFoundError`가 납니다.

`DATABASES`를 바꿉니다. `.env`의 `DATABASE_URL`을 읽어서 PostgreSQL에 연결하는 코드입니다. `settings.py`에 원래 있던 `DATABASES` 블록을 지우고 이 한 줄로 바꾸면 됩니다.

```python
DATABASES = {"default": env.db("DATABASE_URL")}
```

언어와 시간대를 바꾸고, 파일 끝에 아래 설정을 추가합니다. `LANGUAGE_CODE`와 `TIME_ZONE`은 이미 파일에 있으니 값만 바꿉니다. `USE_I18N`과 `USE_TZ`는 그대로 둡니다.

```python
LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}
```

- `AUTH_USER_MODEL`: 6단계에서 만들 User를 유저 모델로 쓰겠다는 설정입니다.
- `SessionAuthentication`: 로그인 상태를 세션 쿠키로 확인합니다.
- `IsAuthenticatedOrReadOnly`: 조회(`GET`)는 누구나 가능하고, 등록·수정·삭제는 로그인해야 가능합니다.

기본 권한을 정해 두면 뷰마다 빠뜨려도 쓰기 요청이 열리지 않습니다.

여기까지 하고 설정에 오류가 없는지 확인합니다.

```bash
python manage.py check
```

`System check identified no issues`가 나오면 통과입니다.

## 6. 커스텀 유저 모델

Django에는 기본 User가 있습니다. 그런데 기본 User를 그대로 쓰면 나중에 닉네임 같은 필드를 추가하기가 어렵습니다. 그래서 내용이 비어 있어도 프로젝트 전용 User를 먼저 만들어 둡니다.

`accounts/models.py`

```python
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    pass
```

- `class User(AbstractUser)`: 기본 User의 기능을 그대로 물려받습니다. 로그인, 비밀번호, 이메일 등이 포함됩니다.
- `pass`: 추가할 내용이 아직 없다는 뜻입니다. 지금 당장 달라지는 기능은 없습니다.

첫 `migrate` 뒤에는 유저 모델을 바꾸기가 아주 번거롭습니다. 질문, 투표, 댓글 테이블이 모두 유저 테이블을 가리키기 때문입니다. 그래서 2단계에서 `migrate`를 미뤘습니다.

`accounts/admin.py`

아래 코드는 User를 관리자 페이지(`/admin`)에 보이게 등록합니다. 관리자 페이지는 DB 데이터를 화면에서 보고 수정할 수 있는 Django 기본 기능이고, 등록한 모델만 나타납니다.

```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User

admin.site.register(User, UserAdmin)
```

`UserAdmin`은 비밀번호 변경처럼 유저에게 필요한 기능이 들어 있는 관리 화면입니다.

그다음 마이그레이션을 진행합니다.

```bash
python manage.py makemigrations accounts
python manage.py migrate
python manage.py createsuperuser
```

| 명령 | 하는 일 |
|---|---|
| `makemigrations accounts` | 모델을 보고 DB 변경 내용을 담은 파일을 만듭니다. 아직 DB는 바뀌지 않습니다. |
| `migrate` | 그 파일을 실제 DB에 적용해서 테이블을 만듭니다. |
| `createsuperuser` | 관리자 페이지에 로그인할 계정을 만듭니다. |

모델을 바꿀 때마다 `makemigrations`와 `migrate`를 다시 실행합니다.

## 7. health API

서버가 살아 있는지 확인하는 가장 단순한 API입니다. 프론트와 백엔드 연결을 시험할 때 사용합니다.

`config/views.py`

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})
```

| 코드 | 뜻 |
|---|---|
| `@api_view(["GET"])` | 일반 함수를 DRF API로 만들고 `GET`만 허용합니다. |
| `@permission_classes([AllowAny])` | 로그인하지 않아도 호출할 수 있게 합니다. |
| `def health(request):` | 요청이 오면 실행되는 함수입니다. |
| `return Response({"status": "ok"})` | 딕셔너리를 JSON으로 바꿔서 응답합니다. |

`@`로 시작하는 줄은 데코레이터입니다. 함수에 기능을 덧붙이는 Python 문법입니다.

Next.js와 달리 Django는 파일 위치로 URL이 정해지지 않습니다. 함수를 만들고 `urls.py`에 경로를 직접 연결해야 합니다.

`config/urls.py`

```python
from django.contrib import admin
from django.urls import path

from .views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health),
]
```

`path("api/health", health)`는 `/api/health`로 요청이 오면 `health` 함수를 실행하라는 뜻입니다.

## 8. Next.js

새 터미널을 열고 저장소 루트에서 실행합니다.

```bash
npx create-next-app@latest frontend --ts --app --eslint --no-tailwind --no-cache-components --src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

`--disable-git`은 이미 있는 저장소 안에 또 다른 저장소가 생기지 않게 합니다. 이 프로젝트는 대부분 클라이언트에서 데이터를 불러오므로 Cache Components는 꺼 둡니다.

`frontend/next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.DJANGO_API_URL ?? "http://127.0.0.1:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

`/api`로 시작하는 요청을 Next.js가 Django로 전달하는 설정입니다. 브라우저 입장에서는 모든 요청이 `localhost:3000`으로 가는 것처럼 보이기 때문에, CORS 설정이 필요 없고 로그인 쿠키도 그대로 동작합니다.

이제 첫 화면에서 `/api/health`를 호출해 결과를 표시합니다. 브라우저 → Next.js → Django 흐름이 실제로 이어졌는지 눈으로 확인하는 단계입니다.

`frontend/src/app/page.tsx`의 내용을 전부 지우고 아래 코드로 바꿉니다.

```tsx
"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("확인 중...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("연결 실패"));
  }, []);

  return <main>Django 상태: {status}</main>;
}
```

| 코드 | 뜻 |
|---|---|
| `"use client"` | 이 컴포넌트를 브라우저에서도 실행합니다. `useState`와 `useEffect`를 쓰려면 필요합니다. |
| `useState("확인 중...")` | 응답이 오기 전에 보여 줄 글자입니다. |
| `fetch("/api/health")` | 화면이 열린 뒤 API를 호출합니다. |
| `setStatus(data.status)` | Django가 보낸 `{"status": "ok"}`에서 `ok`를 꺼내 화면에 넣습니다. |
| `.catch(...)` | 요청 자체가 실패하면 `연결 실패`를 표시합니다. |

호출 주소에 `http://127.0.0.1:8000`을 쓰지 않는 것이 핵심입니다. `/api/health` 상대 경로로 부르면 브라우저는 `localhost:3000`으로 요청하고, 앞에서 만든 `rewrites`가 Django로 전달합니다. 그래서 CORS 오류가 나지 않습니다.

화면에 `Django 상태: ok`가 나오면 성공입니다. 이 코드는 연결 확인용이라 나중에 실제 화면을 만들 때 지웁니다.

## 왜 끝 슬래시를 쓰지 않나

Next.js는 `/api/health/` 요청을 `/api/health`로 308 리다이렉트합니다. Django의 URL에 슬래시가 붙어 있으면 서로 반대로 보내게 되니, API 경로는 슬래시 없이 통일합니다. DRF 라우터를 쓴다면 `DefaultRouter(trailing_slash=False)`로 만듭니다.

## 완료 확인

터미널 두 개에서 서버를 실행합니다.

```bash
# backend/
source .venv/bin/activate
python manage.py runserver

# frontend/
npm run dev
```

- [ ] `curl http://localhost:3000/api/health`가 `{"status":"ok"}`를 응답한다.
- [ ] 브라우저 `http://localhost:3000`에서 CORS 오류 없이 결과가 보인다.
- [ ] `http://localhost:8000/admin/`에 로그인할 수 있다.
- [ ] `psql balance_game -c '\dt'`에 `accounts_user`가 보인다.
- [ ] 저장소 루트의 `git status`에 `.env`와 `.venv`가 나타나지 않는다.

```bash
git add .
git status   # 올라가면 안 되는 파일이 없는지 확인
git commit -m "chore: Django와 Next.js 프로젝트 초기 설정"
```

## 자주 나는 오류

| 증상 | 원인 | 해결 |
|---|---|---|
| 에러 경로가 `/opt/homebrew/...`로 나온다 | 가상환경이 꺼져 있습니다. | `source .venv/bin/activate` |
| `No module named 'environ'` 또는 `'django'` | 가상환경이 꺼져 있거나 패키지가 설치되지 않았습니다. | 가상환경을 켜고 `pip install -r requirements.txt` |
| `NameError: name 'environ' is not defined` | `settings.py`에 `import environ`이 없습니다. | 파일 위쪽에 추가 |
| `ModuleNotFoundError: No module named 'accountsdjango'` | `INSTALLED_APPS`에 쉼표가 빠졌습니다. | `"accounts",`처럼 쉼표 추가 |
| `Set the SECRET_KEY environment variable` | `backend/.env`가 없거나 위치가 다릅니다. | `manage.py`와 같은 폴더에 `.env` 만들기 |
| `InconsistentMigrationHistory` | 커스텀 유저를 만들기 전에 `migrate`를 실행했습니다. | 로컬 DB를 지우고 다시 만든 뒤 `migrate` |

## 공식 문서

- [커스텀 유저 모델](https://docs.djangoproject.com/en/5.2/topics/auth/customizing/)
- [django-environ](https://django-environ.readthedocs.io/en/latest/)
- [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
