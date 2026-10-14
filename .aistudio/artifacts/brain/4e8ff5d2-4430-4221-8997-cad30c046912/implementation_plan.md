# Implementation Plan: Direct Target Redirection on Step 4 (Loop Elimination)

Ensure `/p/:code?step=4` (and any completion step where `stepIndex >= requiredSteps`) redirects **directly (HTTP 302) to the external target URL** (`https://google.com` or `link.originalUrl`) without routing through `thunder-appz.eu.org/go/:code`.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices from Phase 1**:
> - **Completion Target**: When `step=4` (or any completion step) is accessed, TG Links redirects `HTTP 302` directly to the external target URL (`link.originalUrl` / `https://google.com`).
> - **Safelink Blog Excluded from Completion**: `thunder-appz.eu.org/go` is strictly reserved for initial step 1 clicks and is **never** invoked for step 3, step 4, or completion redirects.

## 1. Core Logic Update

```
                               ┌────────────────────────────────┐
                               │ Visitor hits                   │
                               │ /p/6k2UTA?vtok=...&step=4      │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │ Step Check: step >= 3 (step>=2)│
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │ Redirect 302 DIRECTLY to:      │
                               │ link.originalUrl               │
                               │ (e.g. https://google.com)      │
                               └────────────────────────────────┘
```

## 2. Technical Modifications

1. **`/p/:code` Step Handler (`server.ts`)**:
   - When `stepIndex >= requiredSteps` (e.g. `step=3` or `step=4` or higher):
     - Extract `link.originalUrl` (e.g. `https://google.com`).
     - If `link.originalUrl` is missing or contains `thunder-appz.eu.org` / internal paths, fallback directly to `https://google.com`.
     - Return `res.redirect(302, targetUrl)` immediately.

2. **`/go-final/:code` Route (`server.ts`)**:
   - Extract `link.originalUrl` and validate.
   - Return `res.redirect(302, targetUrl)` directly to external destination (`https://google.com`).

3. **Gateway Middleware Safeguard (`server.ts`)**:
   - Strictly limit `thunder-appz.eu.org` redirects to initial step 1 clicks when no `step >= 2` or completion token exists.

## 3. Verification Plan

1. **Route Testing**:
   - Fetch `/p/6k2UTA?vtok=tg_token_demo&step=4` -> Verify response is `HTTP 302` with `Location: https://google.com` (or target destination URL).
   - Fetch `/go-final/6k2UTA?vtok=tg_token_demo` -> Verify response is `HTTP 302` with `Location: https://google.com`.
2. **Build Verification**:
   - Rebuild `dist/server.cjs` with `npm run build`.
   - Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.
