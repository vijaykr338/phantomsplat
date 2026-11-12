from pathlib import Path

from app.spatial import bbox_surface_distance, load_catalog


def test_catalog_preserves_dataset_and_coordinates():
    root = Path(__file__).resolve().parents[2]
    objects, rooms, warnings = load_catalog(root)
    assert len(objects) == 1402
    assert len(rooms) == 2
    assert objects[0].object_id == "16"
    assert objects[0].center[1] >= 0
    assert not warnings


def test_surface_distance_is_zero_for_intersection():
    root = Path(__file__).resolve().parents[2]
    objects, _, _ = load_catalog(root)
    assert bbox_surface_distance(objects[0], objects[0]) == 0
