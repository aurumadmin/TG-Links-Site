# Implementation Plan: 3-Step Pipeline with AroLinks (ShortXLinks -> SoftURL -> AroLinks -> Final Link)

Integrate **AroLinks** as Step 3 in the non-faucet shortener pipeline. Ensure visitor flows seamlessly through Step 1 (ShortXLinks) $\rightarrow$ Step 2 (SoftURL) $\rightarrow$ Step 3 (AroLinks) $\rightarrow$ Step 4 (Direct Final Destination Link).

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed 3-Step Sequence**:
> 1. **Step 1 (ShortXLinks)**: `https://shortxlinks.com/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=2`
> 2. **Step 2 (SoftURL)**: `https://softurl.in/st?api=609c...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=3`
> 3. **Step 3 (AroLinks)**: `https://arolinks.com/api?api=d2c8261beff4b98ff674d7f306f2fe205bb5c25d&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=4&format=text` / `arolinks.com/st?api=...`
> 4. **Step 4 (Final Destination)**: AroLinks completion (`step=4`) redirects `HTTP 302` directly to the user's shortened final URL (`link.originalUrl` / `https://google.com`).
> - **Thunder-Appz blog page (`thunder-appz.eu.org`)** is completely bypassed after initial click.

## 1. Sequence Flow Diagram

```
[ Visitor Clicks Link ]
          │
          ▼
 [ Step 1: ShortXLinks ]
 https://shortxlinks.com/st?api=b6ac...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=2
          │
          ▼ (Completes ShortXLinks -> Arrives on /p/6k2UTA?step=2)
 [ Step 2: SoftURL ]
 https://softurl.in/st?api=609c...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=3
          │
          ▼ (Completes SoftURL -> Arrives on /p/6k2UTA?step=3)
 [ Step 3: AroLinks ]
 https://arolinks.com/api?api=d2c8...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=4&format=text
          │
          ▼ (Completes AroLinks -> Arrives on /p/6k2UTA?step=4)
 [ Step 4: Final Target Destination ]
 HTTP 302 directly to https://google.com (or user's originalUrl)
```

## 2. Technical Modifications

1. **Shorteners Database Config (`data.json`)**:
   - Add AroLinks API object to `adFlyShorteners`:
     ```json
     {
       "id": "api-arolinks-3",
       "name": "AroLinks",
       "apiUrl": "https://arolinks.com/api",
       "apiToken": "d2c8261beff4b98ff674d7f306f2fe205bb5c25d",
       "enabled": true,
       "priority": 4,
       "isFaucetApi": false
     }
     ```
   - Update default plan `shortenerIds` to `["api-shortxlinks-1", "api-softurl-2", "api-arolinks-3"]` (3 steps total).

2. **Step Handlers (`server.ts`)**:
   - `step=2`: Hardcoded to redirect to SoftURL targeting `/p/:code?vtok=TOKEN&step=3`.
   - `step=3`: Hardcoded to redirect to AroLinks targeting `/p/:code?vtok=TOKEN&step=4`.
   - `step >= 4`: Hardcoded to return `HTTP 302 Location: link.originalUrl` (`https://google.com`) directly.

## 3. Verification Plan

1. **Trace Verification**:
   - `GET /api/links/click` -> Verify Step 1 returns ShortXLinks QuickLink targeting `/p/6k2UTA?vtok=...&step=2`.
   - `GET /p/6k2UTA?vtok=...&step=2` -> Verify Step 2 returns SoftURL QuickLink targeting `/p/6k2UTA?vtok=...&step=3`.
   - `GET /p/6k2UTA?vtok=...&step=3` -> Verify Step 3 returns AroLinks URL targeting `/p/6k2UTA?vtok=...&step=4`.
   - `GET /p/6k2UTA?vtok=...&step=4` -> Verify returns `HTTP 302 Location: https://google.com` directly.
2. **Build Verification**:
   - Rebuild `dist/server.cjs` via `npm run build`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.
