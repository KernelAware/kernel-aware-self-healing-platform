from datetime import datetime

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    id: str = Field(..., max_length=40, description="Unique incident ID")
    rule_id: int | None = None
    system_id: int
    category: str
    target: str
    metric: str
    severity: str
    priority: str
    status: str = "OPEN"
    opened_at: datetime | None = None
    updated_at: datetime | None = None
    resolved_at: datetime | None = None
    detail: dict = Field(default_factory=dict)
    alert: dict = Field(default_factory=dict)
    created_at: datetime | None = None


class IncidentResponse(BaseModel):
    id: str = Field(..., max_length=40)
    rule_id: int | None = None
    system_id: int
    category: str
    target: str
    metric: str
    severity: str
    priority: str
    status: str = "OPEN"
    opened_at: datetime | None = None
    updated_at: datetime | None = None
    resolved_at: datetime | None = None
    detail: dict = Field(default_factory=dict)
    alert: dict = Field(default_factory=dict)
    created_at: datetime | None = None


class IncidentResolveRequest( BaseModel):
    status: str = "RESOLVED"
    reason: str | None = None
