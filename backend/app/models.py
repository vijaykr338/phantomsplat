from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Vec3 = tuple[float, float, float]
Intent = Literal[
    "search",
    "count",
    "nearest",
    "near",
    "directional",
    "overlap",
    "room_query",
    "wall_query",
    "opening_query",
]


class SceneObject(BaseModel):
    object_id: str
    label: str
    source_corners: list[dict[str, float]]
    min: Vec3
    max: Vec3
    center: Vec3
    dimensions: Vec3
    volume: float
    room_id: str | None


class SceneRoom(BaseModel):
    room_id: str
    polygon: list[tuple[float, float]]
    area: float


class QueryPlan(BaseModel):
    intent: Intent
    reference_label: str | None = None
    reference_id: str | None = None
    target_label: str | None = None
    target_category: str | None = None
    direction: Literal["left", "right", "above", "below", "front", "behind"] | None = None
    radius: float = Field(default=1.0, gt=0)
    limit: int = Field(default=10, ge=1, le=100)
    distance_metric: Literal["center", "bbox_surface"] = "bbox_surface"


class QueryRequest(BaseModel):
    question: str | None = None
    plan: QueryPlan | None = None
    context: dict[str, str | None] = Field(default_factory=dict)


class QueryResult(BaseModel):
    object_id: str
    label: str
    distance: float | None = None
    room_id: str | None = None


class QueryResponse(BaseModel):
    status: Literal["success", "not_found", "ambiguous", "invalid"]
    answer: str
    results: list[QueryResult] = Field(default_factory=list)
    actions: list[dict[str, str]] = Field(default_factory=list)
    clarification: dict[str, object] | None = None
    plan: QueryPlan | None = None
    evidence: dict[str, object] = Field(default_factory=dict)
