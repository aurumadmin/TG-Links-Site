# Implementation Plan: 3-Step Shortener Pipeline (ShortXLinks -> SoftURL -> AdsLab -> Destination)

Fix and configure the multi-step shortener pipeline so non-faucet plans execute the exact 3-step sequence requested by the user: **ShortXLinks (Step 1) -> SoftURL (Step 2) -> AdsLab (Step 3) -> Final Target Destination**.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices from Phase 1**:
> - **Pipeline Sequence**: 3-Step Shortener Pipeline (**ShortXLinks -> SoftURL -> AdsLab -> Final Destination**).
> - **SoftURL API Handling**: Do not failover or truncate timeout early. Ensure SoftURL API is invoked cleanly with generous 15s timeout and proper URL encoding so its API request succeeds every time.

## 1. Overview & Core Concept

When a visitor clicks a shortener link, TG Links routes them through three distinct monetization shorteners in order:
1. **Step 1 (ShortXLinks)**: ShortXLinks API generates a shortlink targeting TG Links Step 2 (`/p/:code?vtok=...&step=2`).
2. **Step 2 (SoftURL)**: Visitor completes ShortXLinks and lands on TG Links Step 2. TG Links dynamically calls **SoftURL API** targeting TG Links Step 3 (`/p/:code?vtok=...&step=3`). Visitor completes SoftURL (`softurl.in`).
3. **Step 3 (AdsLab)**: Visitor completes SoftURL and lands on TG Links Step 3. TG Links redirects visitor to **AdsLab** safelink blog (`thunder-appz.eu.org/go/:code?vtok=...`).
4. **Final Destination**: Visitor completes AdsLab and clicks "Get Final Destination Link". TG Links validates session token and redirects directly to the original destination URL (e.g. YouTube or destination link).

## 2. User Experience & Visual Design

### Step-by-Step Flow

```
┌─────────────────────────┐
│ Safelink Blog / Button  │
└────────────┬────────────┘
             │ (Click)
             ▼
┌─────────────────────────┐
│ Step 1: ShortXLinks     │
│ (https://shortxlinks.in)│
└────────────┬────────────┘
             │ (Completes Step 1)
             ▼
┌─────────────────────────┐
│ TG Links Step 2 Handler │
│ (/p/:code?step=2)       │
└────────────┬────────────┘
             │ (Calls SoftURL API)
             ▼
┌─────────────────────────┐
│ Step 2: SoftURL         │
│ (https://softurl.in)    │
└────────────┬────────────┘
             │ (Completes Step 2)
             ▼
┌─────────────────────────┐
│ TG Links Step 3 Handler │
│ (/p/:code?step=3)       │
└────────────┬────────────┘
             │ (Routes to AdsLab)
             ▼
┌─────────────────────────┐
│ Step 3: AdsLab          │
│ (thunder-appz.eu.org)   │
└────────────┬────────────┘
             │ (Completes Step 3)
             ▼
┌─────────────────────────┐
│ Final Target            │
│ Destination Link        │
└─────────────────────────┘
```

## 3. Key Technical Decisions & Strategy

1. **Shortener Plan Assignment**:
   - Update `shortenerIds` across all non-faucet plans in `data.json` to:
     `["api-shortxlinks-1", "api-softurl-2", "api-adslab-step3"]`
   - Preserve this exact 3-step order in `getEnabledApisForPlan()`.

2. **SoftURL API Call Optimization**:
   - Increase API request timeout to 15,000ms (15s) in `getSingleExternalShortenedUrl()` so Cloud Run network latencies do not prematurely abort valid SoftURL API responses.
   - Cleanly encode `targetUrl` parameter containing `vtok` and `step=3` parameters.
   - Add detailed server logs for SoftURL API response parsing.

3. **AdsLab Step 3 Route Target**:
   - When `currentApi` is AdsLab (`api-adslab-step3`), `getSingleExternalShortenedUrl()` returns the registered safelink blog domain (`https://thunder-appz.eu.org/go/:code?vtok=...`).
   - Visitor completes AdsLab on `thunder-appz.eu.org` and is forwarded to `/go-final/:code?vtok=...`.
   - `/go-final/:code` validates `vtok` and redirects directly to `link.originalUrl`.

## 4. Proposed Changes

### Configuration (`data.json`)
- Set non-faucet plan `shortenerIds` to `["api-shortxlinks-1", "api-softurl-2", "api-adslab-step3"]`.
- Ensure `api-shortxlinks-1`, `api-softurl-2`, and `api-adslab-step3` are present in `db.adFlyShorteners`.

### Server Backend (`server.ts`)
- Update `getEnabledApisForPlan()` to match and return the 3 shorteners in exact order `[ShortXLinks, SoftURL, AdsLab]`.
- Update `getSingleExternalShortenedUrl()`:
  - Increase timeout to 15s.
  - Handle AdsLab Step 3 redirect generation.
- Rebuild production server bundle (`npm run build` -> `dist/server.cjs`).

## 5. Verification Plan

1. **Step-by-Step API & Route Testing**:
   - Call `/api/links/click` -> Verify Step 1 returns ShortXLinks link with `requiredSteps: 3`.
   - Fetch `/p/6k2UTA?vtok=...&step=2` -> Verify returns HTTP 302 to SoftURL link (`softurl.in/...`).
   - Fetch `/p/6k2UTA?vtok=...&step=3` -> Verify returns HTTP 302 to AdsLab blog (`thunder-appz.eu.org/go/6k2UTA?vtok=...`).
   - Fetch `/go-final/6k2UTA?vtok=...` -> Verify returns HTTP 302 to final destination URL.
2. **Compilation & Build**:
   - Execute `npm run build` to output fresh `dist/server.cjs`.
   - Run `lint_applet` and `compile_applet` to verify 0 build or syntax errors.
