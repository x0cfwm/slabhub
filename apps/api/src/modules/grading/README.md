# Grading Lookup Module

This module provides automatic fetching and parsing of graded slab certificates for PSA and BGS.

## How it works
1. **Frontend**: User enters Grader and Cert #.
2. **Backend**: `GradingController` receives the request and calls `GradingService`.
3. **HTTP Client**: `GradingHttpClient` fetches the HTML from the grader's public website with realistic headers and retries.
4. **Parser**: `PsaParser` or `BgsParser` uses `cheerio` to extract metadata (grade, card name, set, etc.).
5. **Caching**: Results are cached in-memory for 24 hours to reduce upstream hits.
6. **Rate Limiting**: Throttling is applied (10 requests per minute) to prevent abuse.

## How to add BGS URL/Selectors
Currently, BGS is implemented as a stub. To enable it:
1. Update `GradingHttpClient.fetchBgsPage` with the correct URL pattern.
2. Implement parsing logic in `BgsParser.parse` using `cheerio` selectors found on a sample BGS cert page.

## Known Limitations
- **Upstream Changes**: If PSA changes their website structure, selectors in `PsaParser` may need updates.
- **Bot Detection**: High-volume parsing may trigger captchas or blocks. Cloudflare/WAF on grader sites might require more advanced fetching (e.g. ScraperAPI or similar) if MVP fails.
- **Images**: Images are fetched if URL is found; if the grader blocks external hotlinking, they might not display on the frontend without a proxy.
