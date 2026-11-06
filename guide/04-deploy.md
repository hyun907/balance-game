# 04. 첫 배포

핵심 기능이 동작하는 버전을 실제 URL에 올립니다.

```text
브라우저 → Next.js 호스팅 → /api/* 전달 → Django 호스팅 → PostgreSQL
```

이 가이드는 호스팅 서비스와 무관한 공통 설정을 다룹니다. 콘솔 화면과 설정 위치는 고른 서비스의 공식 문서를 따르세요.

## 1. 호스팅 고르기

| 항목 | 확인할 내용 |
|---|---|
| 요금 | 무료 플랜의 사용량 제한과 절전 여부 |
| PostgreSQL | 버전 17 지원, 무료 DB의 보관 기간과 백업 |
| 리전 | Next.js와 Django를 가까운 지역에 두었는지 |
| 배포 | 저장소의 하위 폴더를 지정할 수 있는지 |
| 마이그레이션 | 배포 과정에 `migrate`를 넣을 수 있는지 |

Next.js가 모든 API 요청을 Django로 전달하므로, 두 서비스의 거리가 멀면 요청마다 지연이 늘어납니다.

## 2. Django 운영 설정

```bash
pip install gunicorn whitenoise
pip freeze > requirements.txt
```

`MIDDLEWARE`의 `SecurityMiddleware` 바로 다음에 추가합니다. 서비스 화면에는 Django Template을 쓰지 않지만 Admin의 CSS와 JS는 필요합니다.

```python
"whitenoise.middleware.WhiteNoiseMiddleware",
```

`config/settings.py` 끝에 추가합니다.

```python
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
```

`SECURE_PROXY_SSL_HEADER`는 호스팅의 프록시가 `X-Forwarded-Proto` 헤더를 직접 설정할 때만 사용합니다. 고른 서비스의 문서에서 확인하세요.

운영 설정을 로컬에서 먼저 점검합니다. `.env`의 `DEBUG`를 잠시 `False`로 바꾸고 실행하세요.

```bash
python manage.py collectstatic --noinput
python manage.py check --deploy
gunicorn config.wsgi --bind 127.0.0.1:8001
```

`check --deploy`는 `SECURE_HSTS_SECONDS`와 `SECURE_SSL_REDIRECT` 경고를 표시합니다. HTTPS 동작을 확인한 뒤 설정하고, HSTS는 되돌리기 어려우니 `3600`처럼 짧은 값부터 시작하세요. 점검이 끝나면 `DEBUG`를 `True`로 되돌립니다.

## 3. Django 배포

서비스의 루트 폴더를 `backend`로 지정합니다.

| 단계 | 명령 |
|---|---|
| 빌드 | `pip install -r requirements.txt && python manage.py collectstatic --noinput` |
| 배포 전 | `python manage.py migrate` |
| 실행 | `gunicorn config.wsgi --bind 0.0.0.0:$PORT` |

환경변수:

| 이름 | 값 |
|---|---|
| `SECRET_KEY` | 로컬과 다른 새 값 |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | Django 서비스 도메인 |
| `CSRF_TRUSTED_ORIGINS` | `https://Next.js도메인` |
| `DATABASE_URL` | 운영 PostgreSQL 주소 |

프록시를 거치면 Django는 자기 도메인을 Host로 받습니다. 그래서 `ALLOWED_HOSTS`에는 **Django 도메인**을, `CSRF_TRUSTED_ORIGINS`에는 **Next.js 도메인**을 넣습니다. 프록시 설정에 따라 다를 수 있으니 배포 후 실제 동작으로 확인하세요.

배포 후 `https://Django도메인/api/health`를 직접 열어 봅니다. Admin 접속용 관리자 계정은 서비스의 셸에서 `createsuperuser`로 만듭니다.

## 4. Next.js 배포

서비스의 루트 폴더를 `frontend`로 지정하고 환경변수를 넣습니다.

| 이름 | 값 |
|---|---|
| `DJANGO_API_URL` | `https://Django도메인` |

> `rewrites`의 주소는 **빌드할 때** 정해집니다. `DJANGO_API_URL`을 바꿨다면 서버 재시작이 아니라 다시 빌드해야 적용됩니다.

Next.js 도메인이 정해지면 Django의 `CSRF_TRUSTED_ORIGINS`에 넣고 다시 배포합니다. 미리보기 배포처럼 주소가 바뀌는 환경에서는 그 주소도 등록해야 쓰기 요청이 동작합니다.

## 자주 막히는 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| Django에서 400 | `ALLOWED_HOSTS` 누락 | Django 도메인 추가 |
| 쓰기 요청만 403 | `CSRF_TRUSTED_ORIGINS` 누락 | `https://`까지 포함해 등록 |
| 로그인 후 바로 풀림 | HTTPS 인식 실패 또는 쿠키 저장 실패 | 응답의 `Set-Cookie`와 `SECURE_PROXY_SSL_HEADER` 확인 |
| 리다이렉트 반복 | 프록시 뒤에서 `SECURE_SSL_REDIRECT` 사용 | `SECURE_PROXY_SSL_HEADER` 먼저 확인 |
| `/api`가 로컬 주소로 전달 | 빌드 때 환경변수 없음 | 환경변수를 넣고 다시 빌드 |
| Admin CSS 없음 | `collectstatic` 누락 | 빌드 명령과 미들웨어 순서 확인 |

## 배포 방법 정리

프로젝트 README에 다음을 기록합니다.

- 사용한 호스팅 서비스와 서비스별 루트 폴더
- 빌드·배포·실행 명령
- 환경변수 이름과 설명(값은 적지 않음)
- 재배포하는 방법

## 완료 확인

휴대폰처럼 다른 기기에서 확인합니다.

- [ ] 가입, 질문 등록, 투표, 결과 확인이 모두 된다.
- [ ] 새로고침해도 로그인이 유지된다.
- [ ] 쓰기 요청이 CSRF 검사를 통과한다.
- [ ] 없는 주소에 접속해도 디버그 정보가 나오지 않는다.
- [ ] `/admin/`의 CSS가 정상으로 보인다.
- [ ] 다시 배포해도 데이터가 사라지지 않는다.

이 챕터 이후에는 기능을 끝낼 때마다 배포합니다.

## 공식 문서

- [Django 배포 체크리스트](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [WhiteNoise Django 설정](https://whitenoise.readthedocs.io/en/stable/django.html)
