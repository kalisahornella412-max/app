# Iteration 16: Community Directory listings (public + admin CRUD + validation) + regression counts
import os
import uuid
import pytest
import requests


def _env(path, key):
    for line in open(path):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _env("/app/frontend/.env", "REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@halifaxyouth.ca", "password": "admin123"}
USER = {"email": "delivered@resend.dev", "password": "Test1234!"}
CATS = ["Beauty & Personal Care", "Photography & Creative Services", "Restaurants & Food Businesses",
        "Arts & Creative Communities", "Faith & Spiritual Communities"]


def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def created_ids(admin):
    ids = []
    yield ids
    for i in ids:
        admin.delete(f"{API}/listings/{i}")


# ---- Public ----
class TestPublic:
    def test_categories(self):
        r = requests.get(f"{API}/listings/categories")
        assert r.status_code == 200
        assert r.json() == CATS

    def test_list_all(self):
        r = requests.get(f"{API}/listings")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 15, [d["slug"] for d in data]
        for d in data:
            for k in ("id", "slug", "name", "category", "short_description", "neighbourhood", "is_featured"):
                assert k in d
            assert d["status"] == "approved"
            assert "_id" not in d
            if d.get("instagram"):
                assert d["instagram_url"] == f"https://www.instagram.com/{d['instagram']}/"
        flags = [d["is_featured"] for d in data]
        assert flags == sorted(flags, reverse=True), "featured-first ordering broken"
        noct = next(d for d in data if d["slug"] == "nocturne-halifax")
        assert noct["instagram_url"] == "https://www.instagram.com/nocturnehalifax/"

    def test_filter_category(self):
        r = requests.get(f"{API}/listings", params={"category": "Arts & Creative Communities"})
        assert r.status_code == 200
        assert len(r.json()) == 3
        assert all(d["category"] == "Arts & Creative Communities" for d in r.json())

    def test_search_barber(self):
        r = requests.get(f"{API}/listings", params={"q": "barber"})
        assert r.status_code == 200 and len(r.json()) >= 1

    def test_featured(self):
        r = requests.get(f"{API}/listings", params={"featured": "true"})
        assert r.status_code == 200
        assert len(r.json()) == 5
        assert all(d["is_featured"] for d in r.json())

    def test_detail_and_invalid(self):
        lid = requests.get(f"{API}/listings").json()[0]["id"]
        r = requests.get(f"{API}/listings/{lid}")
        assert r.status_code == 200 and r.json()["id"] == lid
        assert requests.get(f"{API}/listings/not-an-id").status_code == 404
        assert requests.get(f"{API}/listings/000000000000000000000000").status_code == 404


# ---- Admin CRUD ----
class TestAdmin:
    def test_full_flow(self, admin, created_ids):
        name = f"QA Nail Studio {uuid.uuid4().hex[:5]}"
        payload = {"name": name, "category": "Beauty & Personal Care",
                   "short_description": "QA test listing for nails.", "instagram": "@qa.nails_hfx",
                   "website": "qanails.ca", "neighbourhood": "Dartmouth", "status": "pending"}
        r = admin.post(f"{API}/listings", json=payload)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        created_ids.append(d["id"])
        assert d["slug"] == name.lower().replace(" ", "-")
        assert d["instagram"] == "qa.nails_hfx"
        assert d["instagram_url"] == "https://www.instagram.com/qa.nails_hfx/"
        assert d["website"] == "https://qanails.ca"
        assert d["status"] == "pending"
        lid = d["id"]
        # duplicate slug
        assert admin.post(f"{API}/listings", json=payload).status_code == 400
        # pending hidden from public
        assert lid not in [x["id"] for x in requests.get(f"{API}/listings").json()]
        assert requests.get(f"{API}/listings/{lid}").status_code == 404
        assert admin.get(f"{API}/listings/{lid}").status_code == 200
        assert lid in [x["id"] for x in admin.get(f"{API}/admin/listings").json()]
        # approve
        r = admin.patch(f"{API}/listings/{lid}", json={"status": "approved"})
        assert r.status_code == 200 and r.json()["status"] == "approved"
        assert lid in [x["id"] for x in requests.get(f"{API}/listings").json()]
        # feature
        r = admin.patch(f"{API}/listings/{lid}", json={"is_featured": True})
        assert r.status_code == 200 and r.json()["is_featured"] is True
        # PUT
        body = {**payload, "status": "approved", "is_featured": True, "short_description": "Updated QA description text."}
        r = admin.put(f"{API}/listings/{lid}", json=body)
        assert r.status_code == 200, r.text
        assert requests.get(f"{API}/listings/{lid}").json()["short_description"] == "Updated QA description text."
        # delete
        assert admin.delete(f"{API}/listings/{lid}").status_code == 200
        assert requests.get(f"{API}/listings/{lid}").status_code == 404
        assert admin.get(f"{API}/listings/{lid}").status_code == 404
        created_ids.remove(lid)

    def test_validation(self, admin):
        base = {"name": "QA Bad", "category": "Plumbing", "short_description": "QA invalid listing test."}
        assert admin.post(f"{API}/listings", json=base).status_code == 400
        base["category"] = "Beauty & Personal Care"
        base["instagram"] = "bad handle!"
        assert admin.post(f"{API}/listings", json=base).status_code == 400
        base["instagram"] = None
        base["status"] = "live"
        assert admin.post(f"{API}/listings", json=base).status_code == 400
        # instagram URL normalization (no create—just check it'd be accepted via a short description error)
        assert admin.post(f"{API}/listings", json={**base, "status": "pending", "short_description": "short"}).status_code == 422

    def test_authz(self):
        body = {"name": "QA Nope", "category": "Beauty & Personal Care", "short_description": "QA unauthorized test."}
        r = requests.post(f"{API}/listings", json=body)
        assert r.status_code == 401, r.status_code
        u = _login(USER)
        assert u.post(f"{API}/listings", json=body).status_code == 403
        assert u.get(f"{API}/admin/listings").status_code == 403
        assert requests.get(f"{API}/admin/listings").status_code == 401


# ---- Regression ----
def test_regression_counts():
    assert len(requests.get(f"{API}/programs").json()) == 27
    assert len(requests.get(f"{API}/jobs").json()) == 17
    assert len(requests.get(f"{API}/events").json()) == 8
