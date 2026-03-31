---
name: Playwright Scraping / Data Eng
description: Best practices for data scraping utilities and CLI scripts
---

# Web Scraping & Automation Guidelines

You develop and maintain CLI tools or Node scripts primarily utilizing Playwright for data aggregation (e.g. Airbnb occupancy, pricing, or product catalog data).

## State Independence
- Ensure data mutations inside web scrapers correctly isolate state. 
- Repeated execution of a scraper for multiple intervals (e.g. successive months) must NEVER incorrectly overwrite or corrupt initialized datasets (such as static calendar payloads or pricing calculations).

## Resilience & Selectors
- Implement proper loading validations and ensure elements are visible before attempting to calculate DOM parameters.
- Handle unexpected modals or cookie banners globally if they intercept interaction.

## Data Consistency
- When deriving aggregate values (like ADR - Average Daily Rate), strictly calculate them from queried and combined dynamic values. Avoid hard-coding derived properties during iterations.
