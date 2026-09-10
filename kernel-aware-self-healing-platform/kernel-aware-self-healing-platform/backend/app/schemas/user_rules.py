from datetime import datetime

from pydantic import BaseModel

class RuleResponse(BaseModel):
    id: int | None
    name: str
    status: str | None = None
    priority: str | None = None
    severity: str | None = None
    owner: str | None = None
    environment: str | None = None
    region: str | None = None
    monitor_type: str
    target_type: str | None = None
    target: str | None = None
    system_id: int | None = None
    created_at: datetime | None = None

class RuleTargetResponse(BaseModel):
    target_type: str
    target: str


class RuleMetricResponse(BaseModel):
    id: int | None
    metric: str
    operator: str | None = None
    threshold: float | None = None
    duration_seconds: int | None = None


class RuleActionResponse(BaseModel):
    action_type: str
    automatic_execution: bool | None = None
    approval_required: str | None = None
    allowed_during: str | None = None
    max_retry_attempts: int | None = None
    cooldown_seconds: int | None = None
    suppress_duplicates: bool | None = None


class RuleNotificationResponse(BaseModel):
    event_type: str
    channel: str
    recipient: str | None = None


class RuleRecoveryResponse(BaseModel):
    verification_required: bool | None = None
    metric: str | None = None
    operator: str | None = None
    recovery_threshold: float | None = None
    recovery_duration_seconds: int | None = None


class RuleDetailsResponse(BaseModel):
    rule: RuleResponse
    targets: list[RuleTargetResponse]
    metrics: list[RuleMetricResponse]
    actions: list[RuleActionResponse]
    notifications: list[RuleNotificationResponse]
    recovery: list[RuleRecoveryResponse]