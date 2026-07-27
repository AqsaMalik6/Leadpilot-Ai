from typing import Literal

from pydantic import EmailStr, Field

from app.schemas.common import CamelModel

Role = Literal["owner", "admin", "sales_rep"]


class LoginInput(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8)


class SignupInput(CamelModel):
    name: str = Field(min_length=2)
    company: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)


class SessionUser(CamelModel):
    id: str
    org_id: str
    name: str
    email: str
    role: Role
    onboarding_completed_at: str | None = None


class ContactInput(CamelModel):
    name: str = Field(min_length=2)
    email: EmailStr
    company: str | None = None
    message: str = Field(min_length=10)


class DemoLeadInput(CamelModel):
    name: str = Field(min_length=2)
    company: str = Field(min_length=2)
    need: str = Field(min_length=5)
