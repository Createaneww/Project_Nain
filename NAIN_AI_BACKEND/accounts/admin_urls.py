from django.urls import path
from .views import (
    AdminUserListCreateView,
    AdminUserDetailView,
    ActivityLogListView,
    ActivityLogDetailView,
)

urlpatterns = [
    path("users/", AdminUserListCreateView.as_view(), name="admin-user-list-create"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("activity/", ActivityLogListView.as_view(), name="admin-activity-list"),
    path("activity/<int:pk>/", ActivityLogDetailView.as_view(), name="admin-activity-detail"),
]

