"""Tests for audience filter feature, YouthWorx URL fix, and removed jobs."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://youth-worx-connect.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Stats ----------
def test_stats_counts(session):
    r = session.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    assert d["programs"] == 21, f"programs={d['programs']}"
    assert d["jobs"] == 7, f"jobs={d['jobs']}"
    assert d["events"] == 6, f"events={d['events']}"


# ---------- Programs audience filter ----------
def test_programs_audience_youth(session):
    r = session.get(f"{API}/programs", params={"audience": "youth"})
    assert r.status_code == 200
    progs = r.json()
    assert len(progs) > 0
    for p in progs:
        assert "youth" in p["audiences"], f"{p['name']} missing 'youth' in {p['audiences']}"
    slugs = {p["slug"] for p in progs}
    assert "lead-program" in slugs  # youth-only
    assert "youth-worx" in slugs


def test_programs_audience_immigrant(session):
    r = session.get(f"{API}/programs", params={"audience": "immigrant"})
    assert r.status_code == 200
    progs = r.json()
    assert len(progs) > 0
    for p in progs:
        assert "immigrant" in p["audiences"], f"{p['name']} missing 'immigrant'"
    slugs = {p["slug"] for p in progs}
    # Immigrant-only must be present
    assert "isans-settlement" in slugs
    assert "yreach-newcomer" in slugs
    assert "halifax-refugee-clinic" in slugs
    # Pure-youth programs must NOT be present
    assert "lead-program" not in slugs
    assert "youth-worx" not in slugs


def test_programs_dual_audience_appears_in_both(session):
    r1 = session.get(f"{API}/programs", params={"audience": "youth"}).json()
    r2 = session.get(f"{API}/programs", params={"audience": "immigrant"}).json()
    youth_slugs = {p["slug"] for p in r1}
    imm_slugs = {p["slug"] for p in r2}
    # immigrant-youth (ISANS Youth) is tagged with both
    assert "immigrant-youth" in youth_slugs
    assert "immigrant-youth" in imm_slugs
    assert "ymca-youth" in youth_slugs and "ymca-youth" in imm_slugs


# ---------- YouthWorx URL fix ----------
def test_youthworx_apply_url(session):
    r = session.get(f"{API}/programs/youth-worx")
    assert r.status_code == 200
    p = r.json()
    assert p["apply_url"] == "https://www.halifax.ca/parks-recreation/halifax-youth"
    assert "hopeblooms" not in p["apply_url"].lower()


# ---------- Jobs filter & removed jobs ----------
def test_jobs_immigrant_includes_required(session):
    r = session.get(f"{API}/jobs", params={"audience": "immigrant"})
    assert r.status_code == 200
    jobs = r.json()
    titles = {j["title"] for j in jobs}
    employers = {j["employer"] for j in jobs}
    assert "Language Programs Assistant" in titles
    assert "Translator / Interpreter — On-Call" in titles
    assert "Youth Newcomer Program Assistant" in titles
    # Ensure deleted jobs are NOT present
    assert "Java Blend Coffee" not in employers
    assert "Volta Labs" not in employers


def test_jobs_no_legacy_employers(session):
    r = session.get(f"{API}/jobs")
    assert r.status_code == 200
    jobs = r.json()
    for j in jobs:
        assert j["employer"] != "Java Blend Coffee"
        assert j["employer"] != "Volta Labs"
        assert "slug" in j and j["slug"]  # all should have slug


def test_jobs_youth_audience(session):
    r = session.get(f"{API}/jobs", params={"audience": "youth"})
    assert r.status_code == 200
    for j in r.json():
        assert "youth" in j["audiences"]


# ---------- Events audience filter ----------
def test_events_immigrant(session):
    r = session.get(f"{API}/events", params={"audience": "immigrant"})
    assert r.status_code == 200
    events = r.json()
    titles = {e["title"] for e in events}
    assert "Newcomer Resume & Interview Clinic" in titles
    assert "Newcomer Welcome Night — YREACH" in titles
    # Youth-only must NOT appear
    assert "LEAD Civic Engagement Mixer" not in titles
    for e in events:
        assert "immigrant" in e["audiences"]


def test_events_youth(session):
    r = session.get(f"{API}/events", params={"audience": "youth"})
    assert r.status_code == 200
    titles = {e["title"] for e in r.json()}
    assert "LEAD Civic Engagement Mixer" in titles
