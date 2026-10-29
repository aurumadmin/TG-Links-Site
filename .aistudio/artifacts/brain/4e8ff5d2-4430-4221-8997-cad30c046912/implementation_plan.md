# Implementation Plan - ELITE Publisher Plan (ShortXLinks + SoftURL Sequential Monetization)

Create and activate the new **ELITE** publisher plan offering an elevated **$8.00 CPM** payout rate. Visitors navigating short links generated under this plan must complete a 2-step verification chain—first **ShortXLinks**, immediately followed by **SoftURL**—before landing on the final destination page.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following requirements were confirmed during Phase 1 clarification:
> - **CPM Payout Rate**: Set to **$8.00 CPM** ($8.00 per 1,000 verified views), giving creators a premium payout rate reflecting the two-step completion requirement.
> - **Step Progression Order**: Strictly **ShortXLinks first (Step 1)**, then **SoftURL (Step 2)**, followed by the TG Links verified completion screen and destination access.
> - **Publisher Accessibility**: Freely selectable by **all publishers** directly from the **Plans** page and User Dashboard.

---

### 1. Overview & Core Concept

- **What It Does**: Introduces a high-yield publisher tier named **ELITE** (`id: "elite"`). When a creator selects or generates links under the ELITE plan, link clicks are routed through a sequential dual-shortener pipeline:
  1. **Step 1**: Visitor is routed through **ShortXLinks** (`shortxlinks.com`).
  2. **Step 2**: Upon completing ShortXLinks, the visitor returns to TG Links and is seamlessly dispatched to **SoftURL** (`softurl.in`).
  3. **Completion**: Upon completing SoftURL, the visit is validated, the publisher is credited earnings at the **$8.00 CPM** rate, and the visitor accesses the final destination URL.
- **Target Audience**: Telegram channel owners, high-intent download communities, and content creators seeking maximum CPM revenue per thousand clicks.
- **Key Value**: Provides publishers with an official 2-step option with double monetization yield compared to single-step plans.

---

### 2. User Experience & Visual Design

- **Plans Page Showcase (`/plans`)**:
  - The ELITE plan card features prominent badging (`ELITE PLAN`), clear rate display (`$8.00 CPM`), and a visual 2-step badge indicator (`#1 ShortXLinks` → `#2 SoftURL`).
  - Active plan indicator and a responsive `"Switch to Plan"` CTA with live state transitions and success alerts.
- **User Dashboard (`/dashboard`)**:
  - Displays the active plan as **ELITE** with `$8.00 CPM` rate in the publisher overview.
  - Links created while on the ELITE plan indicate the dual-shortener pipeline.
- **Admin Panel (`/admin` → Publisher Plans Manager)**:
  - Lists the ELITE plan in the configured plans table with full editing and toggle controls.
  - Allows administrators to adjust CPM, reorder shorteners, or toggle status at any time.

---

### 3. Key Product Decisions & Trade-Offs

- **Multi-Step Chain Execution**:
  - *Chosen Approach*: Maintain server-side cryptographic token validation (`vtok`) tracking step progression (`step=1`, `step=2`, `step=3`). When returning to `/p/:code` at `step=2`, the server checks the plan's shortener count. If 2 shorteners are configured, it invokes the second shortener (SoftURL) with a target of `step=3`. Only when `step > totalRequiredSteps` is the click recorded and rewarded.
  - *Why*: Prevents view spoofing or early rewards if a visitor drops off after only completing the first shortener. Both shorteners must be completed to unlock the destination and award earnings.
- **Fallback Resilience**:
  - *Chosen Approach*: If SoftURL API experiences temporary network timeouts during the step 2 redirect, the server gracefully allows the visitor to proceed to the completion page to prevent broken user experiences.

---

### 4. Technical Architecture & Sequential Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELITE PLAN PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────┘

 1. LINK CLICK
    User clicks: tglinks.tech/go/:code (or short link)
         │
         ▼
 2. STEP 1 (ShortXLinks)
    Server provisions vtok and redirects visitor to ShortXLinks:
    shortxlinks.com/st?api=...&url=tglinks.tech/p/:code?vtok=...&step=2
         │
         ▼
 3. VISITOR COMPLETES SHORTXLINKS
    Redirects back to: tglinks.tech/p/:code?vtok=...&step=2
         │
         ▼
 4. STEP 2 DISPATCH (SoftURL)
    Server detects Step 2 of 2 in ELITE plan.
    Dispatches visitor to SoftURL:
    softurl.in/st?api=...&url=tglinks.tech/p/:code?vtok=...&step=3
         │
         ▼
 5. VISITOR COMPLETES SOFTURL
    Redirects back to: tglinks.tech/p/:code?vtok=...&step=3
         │
         ▼
 6. REWARD & DESTINATION ACCESS
    Server verifies both steps completed.
    - Credits publisher balance with $8.00 CPM ($0.008 per view)
    - Logs verified click in clicksLog
    - Renders TG Links Verified Completion Page -> Original URL
```

---

### 5. Implementation Steps (Upon Approval)

1. **Seed & Register Plan in `data.json`**:
   - Add the `elite` plan object:
     ```json
     {
       "id": "elite",
       "name": "ELITE",
       "cpm": 8.0,
       "shortenerIds": [
         "api-shortxlinks-1",
         "api-softurl-2"
       ],
       "blogPageUrl": "https://thunder-appz.eu.org",
       "description": "Premium 2-step monetization plan. Visitors complete ShortXLinks followed by SoftURL for an elevated $8.00 CPM payout rate.",
       "isDefault": false,
       "enabled": true,
       "isFaucetPlan": false,
       "requirements": "Complete both ShortXLinks and SoftURL. Verified traffic only."
     }
     ```

2. **Update Server Routing Logic in `server.ts`**:
   - In `/p/:code` handler, check whether the incoming step (`rawStepVal`) has remaining shorteners in the plan's `enabledApis` sequence.
   - For Step 2 when `enabledApis.length >= 2`: generate/fetch the second shortener URL (SoftURL) pointing to `/p/:code?step=3&vtok=...`, and redirect the visitor to SoftURL.
   - For Step 3 (or when all steps are finished): credit the click at the link's plan CPM ($8.00) and render the verified completion page.

3. **Verify UI Components & Build**:
   - Ensure `PlansPage.tsx`, `DashboardPage.tsx`, and `AdminPage.tsx` display the ELITE plan and its 2-shortener badge chain (`#1 ShortXLinks` + `#2 SoftURL`) accurately.
   - Execute `compile_applet` and test production build.
