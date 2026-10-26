# Implementation Plan: Direct 1-Step ShortXLinks Redirection & TG Links Completion Page

Modify the non-faucet link pipeline so visitors directly redirect (HTTP 302) to ShortXLinks when opening any short link, bypassing the `thunder-appz` blog page completely. After completing the single ShortXLinks step, visitors land on a branded **TG Links Completion Page** (on `tglinks.eu.org`) featuring an "Open Destination" button that forwards to the target URL.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Workflow**:
> 1. **Initial Visit (`/go/:code`)**:
>    - Generates the single ShortXLinks QuickLink API URL directly with an anti-bypass verification token (`vtok`).
>    - Immediately returns **HTTP 302** directly to ShortXLinks (`https://shortxlinks.com/st?api=...&url=...`).
>    - **Zero redirection to `thunder-appz.eu.org` blog page**.
> 2. **Shortener Pipeline**:
>    - Restricted strictly to **1 step** (`ShortXLinks` only).
>    - SoftURL and ShareDiskLinks are deactivated from the non-faucet chain.
> 3. **Completion on TG Links (`tglinks.eu.org`)**:
>    - Once the visitor solves ShortXLinks, ShortXLinks returns to `https://tglinks.eu.org/p/:code?vtok=TOKEN&step=2` (or `/go-final/:code`).
>    - TG Links renders the native **Destination Ready / Completion Screen** on `tglinks.eu.org` (not on `thunder-appz`).
>    - The visitor clicks **"Open Destination"** / **"Get Link"** to proceed to `link.originalUrl` (e.g. `https://google.com`).

---

## 1. Sequence Flow Diagram

```
[ Visitor visits https://tglinks.eu.org/go/6k2UTA ]
                  │
                  ▼ (Direct HTTP 302 Redirect — No blog page)
[ ShortXLinks Step (Single Step) ]
https://shortxlinks.com/st?api=b6ac...&url=https://tglinks.eu.org/p/6k2UTA?vtok=TOKEN&step=2
                  │
                  ▼ (Visitor completes ShortXLinks)
[ Arrives on https://tglinks.eu.org/p/6k2UTA?vtok=TOKEN&step=2 ]
                  │
                  ▼ (Render TG Links On-Domain Completion Screen)
[ "Your Link is Ready!" - Open Destination Button ]
                  │
                  ▼ (Visitor clicks button)
[ Direct to Final Destination URL (https://google.com) ]
```

---

## 2. Technical Modifications

1. **Shortener Pipeline (`data.json`)**:
   - Update default plan `shortenerIds` to `["api-shortxlinks-1"]` (1 step only).
   - Set pipeline length to 1.

2. **Server Routing & Interceptor Updates (`server.ts`)**:
   - **`/go/:code` Route**:
     - Check if non-faucet link.
     - Generate verification token (`vtok`) and construct ShortXLinks QuickLink target pointing to `${platformBase}/p/${code}?vtok=${vtok}&step=2`.
     - Issue immediate `res.redirect(302, shortXLinksUrl)` — bypassing `thunder-appz`.
   - **Remove Hardcoded Step 2 & 3 Chain Interceptors**:
     - Remove the previous hardcoded Step 2 (SoftURL) and Step 3 (ShareDiskLinks) redirect loops.
     - In `getEnabledApisForPlan`, return only ShortXLinks for non-faucet traffic.
   - **Step 2 / Completion Handler**:
     - When visitor returns with `step=2` or completes the required 1 step:
       - Validate `vtok` and mark click progress.
       - Render the completion page on `tglinks.eu.org` (or pass to frontend SPA `/p/:code` with verified status to display the "Open Destination" button).

3. **Frontend Destination Unlock Component (`src/components/SafelinkPage.tsx` / `LandingPage.tsx`)**:
   - Ensure the completion screen displays cleanly with an active "Open Destination" button, link details, and one-click forward to `link.originalUrl`.

---

## 3. Verification Plan

1. **Direct Redirect Test**:
   - `GET /go/6k2UTA` $\longrightarrow$ Verify immediate `302` response with `Location: https://shortxlinks.com/st?api=b6ac...&url=https://tglinks.eu.org/p/6k2UTA?vtok=...&step=2`.
   - Verify `thunder-appz.eu.org` is **never called or redirected to**.
2. **Completion Page Test**:
   - `GET /p/6k2UTA?vtok=VALID_TOKEN&step=2` $\longrightarrow$ Verify serves TG Links completion page (HTTP 200) with "Open Destination" action.
3. **Build & Lint**:
   - Rebuild `dist/server.cjs` and verify `lint_applet` and `compile_applet` pass with 0 errors.
