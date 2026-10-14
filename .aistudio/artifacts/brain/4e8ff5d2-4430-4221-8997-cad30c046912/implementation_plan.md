# Implementation Plan: Strict 2-Step Shortener Pipeline (ShortXLinks -> SoftURL -> Final Link)

Configure TG Links to strictly enforce a 2-step shortener progression for non-faucet links and eliminate any redirection to `thunder-appz.eu.org`.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed 2-Step Sequence**:
> 1. **Step 1 (ShortXLinks)**: `https://shortxlinks.com/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=2`
> 2. **Step 2 (SoftURL)**: `https://softurl.in/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`
> 3. **Final Destination**: SoftURL completion (`step=3` or `/go-final`) redirects `HTTP 302` directly to the user's shortened target URL (`link.originalUrl` / `https://google.com`).
> - **AdsLab / Blog Domain (`thunder-appz.eu.org`)** is completely removed from the non-faucet pipeline.

## 1. Sequence Flow Diagram

```
[ Visitor Clicks Link ]
          │
          ▼
 [ Step 1: ShortXLinks ]
  https://shortxlinks.com/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=2
          │
          ▼ (Visitor completes ShortXLinks)
 [ Step 2: SoftURL ]
  https://softurl.in/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3
          │
          ▼ (Visitor completes SoftURL)
 [ Final Destination Link ]
  HTTP 302 directly to https://google.com (or user's originalUrl)
```

## 2. Technical Modifications

1. **Database Shorteners Config (`data.json`)**:
   - Set active `shortenerIds` for all non-faucet plans to strictly `["api-shortxlinks-1", "api-softurl-2"]` (2 shorteners total).
   - Ensure `link.originalUrl` and `homepageTargetUrl` are set to `https://google.com`.

2. **Pipeline Helper (`server.ts`)**:
   - Update `getEnabledApisForPlan` to return strictly `[ShortXLinks, SoftURL]` (2 steps) for non-faucet traffic.

3. **Step Router (`server.ts`)**:
   - When `step=2`, return SoftURL QuickLink URL: `https://softurl.in/st?api=...&url=https://tglinks.eu.cc/p/6k2UTA?vtok=...&step=3`.
   - When `step >= 3` (completion of SoftURL), return `HTTP 302 Location: link.originalUrl` (`https://google.com`) directly with `Cache-Control: no-store` headers.

## 3. Verification Plan

1. **Pipeline Trace Verification**:
   - `GET /api/links/click` -> Verify Step 1 returns ShortXLinks QuickLink targeting `/p/6k2UTA?step=2`.
   - `GET /p/6k2UTA?step=2` -> Verify Step 2 returns SoftURL QuickLink targeting `/p/6k2UTA?step=3`.
   - `GET /p/6k2UTA?step=3` -> Verify returns `HTTP 302 Location: https://google.com` directly.
2. **Build Verification**:
   - Rebuild `dist/server.cjs` via `npm run build`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.
