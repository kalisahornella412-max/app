# Iteration 8: resume AI summary/assist + auth gating + rename regression
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    email = f"test_it8_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Test1234!", "name": "TEST_It8"})
    assert r.status_code in (200, 201), r.text
    return s


# Rename
def test_root_name():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json()["name"] == "Halifax Youth Hub API"


# Auth gating
@pytest.mark.parametrize("path,body", [
    ("/api/resumes/ai-summary", {"summary": "x", "headline": "h", "skills": [], "roles": []}),
    ("/api/resumes/ai-assist", {"role": "Cashier"}),
])
def test_ai_requires_auth(path, body):
    r = requests.post(f"{BASE_URL}{path}", json=body)
    assert r.status_code == 401


def test_resumes_requires_auth():
    assert requests.get(f"{BASE_URL}/api/resumes").status_code == 401


def test_ai_summary_empty_400(user_session):
    r = user_session.post(f"{BASE_URL}/api/resumes/ai-summary", json={"summary": "", "headline": "", "skills": [], "roles": []})
    assert r.status_code == 400


def test_ai_summary_write(user_session):
    r = user_session.post(f"{BASE_URL}/api/resumes/ai-summary", json={
        "summary": "", "headline": "Barista", "skills": ["Customer service", "Teamwork"], "roles": ["Barista"]}, timeout=90)
    assert r.status_code == 200, r.text
    s = r.json()["summary"]
    assert isinstance(s, str) and len(s) > 20
    print("SUMMARY:", s)


def test_ai_summary_polish(user_session):
    r = user_session.post(f"{BASE_URL}/api/resumes/ai-summary", json={
        "summary": "i am good worker who like help people", "headline": "", "skills": [], "roles": []}, timeout=90)
    assert r.status_code == 200, r.text
    assert len(r.json()["summary"]) > 20


def test_ai_assist(user_session):
    r = user_session.post(f"{BASE_URL}/api/resumes/ai-assist", json={"role": "Cashier", "company": "Sobeys", "notes": ""}, timeout=90)
    assert r.status_code == 200, r.text
    b = r.json()["bullets"]
    assert isinstance(b, list) and 1 <= len(b) <= 4
    print("BULLETS:", b)


def test_resume_crud(user_session):
    r = user_session.post(f"{BASE_URL}/api/resumes", json={"title": "TEST_it8", "full_name": "TEST Guest", "summary": "s"})
    assert r.status_code in (200, 201), r.text
    rid = r.json()["id"]
    lst = user_session.get(f"{BASE_URL}/api/resumes").json()
    assert any(x["id"] == rid and x["full_name"] == "TEST Guest" for x in lst)
    assert user_session.delete(f"{BASE_URL}/api/resumes/{rid}").status_code == 200


def test_resume_invalid_id(user_session):
    r = user_session.put(f"{BASE_URL}/api/resumes/not-an-objectid", json={"title": "x"})
    print("invalid id status:", r.status_code)
    assert r.status_code in (400, 404, 422)
