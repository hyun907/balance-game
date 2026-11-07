from django.urls import path

from .views import CsrfView

urlpatterns = [
    path("csrf", CsrfView.as_view())
]