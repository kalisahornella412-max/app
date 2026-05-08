"""Iteration 6: Live Jobs (Job Bank Canada scraper) tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://youth-worx-connect.preview.emergentagent.com").rstrip("/")
LIVE = f"{BASE_URL}/api/live-jobs"

HRM_KEYWORDS = [
    "halifax", "dartmouth", "bedford", "sackville", "cole harbour",
    "eastern passage", "hammonds plains", "tantallon", "spryfield",
    "fall river", "beaver bank", "waverley", "lower sackville",
    "middle sackville", "upper tantallon", "lawrencetown", "porters lake",
    "musquodoboit", "head of st. margarets bay", "timberlea", "lakeside",
    "clayton park", "fairview", "rockingham", "armdale", "burnside",
    "north preston", "east preston", "cherry brook", "windsor junction",
    "hubbards", "mount uniacke", "elmsdale", "enfield", "goffs",
]


@pytest.fixture(scope="module")
def base_response():
    r = requests.get(LIVE, timeout=45)
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"
    return r.json()


class TestLiveJobsShape:
    def test_response_envelope(self, base_response):
        d = base_response
        for key in ("jobs", "fetched_at", "source_url", "cached"):
            assert key in d, f"missing {key} in {list(d.keys())}"
        assert isinstance(d["jobs"], list)
        # Should not have fatal error and zero jobs
        if "error" in d:
            pytest.skip(f"upstream error: {d['error']}")
        assert len(d["jobs"]) > 0, "expected at least one Halifax job"

    def test_job_fields(self, base_response):
        if not base_response["jobs"]:
            pytest.skip("no jobs to validate")
        for j in base_response["jobs"]:
            for f in ("id", "title", "employer", "location", "posted_at",
                     "wage", "apply_url", "source"):
                assert f in j, f"missing field {f} in job {j}"
            assert j["source"] == "Job Bank Canada"
            assert j["apply_url"].startswith("https://www.jobbank.gc.ca/jobsearch/jobposting/"), \
                f"bad apply_url: {j['apply_url']}"

    def test_all_jobs_in_hrm(self, base_response):
        if not base_response["jobs"]:
            pytest.skip("no jobs")
        for j in base_response["jobs"]:
            loc = j["location"].lower()
            assert "(ns)" in loc or "nova scotia" in loc, f"non-NS: {j['location']}"
            assert any(c in loc for c in HRM_KEYWORDS), f"non-HRM: {j['location']}"
            # explicit excludes
            for bad in ("antigonish", "sydney", "truro", "yarmouth", "kentville",
                        "new glasgow", "amherst", "bridgewater"):
                assert bad not in loc, f"non-HRM city '{bad}' in {j['location']}"


class TestLiveJobsCaching:
    def test_youth_audience_caches(self):
        r1 = requests.get(f"{LIVE}?audience=youth", timeout=45)
        assert r1.status_code == 200
        d1 = r1.json()
        if "error" in d1 and not d1.get("jobs"):
            pytest.skip(f"upstream: {d1.get('error')}")
        r2 = requests.get(f"{LIVE}?audience=youth", timeout=45)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["cached"] is True, "second call within 30 min must be cached"
        # source_url must contain fyt=1 for youth filter
        assert "fyt=1" in d2["source_url"], f"expected fyt=1 in {d2['source_url']}"


class TestLiveJobsLimit:
    def test_limit_caps_results(self):
        r = requests.get(f"{LIVE}?limit=5", timeout=45)
        assert r.status_code == 200
        d = r.json()
        assert len(d["jobs"]) <= 5
