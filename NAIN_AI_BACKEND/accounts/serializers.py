# pyrefly: ignore [missing-import]
from rest_framework import serializers
from .models import User


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"}
    )
    full_name = serializers.CharField(
        required=False,
        allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "date_joined",
            "password",
        ]
        read_only_fields = [
            "id",
            "date_joined",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "first_name": {"required": False},
            "last_name": {"required": False},
        }

    def validate_role(self, value):
        if value not in User.Role.values:
            raise serializers.ValidationError(
                f"Invalid role '{value}'. Allowed roles: {', '.join(User.Role.values)}"
            )
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": ["This field is required."]})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        full_name = validated_data.pop("full_name", None)

        if full_name is not None:
            parts = full_name.strip().split(" ", 1)
            validated_data["first_name"] = parts[0]
            validated_data["last_name"] = parts[1] if len(parts) > 1 else ""

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        full_name = validated_data.pop("full_name", None)

        if full_name is not None:
            parts = full_name.strip().split(" ", 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ""

        if password:
            instance.set_password(password)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
