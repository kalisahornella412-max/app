# Iteration 17: ANFGC listing, featured picks, link updates, Google Sheet import + cron
import os
import pytest
import requests


def _env(path, key):
    for line in open(path):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _env("/app/frontend/.env", "REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
CRON = _env("/app/backend/.env", "WEBHOOK_CRON_SECRET")
ADMIN = {"email": "admin@halifaxyouth.ca", "password": "admin123"}
USER = {"email": "delivered@resend.dev", "password": "Test1234!"}
HRM = "https://www.halifax.ca/about-halifax/employment"


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
def user():
    return _login(USER)


def _items(r):
    d = r.json()
    return d if isinstance(d, list) else d.get("items", d.get("listings", []))


# ---- Listings ----
class TestListings:
    def test_anfgc(self):
        r = requests.get(f"{API}/listings", params={"q": "ANFGC"})
        assert r.status_code == 200
        items = _items(r)
        assert len(items) == 1
        it = items[0]
        assert it["category"] == "Faith & Spiritual Communities"
        assert it["website"] == "https://www.anfgchalifax.com/"
        assert it["is_featured"] is True
        assert "anfgchalifax.com/any-goodlife" in (it.get("booking_url") or "")
        assert "_id" not in it

    def test_featured_5(self):
        items = _items(requests.get(f"{API}/listings", params={"featured": "true"}))
        assert len(items) == 5
        assert all(i["is_featured"] for i in items)
        assert any("ANFGC" in i["name"] for i in items)

    def test_total_16(self):
        assert len(_items(requests.get(f"{API}/listings"))) == 16


# ---- Link updates ----
class TestLinks:
    def test_event_feeds(self):
        r = requests.get(f"{API}/event-feeds")
        assert r.status_code == 200
        urls = [f.get("url") for f in r.json()]
        assert "https://www.ywcahalifax.com/events/" in urls
        assert "https://jobjunction.ca/workshop-information/" in urls

    def test_ywca_event(self):
        ev = [e for e in _items(requests.get(f"{API}/events")) if e.get("slug") == "ywca-ready-4-launch-info"]
        assert ev, "event slug missing"
        assert ev[0]["host_url"] == "https://www.ywcahalifax.com/events/"

    def test_hrm_jobs(self):
        jobs = {j.get("slug"): j for j in _items(requests.get(f"{API}/jobs"))}
        for s in ("hrm-rec-program-leader", "halifax-transit-bus-operator"):
            assert s in jobs, f"{s} missing"
            assert jobs[s]["apply_url"] == HRM

    def test_job_feeds_hrm(self):
        r = requests.get(f"{API}/job-feeds")
        assert r.status_code == 200
        hrm = [f for f in r.json() if "halifax.ca" in (f.get("url") or "")]
        assert hrm, "no HRM feed"
        assert all(f["url"] == HRM for f in hrm), [f["url"] for f in hrm]


# ---- Sheet import ----
class TestImport:
    def test_settings(self, admin):
        r = admin.get(f"{API}/admin/listings/import-settings")
        assert r.status_code == 200
        d = r.json()
        assert d["key"] == "listing_sheet"
        assert "sheet_url" in d and "last_run" in d
        assert "_id" not in d

    def test_bad_link(self, admin):
        r = admin.post(f"{API}/admin/listings/import-sheet", json={"sheet_url": "https://example.com/x", "save": False})
        assert r.status_code == 400
        assert "Paste a Google Sheets link" in r.json()["detail"]

    def test_inaccessible(self, admin):
        r = admin.post(f"{API}/admin/listings/import-sheet", json={
            "sheet_url": "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit", "save": False})
        assert r.status_code == 400
        assert "Couldn't read the sheet" in r.json()["detail"]

    def test_non_admin(self, user):
        r = user.post(f"{API}/admin/listings/import-sheet", json={"sheet_url": "https://example.com/x", "save": False})
        assert r.status_code == 403
        assert user.get(f"{API}/admin/listings/import-settings").status_code == 403

    def test_anon(self):
        r = requests.get(f"{API}/admin/listings/import-settings")
        assert r.status_code == 401

    def test_settings_not_saved(self, admin):
        d = admin.get(f"{API}/admin/listings/import-settings").json()
        assert not d.get("sheet_url")

    def test_cron_noauth(self):
        r = requests.post(f"{API}/cron/import-listings", json={})
        assert r.status_code == 401

    def test_cron_wrong(self):
        r = requests.post(f"{API}/cron/import-listings", json={}, headers={"Authorization": "Bearer nope"})
        assert r.status_code == 401

    def test_cron_ok(self):
        r = requests.post(f"{API}/cron/import-listings", json={}, headers={"Authorization": f"Bearer {CRON}"})
        assert r.status_code == 200
        assert r.json() == {"accepted": True, "skipped": "no sheet configured"}
