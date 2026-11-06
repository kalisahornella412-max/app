# Iteration 9: saved jobs feature + live-jobs regression
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@halifaxyouth.ca", "password": "admin123"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    return s


# Live jobs regression
@pytest.mark.parametrize("aud", ["youth", "immigrant"])
def test_live_jobs(aud):
    for attempt in range(2):
        r = requests.get(f"{BASE_URL}/api/live-jobs", params={"audience": aud, "limit": 6}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        jobs = data.get("jobs") if isinstance(data, dict) else data
        assert isinstance(jobs, list)
        if jobs:
            break
        time.sleep(3)
    print(aud, len(jobs), (jobs[0] if jobs else data))
    assert len(jobs) <= 6


# Saved jobs CRUD
def test_saved_jobs_unauth():
    r = requests.get(f"{BASE_URL}/api/me/saved-jobs", timeout=20)
    assert r.status_code == 401
    r = requests.post(f"{BASE_URL}/api/saved/jobs", json={"job_id": "x", "title": "x", "apply_url": "x"}, timeout=20)
    assert r.status_code == 401


def test_saved_jobs_flow(client):
    jid = f"TEST_{uuid.uuid4().hex[:8]}"
    payload = {"job_id": jid, "title": "TEST_Barista", "employer": "TEST Co", "location": "Halifax, NS",
               "wage": "$16/hr", "apply_url": "https://example.com/j", "source": "Job Bank", "posted_at": "2026-01-01"}
    try:
        r = client.post(f"{BASE_URL}/api/saved/jobs", json=payload)
        assert r.status_code == 200 and r.json() == {"ok": True}
        r = client.post(f"{BASE_URL}/api/saved/jobs", json=payload)
        assert r.status_code == 200
        lst = client.get(f"{BASE_URL}/api/me/saved-jobs").json()
        mine = [j for j in lst if j["job_id"] == jid]
        assert len(mine) == 1
        assert "_id" not in mine[0]
        assert mine[0]["title"] == "TEST_Barista" and mine[0]["wage"] == "$16/hr"
        r = client.delete(f"{BASE_URL}/api/saved/jobs/{jid}")
        assert r.status_code == 200
        lst = client.get(f"{BASE_URL}/api/me/saved-jobs").json()
        assert not [j for j in lst if j["job_id"] == jid]
    finally:
        client.delete(f"{BASE_URL}/api/saved/jobs/{jid}")


def test_saved_jobs_validation(client):
    r = client.post(f"{BASE_URL}/api/saved/jobs", json={"job_id": "TEST_bad"})
    assert r.status_code == 422


def test_saved_jobs_special_chars_id(client):
    jid = "TEST_jb:123/abc"
    try:
        r = client.post(f"{BASE_URL}/api/saved/jobs", json={"job_id": jid, "title": "t", "apply_url": "u"})
        assert r.status_code == 200
        r = client.delete(f"{BASE_URL}/api/saved/jobs/{requests.utils.quote(jid, safe='')}")
        print("delete special", r.status_code)
        lst = client.get(f"{BASE_URL}/api/me/saved-jobs").json()
        assert not [j for j in lst if j["job_id"] == jid]
    finally:
        pass


# Regression: other dashboard endpoints
@pytest.mark.parametrize("ep", ["/api/me/saved-programs", "/api/resumes", "/api/auth/me"])
def test_dashboard_endpoints(client, ep):
    r = client.get(f"{BASE_URL}{ep}")
    assert r.status_code == 200
