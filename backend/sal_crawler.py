"""
sal_crawler.py — Site crawler for Sal, the SDPS AI Assistant.
 
Crawls sdpublic.org (and the Vercel preview) at startup and every 6 hours,
extracting clean text from each page. The result is stored in SAL_SITE_CACHE
and injected into Gemini's system prompt so Sal can answer questions using
real, up-to-date content from the school website.
"""
import asyncio
import logging
import re
import httpx
from html.parser import HTMLParser
from typing import Dict, List
 
logger = logging.getLogger("sdps.crawler")
 
# ── Pages to crawl ────────────────────────────────────────────────────────────
# Format: (label, url)  — label is used as a heading in the cache dump
CRAWL_TARGETS: List[tuple] = [
    ("Home",                    "https://sdpublic.org/"),
    ("About Us",                "https://sdpublic.org/about"),
    ("Academics",               "https://sdpublic.org/academics"),
    ("Admissions",              "https://sdpublic.org/admissions"),
    ("Admission Eligibility",   "https://sdpublic.org/admission-eligibility"),
    ("Fee Structure",           "https://sdpublic.org/fee-structure"),
    ("Hostel",                  "https://sdpublic.org/hostel"),
    ("Pre-School",              "https://sdpublic.org/preschool"),
    ("House System",            "https://sdpublic.org/house-system"),
    ("Student Council",         "https://sdpublic.org/student-council"),
    ("Administration Message",  "https://sdpublic.org/administration-message"),
    ("News",                    "https://sdpublic.org/news"),
    ("Notices",                 "https://sdpublic.org/notices"),
    ("Calendar",                "https://sdpublic.org/calendar"),
    ("Gallery",                 "https://sdpublic.org/gallery"),
    ("Videos",                  "https://sdpublic.org/videos"),
    ("Careers",                 "https://sdpublic.org/careers"),
    ("Alumni",                  "https://sdpublic.org/alumni"),
    ("Transfer Certificate",    "https://sdpublic.org/tc-download"),
    ("Contact Us",              "https://sdpublic.org/contact"),
    ("Pay Fees",                "https://sdpublic.org/fee-payment"),
]
 
CRAWL_INTERVAL_SECONDS = 6 * 60 * 60  # refresh every 6 hours
 
 
# ── Simple HTML → plain text extractor ───────────────────────────────────────
 
class _TextExtractor(HTMLParser):
    SKIP_TAGS = {"script", "style", "noscript", "head", "meta", "link",
                 "svg", "path", "img", "button", "nav", "footer"}
 
    def __init__(self):
        super().__init__()
        self._skip = 0
        self.parts: List[str] = []
 
    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP_TAGS:
            self._skip += 1
 
    def handle_endtag(self, tag):
        if tag in self.SKIP_TAGS and self._skip > 0:
            self._skip -= 1
        # Add line break after block elements
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "h5", "tr", "br"}:
            self.parts.append("\n")
 
    def handle_data(self, data):
        if self._skip:
            return
        text = data.strip()
        if text:
            self.parts.append(text + " ")
 
 
def _html_to_text(html: str, max_chars: int = 3000) -> str:
    """Extract readable text from HTML, capped at max_chars."""
    parser = _TextExtractor()
    parser.feed(html)
    raw = "".join(parser.parts)
    # Collapse excessive whitespace / blank lines
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    raw = re.sub(r" {2,}", " ", raw)
    return raw.strip()[:max_chars]
 
 
# ── Cache ─────────────────────────────────────────────────────────────────────
 
# Global dict: label → extracted text
SAL_SITE_CACHE: Dict[str, str] = {}
_crawl_lock = asyncio.Lock()
 
 
async def _fetch_page(client: httpx.AsyncClient, label: str, url: str) -> None:
    try:
        r = await client.get(url, timeout=15.0, follow_redirects=True)
        if r.status_code == 200:
            text = _html_to_text(r.text)
            if text:
                SAL_SITE_CACHE[label] = text
                logger.debug(f"[crawler] {label}: {len(text)} chars")
        else:
            logger.warning(f"[crawler] {label} returned {r.status_code}")
    except Exception as e:
        logger.warning(f"[crawler] Failed to fetch {label} ({url}): {e}")
 
 
async def crawl_once() -> None:
    """Fetch all target pages concurrently and populate SAL_SITE_CACHE."""
    async with _crawl_lock:
        logger.info("[crawler] Starting site crawl…")
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; SDPSBot/1.0; +https://sdpublic.org)"
            )
        }
        async with httpx.AsyncClient(headers=headers) as client:
            tasks = [
                _fetch_page(client, label, url)
                for label, url in CRAWL_TARGETS
            ]
            await asyncio.gather(*tasks)
        logger.info(
            f"[crawler] Done — {len(SAL_SITE_CACHE)}/{len(CRAWL_TARGETS)} pages cached."
        )
 
 
async def crawl_loop() -> None:
    """Background task: crawl once at startup, then every CRAWL_INTERVAL_SECONDS."""
    await crawl_once()
    while True:
        await asyncio.sleep(CRAWL_INTERVAL_SECONDS)
        await crawl_once()
 
 
def get_site_context(max_total_chars: int = 18000) -> str:
    """
    Return a single string with all cached page content, formatted as:
 
        ## Page Name
        <extracted text>
 
    Trimmed to max_total_chars so it fits comfortably in a Gemini prompt.
    """
    if not SAL_SITE_CACHE:
        return "(Site content not yet loaded — answering from general knowledge.)"
 
    sections = []
    for label, text in SAL_SITE_CACHE.items():
        sections.append(f"## {label}\n{text}")
 
    combined = "\n\n".join(sections)
    return combined[:max_total_chars]
 
