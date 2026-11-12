from fastapi.testclient import TestClient

from app.main import app


def test_objects_and_query_endpoints():
    client = TestClient(app)
    response = client.get("/api/scene/objects", params={"label": "chair", "limit": 3})
    assert response.status_code == 200
    assert len(response.json()) == 3

    response = client.post("/api/query", json={"plan": {"intent": "count", "target_label": "chair"}})
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_nearest_query_returns_ambiguity_for_label_reference():
    client = TestClient(app)
    response = client.post(
        "/api/query",
        json={"question": "Find the three chairs closest to the table"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ambiguous"
