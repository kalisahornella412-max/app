"""Backend tests for Halifax Youth Hub iteration 4 — curated newcomer programs + job feeds."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.strip().split("=", 1)[1].rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


# ============== Stats ==============
class TestStats:
    def test_stats_counts(self):
        r = requests.get(f"{API}/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["programs"] == 29, f"programs={data['programs']}"
        assert data["jobs"] == 5, f"jobs={data['jobs']}"
        assert data["events"] == 7, f"events={data['events']}"


# ============== Programs (immigrant audience curated list) ==============
class TestImmigrantPrograms:
    @pytest.fixture(scope="class")
    def immigrant_progs(self):
        r = requests.get(f"{API}/programs?audience=immigrant", timeout=15)
        assert r.status_code == 200
        return r.json()

    def test_count_22(self, immigrant_progs):
        assert len(immigrant_progs) == 22, f"got {len(immigrant_progs)}"

    def test_required_slugs_present(self, immigrant_progs):
        slugs = {p["slug"] for p in immigrant_progs}
        required = [
            "isans-main", "isans-sopa", "metroworks", "veith-house",
            "ywca-financial-literacy", "halifax-libraries", "isans-career-fairs",
            "linc-clic", "ece-pathway", "ns-nominee-program",
            "atlantic-immigration-program", "fswep-international",
            "uacwa-she-matters", "newinhalifax",
        ]
        missing = [s for s in required if s not in slugs]
        assert not missing, f"missing: {missing}"

    def test_youth_only_excluded(self, immigrant_progs):
        slugs = {p["slug"] for p in immigrant_progs}
        forbidden = ["youth-worx", "lead-program", "ymca-youth", "phoenix-youth",
                     "nstay-ywca", "canada-summer-jobs", "ns-skill"]
        leaked = [s for s in forbidden if s in slugs]
        assert not leaked, f"youth-only slugs leaked: {leaked}"


# ============== ISANS main detail ==============
class TestISANSDetail:
    def test_isans_main_detail(self):
        r = requests.get(f"{API}/programs/isans-main", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == "isans-main"
        assert "Mumford" in data["description"]
        assert "902-423-3607" in data["description"]
        assert "immigrant" in data["audiences"]


# ============== Job Feeds endpoint ==============
class TestJobFeeds:
    def test_youth_feeds_count_and_fields(self):
        r = requests.get(f"{API}/job-feeds?audience=youth", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 9, f"youth feeds={len(data)}"
        for f in data:
            for field in ("id", "slug", "title", "publisher", "description", "url", "color", "audiences"):
                assert field in f, f"missing field {field} in {f}"
            assert "_id" not in f
        slugs = {f["slug"] for f in data}
        assert "jobbank-halifax-youth" in slugs
        assert "isans-job-board" not in slugs

    def test_immigrant_feeds(self):
        r = requests.get(f"{API}/job-feeds?audience=immigrant", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 9, f"immigrant feeds={len(data)}"
        slugs = {f["slug"] for f in data}
        assert "isans-job-board" in slugs
        assert "jobbank-halifax-youth" not in slugs

    def test_no_audience_returns_all(self):
        r = requests.get(f"{API}/job-feeds", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 10  # total feeds


# ============== Jobs (5 spotlights) ==============
class TestJobs:
    def test_youth_jobs_count(self):
        r = requests.get(f"{API}/jobs?audience=youth", timeout=15)
        assert r.status_code == 200
        data = r.json()
        slugs = {j["slug"] for j in data}
        assert "ymca-summer-camp" in slugs
        assert "hrm-lifeguard" in slugs
        assert len(data) == 2

    def test_immigrant_jobs_count(self):
        r = requests.get(f"{API}/jobs?audience=immigrant", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
