from __future__ import annotations

import re

from .models import QueryPlan


def parse_question(question: str) -> QueryPlan:
    normalized = question.strip().lower()
    limit_match = re.search(r"\b(?:three|3|five|5|ten|10)\b", normalized)
    limits = {"three": 3, "3": 3, "five": 5, "5": 5, "ten": 10, "10": 10}
    limit = limits.get(limit_match.group(0), 10) if limit_match else 10
    distance_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:metre|meter|m)", normalized)
    radius = float(distance_match.group(1)) if distance_match else 1.0
    known_labels = (
        "chair", "table", "sofa", "multi person sofa", "cabinet", "display cabinet",
        "wardrobe", "window", "door", "shelf", "storage rack", "coffee_maker",
    )
    known_hint = next((label for label in known_labels if label in normalized), None)
    reference_hint = None
    reference_match = re.search(
        r"(?:to|near|next to|behind|in front of|above|below|left of|right of)\s+(?:the\s+)?([a-z_ ]+)",
        normalized,
    )
    if reference_match:
        reference_text = reference_match.group(1).strip()
        reference_hint = next((label for label in known_labels if label in reference_text), reference_text)
    if normalized.startswith(("how many", "count")):
        return QueryPlan(intent="count", target_label=known_hint)
    if "closest" in normalized or "nearest" in normalized:
        return QueryPlan(intent="nearest", target_label=known_hint, reference_label=reference_hint, limit=limit)
    if "within" in normalized or "near" in normalized:
        return QueryPlan(intent="near", reference_label=reference_hint or known_hint, target_label=None, radius=radius)
    for direction in ("behind", "in front of", "above", "below", "left", "right"):
        if direction in normalized:
            return QueryPlan(
                intent="directional",
                reference_label=reference_hint or known_hint,
                direction="front" if direction == "in front of" else direction,
            )
    return QueryPlan(intent="search", target_label=known_hint)
