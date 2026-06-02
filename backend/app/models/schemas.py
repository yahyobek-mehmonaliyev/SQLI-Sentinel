from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


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


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class SessionResponse(BaseModel):
    token: str
    user: dict[str, Any]


class ScanParameterInput(BaseModel):
    key: str
    value: str = ''
    method: Literal['GET', 'POST'] = 'GET'


class ScanCreateRequest(BaseModel):
    target_url: str
    parameters: list[ScanParameterInput] = Field(default_factory=list)
    depth: int = Field(default=3, ge=1, le=5)
    payload_strategy: PayloadStrategy = 'balanced'
    follow_redirects: bool = True
    use_random_user_agent: bool = True


class PayloadUpdateRequest(BaseModel):
    enabled: bool


class PayloadCreateRequest(BaseModel):
    type: PayloadType
    payload: str
    success_rate: int = Field(default=50, ge=0, le=100)
    description: str
    category: str
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
    target: str
    prompt: str = Field(min_length=10)
    top_finding_id: str | None = None
    include_monitor_data: bool = True


class AiPromptOptimizeRequest(BaseModel):
    mode: AssistantMode
    target: str
    prompt: str = Field(min_length=10)
