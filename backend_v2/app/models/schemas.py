from __future__ import annotations

from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator


PayloadType = Literal['Error-based', 'Union-based', 'Boolean-based', 'Time-based']
Severity = Literal['Low', 'Medium', 'High', 'Critical']
ScanStatus = Literal['pending', 'scanning', 'completed', 'failed']
PayloadStrategy = Literal['conservative', 'balanced', 'aggressive']
RiskModel = Literal['standard', 'owasp', 'cvss']
AssistantMode = Literal['triage', 'remediation', 'false-positive']


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    password: str = Field(min_length=8)

    @field_validator('email')
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if '@' not in normalized or normalized.startswith('@') or normalized.endswith('@'):
            raise ValueError('Email formati noto‘g‘ri.')
        return normalized


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_login_email(cls, value: str) -> str:
        return value.strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator('email')
    @classmethod
    def validate_forgot_email(cls, value: str) -> str:
        return value.strip().lower()


class SessionResponse(BaseModel):
    token: str
    user: dict[str, Any]


class ScanParameterInput(BaseModel):
    key: str = Field(min_length=1, max_length=64)
    value: str = Field(default='', max_length=1024)
    method: Literal['GET', 'POST'] = 'GET'

    @field_validator('key')
    @classmethod
    def validate_parameter_key(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Parametr nomi faqat harf/raqam/_/- dan iborat bo‘lishi kerak.')
        return normalized


class ScanCreateRequest(BaseModel):
    target_url: AnyHttpUrl
    parameters: list[ScanParameterInput] = Field(default_factory=list, max_length=30)
    depth: int = Field(default=3, ge=1, le=5)
    payload_strategy: PayloadStrategy = 'balanced'
    follow_redirects: bool = True
    use_random_user_agent: bool = True

    @field_validator('target_url')
    @classmethod
    def normalize_target_url(cls, value: AnyHttpUrl) -> str:
        return str(value).rstrip('/')


class PayloadUpdateRequest(BaseModel):
    enabled: bool


class PayloadCreateRequest(BaseModel):
    type: PayloadType
    payload: str = Field(min_length=1, max_length=2000)
    success_rate: int = Field(default=50, ge=0, le=100)
    description: str = Field(min_length=5, max_length=255)
    category: str = Field(min_length=2, max_length=64)
    enabled: bool = True


class SettingsUpdateRequest(BaseModel):
    timeout: int = Field(ge=60, le=3600)
    request_rate: int = Field(ge=1, le=100)
    payload_strategy: PayloadStrategy
    risk_scoring_model: RiskModel
    follow_redirects: bool
    use_random_user_agent: bool
    verify_ssl: bool
    notify_critical: bool
    notify_scan_complete: bool
    notify_weekly: bool


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(default='Default key', min_length=2, max_length=64)


class AiRecommendationRequest(BaseModel):
    mode: AssistantMode
    target: str = Field(min_length=3, max_length=255)
    prompt: str = Field(min_length=10, max_length=4000)
    top_finding_id: str | None = None
    include_monitor_data: bool = True


class AiPromptOptimizeRequest(BaseModel):
    mode: AssistantMode
    target: str = Field(min_length=3, max_length=255)
    prompt: str = Field(min_length=10, max_length=4000)


class DetectRequest(BaseModel):
    input: str = Field(min_length=1, max_length=5000)


class ScanUrlRequest(BaseModel):
    target_url: str = Field(min_length=5, max_length=2000)
    param_name: str = Field(default='', max_length=128)
    param_value: str = Field(default='', max_length=2000)

