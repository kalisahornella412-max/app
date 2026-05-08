"""Iteration 5: Real recurring events + Live event feeds aggregator."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://47abc6db-d476-4eab-8df8-22c8240afcd7.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ===== /api/stats =====
def test_stats_events_count(s):
    r = s.get(f"{BASE_URL}/api/stats", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("events") == 8, f"Expected events=8, got {data.get('events')}"


# ===== /api/event-feeds =====
def test_event_feeds_youth_count(s):
    r = s.get(f"{BASE_URL}/api/event-feeds?audience=youth", timeout=15)
    assert r.status_code == 200
    feeds = r.json()
    assert len(feeds) == 8, f"Expected 8 youth feeds, got {len(feeds)}"
    # required fields
    required = {"id", "slug", "title", "publisher", "description", "url", "color", "audiences"}
    for f in feeds:
        missing = required - set(f.keys())
        assert not missing, f"Feed {f.get('slug')} missing fields: {missing}"


def test_event_feeds_immigrant_count(s):
    r = s.get(f"{BASE_URL}/api/event-feeds?audience=immigrant", timeout=15)
    assert r.status_code == 200
    feeds = r.json()
    assert len(feeds) == 10, f"Expected 10 immigrant feeds, got {len(feeds)}"


def test_isans_events_only_immigrant(s):
    r_y = s.get(f"{BASE_URL}/api/event-feeds?audience=youth", timeout=15).json()
    r_i = s.get(f"{BASE_URL}/api/event-feeds?audience=immigrant", timeout=15).json()
    youth_slugs = [f["slug"] for f in r_y]
    imm_slugs = [f["slug"] for f in r_i]
    assert "isans-events" in imm_slugs
    assert "isans-events" not in youth_slugs


def test_eventbrite_in_both(s):
    r_y = s.get(f"{BASE_URL}/api/event-feeds?audience=youth", timeout=15).json()
    r_i = s.get(f"{BASE_URL}/api/event-feeds?audience=immigrant", timeout=15).json()
    assert "eventbrite-halifax" in [f["slug"] for f in r_y]
    assert "eventbrite-halifax" in [f["slug"] for f in r_i]


# ===== /api/events =====
def test_events_youth_have_host_url(s):
    r = s.get(f"{BASE_URL}/api/events?audience=youth", timeout=15)
    assert r.status_code == 200
    events = r.json()
    assert len(events) > 0
    for e in events:
        assert e.get("host_url"), f"Event {e.get('slug')} missing host_url"
        assert "duration_minutes" not in e, f"Event {e.get('slug')} still has duration_minutes"
        assert isinstance(e.get("starts_at"), str)
    hosts = " ".join(e.get("host_url", "") for e in events)
    # at least one of expected hosts appears
    assert any(d in hosts for d in ["halifaxpubliclibraries.ca", "ywcahalifax.com", "halifax.ca/parks-recreation"])


def test_events_immigrant_includes_expected(s):
    r = s.get(f"{BASE_URL}/api/events?audience=immigrant", timeout=15)
    assert r.status_code == 200
    events = r.json()
    titles = [e.get("title") for e in events]
    assert "ISANS Career Fairs (recurring)" in titles
    assert "BBI Pitch Nights & Showcases" in titles
    assert "MetroWorks Essential-Skills Workshops" in titles
    assert "LEAD — Leadership Cohort Intake" not in titles


def test_events_no_rsvp_in_data(s):
    """events should not have duration_minutes; starts_at is free text."""
    r = s.get(f"{BASE_URL}/api/events", timeout=15)
    assert r.status_code == 200
    for e in r.json():
        assert "duration_minutes" not in e
