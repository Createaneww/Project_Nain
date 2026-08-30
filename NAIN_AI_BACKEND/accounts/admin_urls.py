# pyrefly: ignore [missing-import]
from django.urls import path
from .views import AdminUserListCreateView, AdminUserDetailView

urlpatterns = [
    path("users/", AdminUserListCreateView.as_view(), name="admin-user-list-create"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
