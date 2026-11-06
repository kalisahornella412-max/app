# Iteration 13: progress/streaks, events re-verification (source_checked), MetroWorks removal, brand kit assets
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL, PW = "delivered@resend.dev", "Test1234!"


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PW})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    return s


# Progress endpoint (established user)
class TestProgress:
    def test_progress_shape(self, user_session):
        r = user_session.get(f"{BASE_URL}/api/me/progress")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["streak_weeks"], int) and d["streak_weeks"] >= 1
        assert d["active_this_week"] is True
        assert set(d["this_week"].keys()) == {"saved", "applied", "letter", "mock", "resume"}
        assert set(d["totals"].keys()) == {"applied", "interviewed", "hired", "letters", "mocks", "saved"}
        assert isinstance(d["nudges"], list) and len(d["nudges"]) <= 3
        for n in d["nudges"]:
            assert {"key", "text", "to"} <= set(n.keys())
        assert d["last_active"] and d["week_start"]
        assert "_id" not in str(d)

    def test_progress_unauth(self):
        r = requests.get(f"{BASE_URL}/api/me/progress")
        assert r.status_code == 401

    def test_progress_new_user_then_delete(self):
        s = requests.Session()
        email = f"test_prog_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Test1234!", "name": "TEST_Prog"})
        assert r.status_code in (200, 201), r.text
        try:
            p = s.get(f"{BASE_URL}/api/me/progress")
            assert p.status_code == 200
            d = p.json()
            assert d["streak_weeks"] == 0
            assert d["active_this_week"] is False
            keys = [n["key"] for n in d["nudges"]]
            assert "resume" in keys and "save" in keys
            assert d["last_active"] is None
            assert all(v == 0 for v in d["this_week"].values())
        finally:
            dr = s.delete(f"{BASE_URL}/api/me")
            assert dr.status_code in (200, 204), dr.text
            # verify deleted -> login fails
            lr = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Test1234!"})
            assert lr.status_code in (400, 401, 404)


# Events and event feeds
class TestEvents:
    def test_events_verified(self):
        r = requests.get(f"{BASE_URL}/api/events")
        assert r.status_code == 200
        ev = r.json()
        assert len(ev) == 8, [e.get("slug") for e in ev]
        for e in ev:
            assert e.get("source_checked") == "2026-11-06", e.get("slug")
        slugs = {e.get("slug") for e in ev}
        for s in ["canadian-immigrant-fair-halifax", "job-junction-library-dropin", "halifax-job-fair-expo",
                  "ymca-newcomer-family-socials", "bij-stem-bootcamp"]:
            assert s in slugs, s
        assert "metroworks" not in r.text.lower()

    def test_events_immigrant_filter(self):
        r = requests.get(f"{BASE_URL}/api/events", params={"audience": "immigrant"})
        assert r.status_code == 200
        slugs = {e.get("slug") for e in r.json()}
        assert "canadian-immigrant-fair-halifax" in slugs
        assert "ymca-newcomer-family-socials" in slugs

    def test_event_feeds_no_metroworks(self):
        r = requests.get(f"{BASE_URL}/api/event-feeds")
        assert r.status_code == 200
        assert len(r.json()) > 0
        assert "metroworks" not in r.text.lower()


# Brand assets
class TestBrand:
    def test_logo_kit_zip(self):
        r = requests.get(f"{BASE_URL}/brand/halifax-youth-hub-logo-kit.zip")
        assert r.status_code == 200
        assert "zip" in r.headers.get("content-type", "")
        assert 800_000 < len(r.content) < 1_200_000
        assert r.content[:2] == b"PK"

    def test_favicon(self):
        r = requests.get(f"{BASE_URL}/brand/icon-32.png")
        assert r.status_code == 200
        assert "image/png" in r.headers.get("content-type", "")
        assert r.content[:4] == b"\x89PNG"
