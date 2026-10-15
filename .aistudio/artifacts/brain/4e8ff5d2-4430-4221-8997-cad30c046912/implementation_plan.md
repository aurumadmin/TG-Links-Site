# Implementation Plan: Step 2 SoftURL Redirection & Direct Final Target Completion

Ensure `/p/6k2UTA?vtok=...&step=2` redirects directly to the **SoftURL API** (`softurl.in/st?api=...`), and SoftURL completion redirects back to `tglinks.eu.cc`, which forwards directly to the final destination link (`https://google.com` / `link.originalUrl`).

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Workflow**:
> 1. **Step 1 (ShortXLinks)**: `https://shortxlinks.com/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=2`
> 2. **Step 2 (SoftURL)**: `https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=2` redirects directly to **SoftURL**:
>    `https://softurl.in/st?api=609c875b96d61f0592bfe5ae036b2db1df673680&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`
> 3. **Final Destination Target**: SoftURL completion redirects to `https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`, which returns **HTTP 302 directly to the final destination URL** (`https://google.com` / `link.originalUrl`).
> - **AdsLab / Blog Domain (`thunder-appz.eu.org`)** is completely removed from `step=2`.

## 1. Sequence Flow Diagram

```
[ Visitor Completes ShortXLinks (Step 1) ]
                  │
                  ▼
[ Arrives on tglinks.eu.cc/p/6k2UTA?vtok=...&step=2 ]
                  │
                  ▼
[ Redirects HTTP 302 directly to SoftURL API ]
https://softurl.in/st?api=609c...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3
                  │
                  ▼ (Visitor completes SoftURL)
[ Redirects back to tglinks.eu.cc/p/6k2UTA?vtok=...&step=3 ]
                  │
                  ▼
[ HTTP 302 directly to Final Destination Link (https://google.com) ]
```

## 2. Technical Modifications

1. **Shortener Pipeline Config (`server.ts`)**:
   - Filter `getEnabledApisForPlan` to strictly return `[ShortXLinks, SoftURL]` (2 steps) for non-faucet plans, excluding AdsLab from step 2.

2. **Step 2 Handler (`server.ts`)**:
   - For `step=2`, generate the QuickLink URL for SoftURL:
     `https://softurl.in/st?api=609c875b96d61f0592bfe5ae036b2db1df673680&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`

3. **Step 3 Completion Handler (`server.ts`)**:
   - On `step=3` or `step >= requiredSteps`, return `HTTP 302 Location: link.originalUrl` (`https://google.com`) directly with `Cache-Control: no-store` headers.

## 3. Verification Plan

1. **Trace Verification**:
   - `GET /p/6k2UTA?vtok=tg_token_demo&step=2` -> Verify returns `302` to `https://softurl.in/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`.
   - `GET /p/6k2UTA?vtok=tg_token_demo&step=3` -> Verify returns `302` to `https://google.com`.
2. **Build Verification**:
   - Rebuild `dist/server.cjs` via `npm run build`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.
