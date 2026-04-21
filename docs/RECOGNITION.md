# Card Recognition from Photo

Automatic extraction of card metadata (cert, grade, name, number, language, treatment) from a user-uploaded slab/card photo, followed by matching to the `RefPriceChartingProduct` catalog for pricing enrichment.

Separate from the PSA/BGS cert-lookup flow documented in [grading module README](./GRADING_MODULE.md) — recognition works from pixels, lookup works from a known cert number.

## Contract

### Endpoint

```
POST /v1/grading/recognize
Content-Type: multipart/form-data
Body: file=<image/jpeg|image/png|image/webp>
```

Optional `mediaId` field for previously uploaded media (not fully implemented — see `grading.controller.ts`).

### Response shape

```ts
{
  success: boolean,
  data?: {
    // Extracted by Gemini (first pass)
    grader: "PSA" | "BGS" | "OTHER" | string,
    certNumber: string,
    gradeLabel: string,         // e.g. "GEM MT 10"
    gradeValue: string | number,// e.g. "10", 9.5
    subgrades?: { centering?, corners?, edges?, surface? },
    cardName: string,
    setName: string,
    rawCardNumber?: string,     // e.g. "OP05-119"
    language?: string,          // "English" | "Japanese"
    year?: string,
    rarity?: string,            // C/UC/R/SR/SEC/L/P/SP/M
    treatment?: string,         // Normal | Alt Art | Manga Rare | Parallel | Foil | Promo Stamp | Pre-release Stamp

    // Filled when we matched a catalog product
    refPriceChartingProductId?: string,
    productName?: string,
    productSet?: string,
    productNumber?: string,
    productImageUrl?: string,
    marketPrice?: number,
    grade7Price?, grade8Price?, grade9Price?, grade95Price?, grade10Price?, sealedPrice?,

    // Filled when disambiguation was inconclusive — frontend should let the user pick
    ambiguous?: boolean,
    candidates?: Array<{
      id, title, set, cardNumber, imageUrl, productType,
      rawPrice, grade7Price, grade8Price, grade9Price, grade95Price, grade10Price, sealedPrice
    }>
  },
  durationMs?: number,
  error?: string
}
```

**Telemetry is not in the response.** It's persisted server-side — see [Persistence](#persistence) below.

## Pipeline

`GradingRecognitionService.recognizeFromImage(buffer, mimeType, { userId })` runs these stages in order. Each stage is recorded as a telemetry step (name + input + output + durationMs) and written to the DB at the end.

```
┌──────────────┐
│  preprocess  │  Sharp: read metadata, resize >1280px → JPEG q85
└──────┬───────┘
       ▼
┌────────────────┐
│ gemini-extract │  gemini-2.5-flash-lite: structured JSON extraction
└──────┬─────────┘     (grader, certNumber, cardName, rawCardNumber,
       │                language, rarity, treatment, ...)
       ▼
┌──────────────────────┐
│ normalize-card-number │ "OP09118" or "#OP05-119" → canonical candidate set
└──────┬────────────────┘
       ▼
┌──────────────┐
│  db-lookup   │  RefPriceChartingProduct WHERE cardNumber IN (candidates)
└──────┬───────┘                            (case-insensitive, exact — not contains)
       ▼
┌──────────────────┐
│ treatment-filter │  Keep titles matching extracted treatment
└──────┬───────────┘  (alt/manga/parallel/promo/pre-release; or exclude those for "Normal")
       ▼
┌──────────────────┐
│ set-name-filter  │  Keep candidates whose set/title contains setName tokens
└──────┬───────────┘  (stop words like "one", "piece", "japanese" filtered out)
       │
       ├─── 0 matches ──▶ decision(no-catalog-match)
       │
       ├─── 1 match ────▶ decision(single-candidate-after-filters) ── applyMatch
       │
       └─── >1 matches ─▶
                         ┌──────────────────┐
                         │ disambiguation   │ gemini-2.5-flash-lite with target photo
                         └──────┬───────────┘ + up to 8 candidate images (fileData by URL)
                                │
                 ┌──────────────┼──────────────────┐
                 │              │                  │
                 ▼              ▼                  ▼
          selectedId=<id>  selectedId=""     selectedId=<unknown>
                 │              │                  │
                 ▼              └──┬───────────────┘
      decision(disambiguation-pick)│
                                   ▼
                         ┌───────────────────┐
                         │ language-tiebreak │ filter by "japan" in/out of title
                         └───────┬───────────┘
                                 │
                       ┌─────────┼──────────┐
                       │         │          │
                       ▼         ▼          ▼
                    1 left     0 left    >1 left
                       │         │          │
                       ▼         ▼          ▼
            decision(language-tiebreak-single)  decision(ambiguous)
            → applyMatch                         → applyAmbiguous + candidates[]
```

### Stage details

**preprocess** — `recognizeFromImage` body. Uses `sharp` to read width/height; if either dimension >1280px, resizes to fit inside 1280 and re-encodes as JPEG quality 85 (smaller payload for Gemini). Records `{bytes, mimeType, width, height}` in/out and whether resize happened.

**gemini-extract** — `gemini-2.5-flash-lite` with a structured `responseSchema` (JSON). The prompt is defined inline in [grading-recognition.service.ts](../apps/api/src/modules/grading/grading-recognition.service.ts). Key prompt notes:

- `rawCardNumber` must preserve the exact printed form (including set prefix like `OP05`).
- `language` requires **specific evidence** (Japanese copyright `©尾田栄一郎/集英社`, hiragana/katakana in card text) — explicitly told not to guess from monochrome art alone. Default is "English" when unsure.
- `treatment` picks one of `Normal | Alt Art | Manga Rare | Parallel | Promo Stamp | Pre-release Stamp | Foil`, defaulting to `Normal`.
- `certNumber` must come from the slab label only, not confused with `cardNumber`.

**normalize-card-number** — `generateCardNumberCandidates(raw)` in [grading-recognition.service.ts](../apps/api/src/modules/grading/grading-recognition.service.ts). Produces canonical variants to cover all formats PriceCharting actually stores:

- Strips leading `#` from input (some sources send `"#OP05-119"`).
- Uppercases and removes whitespace.
- Parses `([A-Z]+\d{0,2})-?(\d+)` → prefix + digits.
- Emits every combination of `{dash, no-dash} × {with-#, without-#} × {stripped, 3-digit padded, 4-digit padded}`.

So `"OP09118"` produces `OP09-118, OP09118, #OP09-118, #OP09118, OP09-0118, OP090118, #OP09-0118, #OP090118`. This is critical because PriceCharting stores the value as `#OP09-118`; substring matching used to mask this by accident but was fragile (e.g. `OP01-001 IN OP01-0018` false-positive).

**db-lookup** — `prisma.refPriceChartingProduct.findMany({ where: { OR: candidates.map(equals + insensitive) }, include: { set: true } })`. Exact match, not `contains`.

**treatment-filter** — `applyTreatmentFilter` matches extracted `treatment` against product title keywords. Applied **before** disambiguation because it's a reliable signal and usually keeps multiple candidates. Soft: if the filter empties the pool, the pool is left intact.

**set-name-filter** — `applySetNameFilter` narrows by Gemini's extracted `setName`. Tokenizes the name (stop words like `one`, `piece`, `the`, `japanese`, `english` removed via `extractSetNameTokens`), then keeps products whose `set.name + title` contains all tokens (strict pass) or any token (loose fallback). Soft: returns original pool if everything is filtered out. Critical for cards where the same `cardNumber` appears across multiple set re-prints — e.g. OP05-119 has 22 catalog entries spread over "Awakening of the New Era", "Fist of Divine Speed", and PRB01 promo printings. The first-pass prompt explicitly instructs Gemini to return the specific set subtitle (not just "One Piece") so this filter has tokens to work with.

**disambiguation** — `disambiguateWithImages`. Runs only when >1 candidate remains. Sends the target photo as `inlineData` (base64) and up to 8 candidate images as `fileData` parts referencing their public `imageUrl` directly — Gemini fetches them server-side, so we save the round-trip from API → R2 → API. Model: `gemini-2.5-flash-lite`. Prompt includes the originally extracted `cardName`, `rawCardNumber`, `language`, `rarity`, `treatment` as context, and asks for `selectedId` or empty string when uncertain.

A nested `disambiguation.llm` step is recorded for the Gemini call alone (input: `model`, `partsCount`, `imageParts`; output: `selectedId`). Comparing the outer `disambiguation` duration vs `disambiguation.llm` duration shows how much time goes to payload building vs the model itself — currently they're equal (payload assembly is ~0ms), but the split helps catch future regressions.

**language-tiebreak** — `applyLanguageFilter` runs only when disambiguation returned empty or an unknown id. Filters product titles by `japan` keyword based on extracted `language`. Soft: if result is 0, falls back to the original pool before the tie-break. Deliberately placed **after** disambiguation because the first-pass `language` flag can be wrong (especially on Manga Rare cards).

**decision** — terminal step recording the outcome reason:
- `single-candidate-after-filters` — matched exactly one candidate, auto-selected.
- `disambiguation-pick` — LLM picked a specific id.
- `language-tiebreak-single` — tie-break collapsed pool to one.
- `ambiguous` — multiple survivors; user must choose on the frontend.
- `no-catalog-match` — zero matches in DB.
- `no-card-number-extracted` — Gemini couldn't read the printed number.
- `lookup-error` — DB call threw.

## Persistence

Every call writes one row to `GradingRecognitionTrace` (see [schema.prisma](../prisma/schema.prisma)):

| Column | Purpose |
|---|---|
| `id`, `createdAt` | — |
| `userId?` | From `@CurrentUserId()`, null for unauthenticated requests |
| `durationMs`, `success`, `error` | — |
| `rawCardNumber`, `language`, `treatment`, `grader` | Denormalized from extract step for filtering |
| `decisionReason` | See [decision step](#stage-details) |
| `matchedProductId?` | Foreign-key-ish to `RefPriceChartingProduct.id` when selected |
| `ambiguous`, `candidateCount?` | When user must pick |
| `steps` (JSONB) | Full pipeline trace (input/output/durationMs per stage) |

Indexes: `createdAt`, `(userId, createdAt)`, `matchedProductId`, `decisionReason`.

Write is **best-effort** — a DB failure is logged (`Failed to persist recognition trace: ...`) but does not break the response.

A compact one-line summary is also printed to the server log as `[telemetry] {json}` for greppable ops diagnostics without touching the DB.

### Diagnostic queries

```sql
-- Last 20 ambiguous results (user had to pick)
SELECT id, "createdAt", "rawCardNumber", "candidateCount"
FROM "GradingRecognitionTrace"
WHERE ambiguous = true
ORDER BY "createdAt" DESC
LIMIT 20;

-- Decision outcome distribution + latency, last 24h
SELECT "decisionReason",
       COUNT(*) AS n,
       AVG("durationMs")::int AS avg_ms,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs")::int AS p95_ms
FROM "GradingRecognitionTrace"
WHERE "createdAt" > now() - interval '1 day'
GROUP BY 1
ORDER BY n DESC;

-- Full pipeline trace for a single request
SELECT jsonb_pretty(steps)
FROM "GradingRecognitionTrace"
WHERE id = '...';

-- Which cards most often go ambiguous?
SELECT "rawCardNumber", COUNT(*) AS n
FROM "GradingRecognitionTrace"
WHERE ambiguous = true AND "createdAt" > now() - interval '7 days'
GROUP BY 1
ORDER BY n DESC
LIMIT 30;
```

## Testing

Tests live in [test/unit/grading.recognition.spec.ts](../apps/api/test/unit/grading.recognition.spec.ts).

### Unit tests (Gemini mocked)

Cover every branch of the pipeline:

- `generateCardNumberCandidates` — canonical forms, leading zeros, compact (no-dash) form, `#`-prefixed variants, rejection of `OP01-0018` when searching `OP01-001`.
- Service:
  - Single-candidate auto-select.
  - Exact-match rejecting `OP05-1190` when searching `OP05-119`.
  - Zero-padding variants (`OP09-0118` in DB vs `OP09-118` extracted).
  - Language as tie-break (not pre-filter) when disambiguation is uncertain.
  - Both EN and JP variants forwarded to disambiguation (not pre-filtered).
  - Ambiguous + candidates when disambiguation LLM gives empty `selectedId`.
  - Disambiguation pick when LLM returns a valid id.
  - Fallback to ambiguous when LLM returns an unknown id.
  - Persisted trace has denormalized fields + full steps JSON.
  - DB write failure does not break the response.
  - Response body does not expose `telemetry`.

### E2E tests (real Gemini, guarded)

Run only when `GEMINI_E2E=1` and `GEMINI_API_KEY` is set. Images come from [tests/](../tests/) at repo root.

```bash
GEMINI_E2E=1 GEMINI_API_KEY=... pnpm --filter @slabhub/api test -- \
  --selectProjects unit --testPathPattern=grading.recognition
```

- `extracts rawCardNumber matching filename` — runs once per image in `tests/`, asserts the extracted number matches the filename (normalized).
- `picks the English Manga variant for OP09-118.jpg despite language ambiguity` — regression test for a real observed bug where `gemini-2.5-flash-lite` classified an English Manga Rare card as Japanese; verifies the disambiguation + tie-break flow still selects the EN variant when given the full candidate list from a real DB snapshot.

### CLI runner

For ad-hoc manual testing against the real DB:

```bash
pnpm --filter @slabhub/api grading:test-recognition --file=tests/OP09-118.jpg
```

This exercises the full pipeline including trace persistence.

## Known failure modes & tuning notes

### Gemini misclassifies language

First-pass `gemini-2.5-flash-lite` sometimes returns `"Japanese"` for English cards (particularly Manga Rare, where art is monochrome and language cues are subtle). Mitigation: language filter moved from pre-disambiguation to post-disambiguation tie-break, and prompt requires specific evidence ("©尾田栄一郎/集英社" etc.) rather than inference from art. See the OP09-118 regression test.

### Gemini drops the dash from card number

Extracted `"OP09118"` instead of `"OP09-118"`. Handled by `generateCardNumberCandidates` emitting both forms. No action needed; tests cover this.

### PriceCharting `cardNumber` stored with `#` prefix

All values in `RefPriceChartingProduct.cardNumber` are like `#OP05-119`. Candidate generator always emits both with and without `#`.

### Too many candidates pre-disambiguation

Capped at `DISAMBIGUATION_IMAGE_LIMIT = 8`. If there are more, only the first 8 go into the image-based disambiguation call — the long tail is truncated. The treatment-filter and set-name-filter reduce this in most cases (e.g. OP05-119 goes 22 → 4). If a card still arrives at disambiguation with >8 survivors, widen the pre-filters (e.g. parse rarity from title brackets like `[SP Gold]`) or add a year filter.

### Candidate images via `fileData`

Candidate images are sent as `fileData: { fileUri: imageUrl }` — Gemini fetches them server-side. Means we don't pay the API → R2 → API round-trip, and there's no client-side timeout to worry about. If `imageUrl` is missing on a product, only the text part for that candidate is sent (text-only fallback).

### DB write latency

`persistTrace` is awaited — adds one `INSERT` to each request's latency. If this becomes material, move to `setImmediate(() => this.persistTrace(...))` for fire-and-forget.

## Future work

In priority order (see also the /tmp discussion thread context):

1. **PSA/BGS cert API cross-check** for graded slabs. We already extract `certNumber`; hitting the grader's public API returns authoritative `Subject`, `CardNumber`, `Variety`, `Year`. Use as a filter or tie-break — near-100% accuracy signal currently discarded.
2. **CLIP/SigLIP embeddings** for every `RefPriceChartingProduct.imageUrl` (pgvector). At recognition, embed the uploaded photo, cosine-match against candidates. Replaces or augments LLM disambiguation with a deterministic, fast, measurable signal.
3. **Migrate matching from `RefPriceChartingProduct` to `CardVariant`/`CardProfile`** (JustTCG). JustTCG has structured `rarity`, `printing`, `setCode` — no need to parse PriceCharting titles. PriceCharting becomes just a price source via FK.
4. **Active-learning loop**: when the user overrides an ambiguous-case selection on the frontend, write the override back to `GradingRecognitionTrace` (new `finalPickProductId` column) and periodically eval prompt/model changes against the accumulated ground truth.

## Files

- [grading-recognition.service.ts](../apps/api/src/modules/grading/grading-recognition.service.ts) — pipeline, `TelemetryRecorder`, `generateCardNumberCandidates`, `persistTrace`.
- [grading.controller.ts](../apps/api/src/modules/grading/grading.controller.ts) — `POST /recognize` endpoint; pulls `userId` via `@CurrentUserId()`.
- [types/grading.types.ts](../apps/api/src/modules/grading/types/grading.types.ts) — `GradingRecognitionResult`, `GradingRecognitionCandidate`, internal `GradingRecognitionStep`, `GradingRecognitionTelemetry`.
- [cli/grading-test.command.ts](../apps/api/src/modules/grading/cli/grading-test.command.ts) — CLI for local testing.
- [prisma/schema.prisma](../prisma/schema.prisma) — `GradingRecognitionTrace` model.
- [test/unit/grading.recognition.spec.ts](../apps/api/test/unit/grading.recognition.spec.ts) — all tests.
- [tests/](../tests/) — test images (card filename = expected `rawCardNumber`).
