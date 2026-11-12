from __future__ import annotations

import json
from urllib import error, request

from pydantic import ValidationError

from .config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from .models import QueryPlan

_QUERY_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "intent": {
            "type": "string",
            "enum": [
                "search",
                "count",
                "nearest",
                "near",
                "directional",
                "overlap",
                "room_query",
                "wall_query",
                "opening_query",
            ],
        },
        "reference_label": {"type": ["string", "null"]},
        "reference_id": {"type": ["string", "null"]},
        "target_label": {"type": ["string", "null"]},
        "direction": {
            "type": ["string", "null"],
            "enum": ["left", "right", "above", "below", "front", "behind", None],
        },
        "radius": {"type": "number"},
        "limit": {"type": "integer"},
        "distance_metric": {"type": "string", "enum": ["center", "bbox_surface"]},
    },
    "required": ["intent"],
}


def _prompt(question: str, labels: list[str]) -> str:
    vocabulary = ", ".join(labels[:200])
    return (
        "Return JSON only matching this schema: "
        '{"intent":"search|count|nearest|near|directional|overlap|room_query|wall_query|opening_query",'
        '"reference_label":string|null,"reference_id":string|null,"target_label":string|null,'
        '"direction":"left|right|above|below|front|behind"|null,"radius":number,'
        '"limit":integer,"distance_metric":"center|bbox_surface"}. '
        f"Use only these labels: {vocabulary}. Never invent IDs, coordinates, distances, or relations. "
        f"Question: {question}"
    )


def _extract_json(text: str) -> object:
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("LLM response did not contain a JSON object.")
    return json.loads(text[start : end + 1])


def parse_with_llm(question: str, labels: list[str]) -> QueryPlan | None:
    api_key = LLM_API_KEY
    if not api_key:
        return None
    endpoint = f"{LLM_BASE_URL}/chat/completions"
    payload = json.dumps({
        "model": LLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a spatial query planner. Return only valid JSON.",
            },
            {"role": "user", "content": _prompt(question, labels)},
        ],
        "temperature": 0,
        "response_format": {
            "type": "json_object",
            "schema": _QUERY_PLAN_SCHEMA,
        },
    }).encode()
    for attempt in range(2):
        try:
            response = request.urlopen(
                request.Request(
                    endpoint,
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                ),
                timeout=4,
            )
            body = json.loads(response.read().decode())
            text = body["choices"][0]["message"]["content"]
            return QueryPlan.model_validate(_extract_json(text))
        except (error.URLError, TimeoutError, KeyError, ValueError, ValidationError, json.JSONDecodeError):
            if attempt == 1:
                return None
    return None


parse_with_gemini = parse_with_llm
