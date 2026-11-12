from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from .models import SceneObject, SceneRoom


def source_to_viewer(point: dict[str, float]) -> tuple[float, float, float]:
    return (point["x"], point["z"], -point["y"])


def polygon_area(polygon: list[tuple[float, float]]) -> float:
    return abs(
        sum(
            polygon[index][0] * polygon[(index + 1) % len(polygon)][1]
            - polygon[(index + 1) % len(polygon)][0] * polygon[index][1]
            for index in range(len(polygon))
        )
        / 2
    )


def point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    inside = False
    previous = len(polygon) - 1
    for index, (x, y) in enumerate(polygon):
        previous_x, previous_y = polygon[previous]
        if (y > point[1]) != (previous_y > point[1]):
            crossing = (previous_x - x) * (point[1] - y) / (previous_y - y) + x
            if point[0] < crossing:
                inside = not inside
        previous = index
    return inside


def center_distance(first: SceneObject, second: SceneObject) -> float:
    return math.dist(first.center, second.center)


def bbox_surface_distance(first: SceneObject, second: SceneObject) -> float:
    gaps = [
        max(0.0, first.min[index] - second.max[index], second.min[index] - first.max[index])
        for index in range(3)
    ]
    return math.sqrt(sum(gap * gap for gap in gaps))


def overlaps(first: SceneObject, second: SceneObject) -> bool:
    return all(
        first.min[index] <= second.max[index] and second.min[index] <= first.max[index]
        for index in range(3)
    )


def directional(subject: SceneObject, reference: SceneObject, direction: str, dead_zone: float = 0.3) -> bool:
    delta = [subject.center[index] - reference.center[index] for index in range(3)]
    return {
        "left": delta[0] < -dead_zone,
        "right": delta[0] > dead_zone,
        "above": delta[1] > dead_zone,
        "below": delta[1] < -dead_zone,
        "front": delta[2] < -dead_zone,
        "behind": delta[2] > dead_zone,
    }[direction]


def load_catalog(root: Path) -> tuple[list[SceneObject], list[SceneRoom], list[str]]:
    labels_path = root / "public" / "assets" / "labels.json"
    structure_path = root / "public" / "assets" / "structure.json"
    labels: list[dict[str, Any]] = json.loads(labels_path.read_text(encoding="utf-8"))
    structure: dict[str, Any] = json.loads(structure_path.read_text(encoding="utf-8"))
    warnings: list[str] = []
    rooms: list[SceneRoom] = []
    for index, room in enumerate(structure.get("rooms", []), 1):
        profile = room.get("profile", [])
        polygon = [(float(point[0]), -float(point[1])) for point in profile]
        rooms.append(SceneRoom(room_id=f"room_{index:03d}", polygon=polygon, area=polygon_area(polygon)))

    objects: list[SceneObject] = []
    for index, record in enumerate(labels):
        corners = record.get("bounding_box")
        object_id = str(record.get("ins_id", ""))
        if not object_id and record.get("label", "").strip().lower() == "room":
            continue
        if not object_id or not isinstance(corners, list) or len(corners) != 8:
            warnings.append(f"Skipped malformed label record at index {index}.")
            continue
        try:
            viewer_corners = [source_to_viewer(point) for point in corners]
        except (KeyError, TypeError, ValueError):
            warnings.append(f"Skipped malformed label record {object_id}.")
            continue
        minimum = tuple(min(point[axis] for point in viewer_corners) for axis in range(3))
        maximum = tuple(max(point[axis] for point in viewer_corners) for axis in range(3))
        center = tuple((minimum[axis] + maximum[axis]) / 2 for axis in range(3))
        dimensions = tuple(maximum[axis] - minimum[axis] for axis in range(3))
        room_id = next(
            (room.room_id for room in rooms if point_in_polygon((center[0], center[2]), room.polygon)),
            None,
        )
        objects.append(
            SceneObject(
                object_id=object_id,
                label=str(record["label"]).strip().lower(),
                source_corners=corners,
                min=minimum,
                max=maximum,
                center=center,
                dimensions=dimensions,
                volume=math.prod(dimensions),
                room_id=room_id,
            )
        )
    return objects, rooms, warnings
