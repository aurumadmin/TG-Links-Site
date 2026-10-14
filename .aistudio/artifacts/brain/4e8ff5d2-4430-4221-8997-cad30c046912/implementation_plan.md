# Implementation Plan: Initial-Visit Blog Redirection & Direct Final Target Redirect

Ensure `https://thunder-appz.eu.org` is used **only** for the initial visit (`/go/:code` without a token). All subsequent shortener steps and completions stay on `tglinks.eu.cc` and redirect directly to the final destination link on completion.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Lifecyle Rules**:
> 1. **Initial Visit (First Time Only)**: `https://tglinks.eu.cc/go/6k2UTA` (no `vtok`, no `step`) redirects to `https://thunder-appz.eu.org/go/6k2UTA` (Safelink Blog Page).
> 2. **Button Click on Blog**: Button calls `/api/links/click` $\rightarrow$ generates **ShortXLinks (Step 1)** targeting `https://tglinks.eu.cc/p/6k2UTA?vtok=REAL_TOKEN&step=2`.
> 3. **Step 2 (SoftURL)**: `https://tglinks.eu.cc/p/6k2UTA?vtok=REAL_TOKEN&step=2` redirects to **SoftURL** targeting `https://tglinks.eu.cc/p/6k2UTA?vtok=REAL_TOKEN&step=3`.
> 4. **Step 3 (Completion)**: `https://tglinks.eu.cc/p/6k2UTA?vtok=REAL_TOKEN&step=3` (or `step=4` or any request with `vtok`) redirects **HTTP 302 DIRECTLY to the final target URL** (`https://google.com` / `link.originalUrl`). **Never** redirects back to `thunder-appz.eu.org`.

## 1. Lifecycle Diagram

```
[ User visits tglinks.eu.cc/go/6k2UTA (no token) ]
                       │
                       ▼ (First time only)
[ Redirects to Safelink Blog: thunder-appz.eu.org/go/6k2UTA ]
                       │
                       ▼ (User clicks "Get Link" button)
[ Calls /api/links/click -> Step 1: ShortXLinks ]
  https://shortxlinks.com/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=2
                       │
                       ▼ (Completes ShortXLinks)
[ Step 2: SoftURL ]
  https://softurl.in/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=3
                       │
                       ▼ (Completes SoftURL)
[ Step 3 / Completion ]
  https://tglinks.eu.cc/p/6k2UTA?vtok=TOKEN&step=3
                       │
                       ▼
[ HTTP 302 Directly to Final Target Link (https://google.com) ]
  (NEVER redirects back to thunder-appz.eu.org)
```

## 2. Technical Modifications

1. **Gateway Middleware (`server.ts`)**:
   - `app.get(["/go/:code", "/faucet/:code"])`:
     - If `req.query.vtok` OR `req.query.step` OR `req.path.startsWith("/p/")` OR `req.path.includes("final")` is present: **Never** redirect to `thunder-appz.eu.org`. Immediately call `next()`.
     - Only redirect to `thunder-appz.eu.org/go/:code` if it is a pure initial visit (`/go/:code` with NO `vtok` and NO `step`).

2. **Step Handler (`server.ts`)**:
   - At the top of `/p/:code`:
     - If `step >= 3` or `vtok` is present on completion step:
       - Set `Cache-Control: no-store, no-cache, must-revalidate`.
       - Return `res.redirect(302, directTargetUrl)` (`https://google.com` / `link.originalUrl`).

## 3. Verification Plan

1. **Initial Visit Verification**:
   - `GET http://localhost:3000/go/6k2UTA` (no token) -> Verify initial blog redirect.
2. **Step Completion Verification**:
   - `GET http://localhost:3000/p/6k2UTA?vtok=tg_token_demo&step=3` -> Verify returns `HTTP 302` to `https://google.com` directly (0 blog redirects).
3. **Build Verification**:
   - Rebuild `dist/server.cjs` via `npm run build`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.
