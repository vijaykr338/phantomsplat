import json

from app import llm


class _Response:
    def read(self):
        return json.dumps({
            "choices": [{
                "message": {
                    "content": '{"intent":"count","target_label":"chair"}',
                },
            }],
        }).encode()


def test_openai_compatible_chat_completion_request(monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        captured["payload"] = json.loads(request.data)
        captured["timeout"] = timeout
        return _Response()

    monkeypatch.setattr(llm, "LLM_API_KEY", "test-key")
    monkeypatch.setattr(llm, "LLM_BASE_URL", "https://provider.test/v1")
    monkeypatch.setattr(llm, "LLM_MODEL", "test-model")
    monkeypatch.setattr(llm.request, "urlopen", fake_urlopen)

    plan = llm.parse_with_llm("How many chairs?", ["chair", "table"])

    assert plan is not None
    assert plan.intent == "count"
    assert captured["url"] == "https://provider.test/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["payload"]["model"] == "test-model"
    assert captured["payload"]["messages"][1]["role"] == "user"
    assert captured["payload"]["response_format"]["type"] == "json_object"
    assert captured["payload"]["response_format"]["schema"]["required"] == ["intent"]
