"""Job Bank Canada scraper for Halifax / Nova Scotia jobs.

Public scrape with caching. No API key required.
Cache TTL is 30 minutes per audience filter.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

JOBBANK_BASE = "https://www.jobbank.gc.ca"
SEARCH_PATH = "/jobsearch/jobsearch"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Halifax Youth Hub; +https://youth-worx-connect.preview.emergentagent.com)"
)
CACHE_TTL = timedelta(minutes=30)
REQUEST_TIMEOUT = 20.0
RESULTS_PER_PAGE = 25

_cache: dict[str, dict] = {}
_cache_lock = asyncio.Lock()


# ---------- Audience classifier ----------
# Youth-friendly entry-level roles. Match against the job TITLE only.
YOUTH_REGEX = re.compile(
    r"\b("
    r"student|summer|junior|intern(ship)?|trainee|"
    r"camp|lifeguard|cashier|barista|server|host|hostess|crew member|"
    r"attendant|dishwasher|busser|line cook|kitchen helper|food counter|"
    r"sales associate|retail associate|stocker|stock clerk|grocery clerk|"
    r"courier|delivery driver|paper route|"
    r"landscap(er|ing)|groomer|cleaner|janitor|"
    r"child care|childcare|babysitter|tutor|"
    r"recreation|playground|usher|cinema|theatre|"
    r"laundry|carwash|carry-out|bagger"
    r")\b",
    re.I,
)


def classify_for_youth(job: dict) -> bool:
    return bool(YOUTH_REGEX.search(job.get("title", "")))


# ---------- URL builder ----------
def _build_url(audience: str = "all") -> str:
    params: dict[str, str] = {
        "searchstring": "",
        "locationstring": "Halifax, NS",
        "fprov": "NS",
        "sort": "M",
    }
    if audience == "youth":
        params["fyt"] = "1"
    return f"{JOBBANK_BASE}{SEARCH_PATH}?{urlencode(params)}"


def _parse_one(article) -> dict | None:
    link = article.select_one("a.resultJobItem")
    title_el = article.select_one(".noctitle")
    if not link or not title_el:
        return None

    href = link.get("href", "")
    # strip jsessionid; resolve relative URL
    if ";jsessionid=" in href:
        href = href.split(";jsessionid=")[0] + (
            "?" + href.split("?", 1)[1] if "?" in href else ""
        )
    if href.startswith("/"):
        href = JOBBANK_BASE + href

    employer_el = article.select_one(".business")
    location_el = article.select_one(".location")
    date_el = article.select_one(".date")
    salary_el = article.select_one(".salary")

    title = " ".join(title_el.get_text(" ", strip=True).split())
    employer = " ".join(employer_el.get_text(" ", strip=True).split()) if employer_el else ""
    # location text contains accessibility label "Location" — strip
    raw_loc = location_el.get_text(" ", strip=True) if location_el else "Halifax, NS"
    location = " ".join(raw_loc.replace("Location", "").split())
    posted_at = " ".join(date_el.get_text(" ", strip=True).split()) if date_el else ""
    raw_sal = salary_el.get_text(" ", strip=True) if salary_el else ""
    wage = " ".join(raw_sal.replace("Salary", "").split())

    return {
        "id": article.get("id", "").replace("article-", "") or href,
        "title": title,
        "employer": employer,
        "location": location,
        "posted_at": posted_at,
        "wage": wage,
        "apply_url": href,
        "source": "Job Bank Canada",
    }


HRM_COMMUNITIES = {
    "halifax", "dartmouth", "bedford", "sackville", "cole harbour",
    "eastern passage", "hammonds plains", "tantallon", "spryfield",
    "fall river", "beaver bank", "waverley", "lower sackville",
    "middle sackville", "upper tantallon", "lawrencetown", "porters lake",
    "musquodoboit", "head of st. margarets bay", "timberlea", "lakeside",
    "clayton park", "fairview", "rockingham", "armdale", "burnside",
    "north preston", "east preston", "cherry brook", "windsor junction",
    "hubbards", "mount uniacke", "elmsdale", "enfield", "goffs",
}


def _is_hrm(job: dict) -> bool:
    loc = (job.get("location") or "").lower()
    if "(ns)" not in loc and "nova scotia" not in loc:
        return False
    return any(c in loc for c in HRM_COMMUNITIES)


async def _fetch_html(url: str) -> str:
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-CA,en;q=0.9",
    }
    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT, follow_redirects=True, headers=headers
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.text


async def fetch_live_jobs(audience: str = "all", limit: int = 24) -> dict:
    """Returns {jobs: [...], fetched_at, source_url, cached}.
    Falls back to last good cache on error.
    """
    key = audience or "all"
    now = datetime.now(timezone.utc)

    async with _cache_lock:
        cached = _cache.get(key)
        if cached and now - cached["ts"] < CACHE_TTL:
            return {
                "jobs": cached["jobs"][:limit],
                "fetched_at": cached["ts"].isoformat(),
                "source_url": cached["source_url"],
                "cached": True,
            }

    url = _build_url(audience)
    try:
        html = await _fetch_html(url)
        soup = BeautifulSoup(html, "lxml")
        articles = soup.select("article.resultJobItem, article[id^=article-]")
        parsed: list[dict] = []
        for art in articles:
            try:
                job = _parse_one(art)
                if job and _is_hrm(job):
                    parsed.append(job)
            except Exception as e:
                logger.warning("parse error: %s", e)
        if not parsed:
            raise RuntimeError("Job Bank returned 0 HRM jobs (possible HTML change)")
        if audience == "youth":
            youth_jobs = [j for j in parsed if classify_for_youth(j)]
            if len(youth_jobs) >= 6:
                parsed = youth_jobs

        async with _cache_lock:
            _cache[key] = {"jobs": parsed, "ts": now, "source_url": url}

        return {
            "jobs": parsed[:limit],
            "fetched_at": now.isoformat(),
            "source_url": url,
            "cached": False,
        }
    except Exception as e:
        logger.error("Job Bank fetch failed for %s: %s", audience, e)
        # serve stale cache if available
        async with _cache_lock:
            stale = _cache.get(key)
        if stale:
            return {
                "jobs": stale["jobs"][:limit],
                "fetched_at": stale["ts"].isoformat(),
                "source_url": stale["source_url"],
                "cached": True,
                "stale": True,
                "error": "Job Bank is temporarily unavailable — showing what we have.",
            }
        return {
            "jobs": [],
            "fetched_at": now.isoformat(),
            "source_url": url,
            "cached": False,
            "error": "Job Bank is temporarily unavailable — showing what we have.",
        }
