# Implementation Plan: Hardcoded 2-Step Shortener Pipeline (ShortXLinks -> SoftURL -> Direct Final Target)

Hardcode the non-faucet shortener pipeline logic in `/p/:code` and `/api/links/click` so that Step 2 is **unconditionally hardcoded** to SoftURL (`softurl.in`), and Step 3 is **unconditionally hardcoded** to redirect HTTP 302 directly to the final target URL (`link.originalUrl` / `https://google.com`).

## User Review & Critical Decisions

> [!IMPORTANT]
> **Hardcoded Non-Faucet Execution Rules**:
> 1. **Step 1 (`/api/links/click`)**: Generates ShortXLinks QuickLink API URL targeting `/p/:code?vtok=TOKEN&step=2`:
>    `https://shortxlinks.com/st?api=b6ac095e9373906c9e461860400e64a7de4536f1&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=2`
> 2. **Step 2 (`/p/:code?step=2`)**: Unconditionally hardcoded to generate SoftURL QuickLink API URL targeting `/p/:code?vtok=TOKEN&step=3`:
>    `https://softurl.in/st?api=609c875b96d61f0592bfe5ae036b2db1df673680&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=3`
> 3. **Step 3 / Completion (`/p/:code?step=3`)**: Unconditionally hardcoded to return `HTTP 302 Location: link.originalUrl` (`https://google.com`) directly with `Cache-Control: no-store` headers.

## 1. Hardcoded Flow Diagram

```
[ Visitor Clicks Link ]
          │
          ▼
 [ Step 1: ShortXLinks ]
 https://shortxlinks.com/st?api=b6ac...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=2
          │
          ▼ (Visitor completes ShortXLinks -> Arrives on /p/6k2UTA?step=2)
 [ Step 2: SoftURL (Hardcoded) ]
 https://softurl.in/st?api=609c...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=3
          │
          ▼ (Visitor completes SoftURL -> Arrives on /p/6k2UTA?step=3)
 [ Step 3: Completion (Hardcoded) ]
 HTTP 302 directly to https://google.com (or user's originalUrl)
```

## 2. Technical Modifications

1. **Explicit Step Interceptor in `/p/:code` (`server.ts`)**:
   - `if (req.query.step === "2" || stepNum === 2)`:
     - Generate SoftURL QuickLink API URL directly:
       `https://softurl.in/st?api=609c875b96d61f0592bfe5ae036b2db1df673680&url=${platformBase}/p/${code}?vtok=${encodeURIComponent(vtok)}&step=3`
     - Set `Cache-Control: no-store` headers and return `res.redirect(302, softUrlQuickLink)`.
   - `if (req.query.step >= "3" || stepNum >= 3)`:
     - Extract `link.originalUrl` (e.g. `https://google.com`).
     - Set `Cache-Control: no-store` headers and return `res.redirect(302, targetUrl)`.

2. **First Step Generator in `/api/links/click` (`server.ts`)**:
   - For non-faucet links, generate ShortXLinks QuickLink API URL targeting `${platformBase}/p/${code}?vtok=${vtok}&step=2`.

## 3. Verification Plan

1. **Node Test Execution**:
   - `GET /p/6k2UTA?vtok=tg_token_demo&step=2` -> Verify returns `302` to `https://softurl.in/st?api=609c...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`.
   - `GET /p/6k2UTA?vtok=tg_token_demo&step=3` -> Verify returns `302` to `https://google.com`.
2. **Build Verification**:
   - Rebuild `dist/server.cjs` via `npm run build`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.
