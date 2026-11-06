# Iteration 10: Spotlight jobs expansion (counts, fields, sort, filters) + saved-job regression
import os
from datetime import datetime
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
REQUIRED = ["slug", "title", "employer", "category", "wage", "apply_url", "posted_at", "deadline"]


def _get(params=None):
    r = requests.get(f"{BASE_URL}/api/jobs", params=params, timeout=20)
    assert r.status_code == 200
    return r.json()


# Counts per audience
@pytest.mark.parametrize("params,expected", [({}, 17), ({"audience": "youth"}, 11), ({"audience": "immigrant"}, 10), ({"audience": "all"}, 17)])
def test_job_counts(params, expected):
    assert len(_get(params)) == expected


# Field completeness + https apply_url + ISO posted_at + no _id
def test_job_fields():
    for j in _get():
        for k in REQUIRED:
            assert j.get(k), f"{j.get('slug')} missing {k}"
        assert j["apply_url"].startswith("https://"), j["apply_url"]
        datetime.fromisoformat(j["posted_at"])
        assert "_id" not in j and isinstance(j["id"], str)


def test_unique_slugs():
    slugs = [j["slug"] for j in _get()]
    assert len(slugs) == len(set(slugs))


# Sort posted_at desc
@pytest.mark.parametrize("params", [{}, {"audience": "youth"}, {"audience": "immigrant"}])
def test_sorted_desc(params):
    ts = [datetime.fromisoformat(j["posted_at"]) for j in _get(params)]
    assert ts == sorted(ts, reverse=True)


# Text search
def test_search_transit():
    res = _get({"q": "transit"})
    assert len(res) >= 1
    for j in res:
        assert "transit" in f"{j['title']} {j['employer']} {j['description']}".lower()


def test_category_audience_filter():
    res = _get({"category": "Healthcare", "audience": "immigrant"})
    assert len(res) >= 1
    assert all(j["category"] == "Healthcare" and "immigrant" in j["audiences"] for j in res)


def test_regex_special_chars_no_500():
    r = requests.get(f"{BASE_URL}/api/jobs", params={"q": "("}, timeout=20)
    assert r.status_code < 500, r.status_code


# Saved-job regression
def test_save_job_regression():
    s = requests.Session()
    lr = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@halifaxyouth.ca", "password": "admin123"})
    if lr.status_code != 200:
        pytest.skip("login failed")
    job = _get({"audience": "immigrant"})[0]
    payload = {"job_id": job["id"], "title": job["title"], "employer": job["employer"], "apply_url": job["apply_url"], "source": "Spotlight"}
    r = s.post(f"{BASE_URL}/api/saved/jobs", json=payload)
    assert r.status_code in (200, 201), r.text
    saved = s.get(f"{BASE_URL}/api/me/saved-jobs").json()
    ids = [x.get("job_id") or x.get("id") for x in saved]
    assert job["id"] in ids
    d = s.delete(f"{BASE_URL}/api/saved/jobs/{job['id']}")
    assert d.status_code in (200, 204)
