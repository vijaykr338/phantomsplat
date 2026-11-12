from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query

from .models import QueryPlan, QueryRequest, QueryResponse, QueryResult
from .config import PROJECT_ROOT
from .query import parse_question
from .llm import parse_with_llm
from .spatial import (
    bbox_surface_distance,
    center_distance,
    directional,
    load_catalog,
    overlaps,
)

ROOT = PROJECT_ROOT
OBJECTS, ROOMS, WARNINGS = load_catalog(ROOT)
BY_ID = {item.object_id: item for item in OBJECTS}

app = FastAPI(title="Spatial RAG API", version="0.1.0")


def result(item, distance: float | None = None) -> QueryResult:
    return QueryResult(object_id=item.object_id, label=item.label, distance=distance, room_id=item.room_id)


def resolve(label: str | None, object_id: str | None = None):
    if object_id:
        return [BY_ID[object_id]] if object_id in BY_ID else []
    if not label:
        return []
    return [item for item in OBJECTS if item.label == label.strip().lower()]


@app.get("/api/scene/objects", response_model=list[QueryResult])
def list_objects(
    label: str | None = None,
    room: str | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
):
    items = [item for item in OBJECTS if (not label or item.label == label.lower()) and (not room or item.room_id == room)]
    return [result(item) for item in items[:limit]]


@app.get("/api/scene/objects/{object_id}", response_model=dict)
def get_object(object_id: str):
    item = BY_ID.get(object_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Unknown object ID: {object_id}")
    return item.model_dump()


@app.get("/api/scene/objects/{object_id}/neighbors", response_model=list[QueryResult])
def neighbors(object_id: str, radius: float = Query(default=1.0, gt=0)):
    reference = BY_ID.get(object_id)
    if reference is None:
        raise HTTPException(status_code=404, detail=f"Unknown object ID: {object_id}")
    found = [
        result(item, bbox_surface_distance(reference, item))
        for item in OBJECTS
        if item.object_id != object_id and bbox_surface_distance(reference, item) <= radius
    ]
    return sorted(found, key=lambda item: item.distance or 0)


@app.get("/api/scene/rooms", response_model=list[dict])
def list_rooms():
    return [room.model_dump() for room in ROOMS]


@app.post("/api/query", response_model=QueryResponse)
def query(request: QueryRequest):
    question = request.question or ""
    plan = request.plan or parse_with_llm(question, sorted({item.label for item in OBJECTS})) or parse_question(question)
    if plan.intent == "count":
        matches = resolve(plan.target_label)
        label = plan.target_label or "objects"
        return QueryResponse(
            status="success",
            answer=f"Found {len(matches)} {label}.",
            results=[result(item) for item in matches],
            plan=plan,
            evidence={"count": len(matches), "label": label},
        )
    references = resolve(plan.reference_label, plan.reference_id)
    if plan.intent in {"near", "nearest", "directional", "overlap"} and not references:
        return QueryResponse(status="not_found", answer="No reference object matched.", results=[], plan=plan)
    if len(references) > 1 and not plan.reference_id:
        return QueryResponse(
            status="ambiguous",
            answer=f"Multiple {plan.reference_label} objects matched.",
            clarification={
                "question": "Which instance should I use?",
                "options": [{"object_id": item.object_id, "label": item.label} for item in references[:20]],
            },
            plan=plan,
        )
    reference = references[0] if references else None
    candidates = resolve(plan.target_label) if plan.target_label else OBJECTS
    candidates = [item for item in candidates if not reference or item.object_id != reference.object_id]
    if plan.intent == "near":
        matches = [(item, bbox_surface_distance(reference, item)) for item in candidates if bbox_surface_distance(reference, item) <= plan.radius]
    elif plan.intent == "nearest":
        matches = sorted([(item, bbox_surface_distance(reference, item)) for item in candidates], key=lambda pair: pair[1])[:plan.limit]
    elif plan.intent == "directional":
        matches = [(item, None) for item in candidates if directional(item, reference, plan.direction or "behind")]
    elif plan.intent == "overlap":
        matches = [(item, None) for item in candidates if overlaps(item, reference)]
    else:
        matches = [(item, None) for item in candidates]
    results = [result(item, distance) for item, distance in matches]
    distance_text = ""
    if results and results[0].distance is not None:
        distance_text = f" Closest distance: {results[0].distance:.2f} m."
    return QueryResponse(
        status="success" if results else "not_found",
        answer=f"Found {len(results)} matching object(s).{distance_text}",
        results=results,
        actions=[
            {"type": "highlight", "object_id": item.object_id}
            for item, _ in matches
        ] + ([{"type": "fly_to", "object_id": matches[0][0].object_id}] if matches else []),
        plan=plan,
        evidence={
            "reference_id": reference.object_id if reference else None,
            "distance_metric": plan.distance_metric,
            "radius": plan.radius if plan.intent == "near" else None,
            "distances": {item.object_id: distance for item, distance in matches if distance is not None},
        },
    )
