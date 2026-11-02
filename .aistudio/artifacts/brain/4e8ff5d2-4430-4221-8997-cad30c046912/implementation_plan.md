# ShareDiskLinks Toggle for ELITE Plan & Withdrawal Refinements

Add a dedicated one-click toggle in the Admin Panel to enable or disable **ShareDiskLinks** (`https://sharedisklinks.com/st?api=271c129bc7585bddfe6a026a2536116403e057ac&url=...`) as the 3rd step in the **ELITE** plan's redirect chain (`ShortXLinks` → `SoftURL` → `ShareDiskLinks`), while letting the **admin freely decide and set the CPM rate** for the ELITE plan at any time, alongside completing all pending FaucetPay live balance and withdrawal status improvements.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions incorporate your latest feedback and govern this implementation:

- **Redirect Sequence When Enabled**: Visitors on the **ELITE** plan complete **ShortXLinks** first (`step=0`), **SoftURL** second (`step=1`), and **ShareDiskLinks** third (`step=2`) before reaching the final destination page.
- **Default State & Admin Control**: ShareDiskLinks starts **disabled by default** in the ELITE plan, with a dedicated quick toggle button directly on the **ELITE** plan card in the Admin Panel (`Publisher Plans` tab) as well as checkbox control in the Plan Editor and External Shorteners list.
- **Admin-Controlled CPM Rate**: Toggling ShareDiskLinks on or off **does not overwrite** the plan's CPM with a hardcoded value—the **admin decides the CPM rate** freely via the Plan Editor (or inline when toggling/editing the plan).
- **Previous Withdrawal & FaucetPay Refinements Preserved**:
  - Older processed withdrawals are automatically migrated to `completed` status with valid submission timestamps.
  - Email notifications are never sent while a withdrawal is in `processing` status (only sent once upon `approved` and once upon `completed`).
  - FaucetPay Live Balances display only cryptocurrencies with an available balance greater than `0`, alongside their live USD (`$`) value.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Integrates **ShareDiskLinks** using the QuickLink format (`https://sharedisklinks.com/st?api=271c129bc7585bddfe6a026a2536116403e057ac&url=...`) into the multi-step publisher plan pipeline.
  2. Provides administrators with an instant toggle on the **ELITE** plan to switch between a 2-step pipeline (`ShortXLinks` → `SoftURL`) and a 3-step pipeline (`ShortXLinks` → `SoftURL` → `ShareDiskLinks`), while keeping full manual control over the plan's CPM rate.
  3. Upgrades the Admin Withdrawals & FaucetPay views so only positive crypto balances are displayed with live `$` valuations, legacy approved withdrawals are marked completed, and duplicate processing emails are eliminated.
- **Target Audience / Persona**: Platform administrators managing monetization yield and publisher payout workflows, and publishers using the ELITE plan.
- **Key Value**: Lets administrators enable or disable ShareDiskLinks in the ELITE plan with one click while retaining complete control over the CPM payout rate.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Admin Quick Toggle & Custom CPM in Publisher Plans**:
     - In **Admin Panel → Publisher Plans**, the **ELITE** plan row features a dedicated **ShareDiskLinks** toggle button (`Enable ShareDiskLinks` / `ShareDiskLinks Enabled`).
     - When **Disabled (Default)**: ELITE plan runs `ShortXLinks → SoftURL` (2 steps).
     - When **Enabled**: ShareDiskLinks (`api-sharedisklinks-3`) is activated and appended as Step #3 (`ShortXLinks → SoftURL → ShareDiskLinks`).
     - **Admin-Defined CPM**: The ELITE plan preserves whatever CPM rate the admin sets in the Plan Editor (defaulting to `$8.00 CPM` until changed by the admin), and the admin can update the CPM rate to any value at any time.
  2. **Visitor Multi-Step Redirect Flow (ELITE with ShareDiskLinks Enabled)**:
     - Visitor opens `/go/:code` → redirected to **ShortXLinks** (`step=0`) → returns to `/go/:code?step=1` → redirected to **SoftURL** (`step=1`) → returns to `/go/:code?step=2` → redirected to **ShareDiskLinks** (`https://sharedisklinks.com/st?api=271c129bc7585bddfe6a026a2536116403e057ac&url=...`) → returns to `/go-final/:code?vtok=...` where the completed view and the admin-configured ELITE CPM earning are credited.
  3. **Admin FaucetPay Live Balances & Withdrawals**:
     - Clicking **Live Balances** shows only cryptocurrencies with balance `> 0`, formatted with tabular numerals and live USD equivalents (e.g., `LTC: 0.00766982 ($0.42)`).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast dark slate SaaS admin console (`#020617` canvas, `#0F172A` structural cards, `#1E293B` hairline borders).
  - *Color Palette & Mood*: Emerald (`#10B981`) for active/enabled states and USD payout rates, Indigo (`#6366F1`) for primary controls, and Amber (`#F59E0B`) for FaucetPay actions.
  - *Typography & Hierarchy*: Clean sans-serif headings paired with `font-mono tabular-nums` for all CPM rates, crypto balances, USD conversions, and timestamps.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Independent ShareDiskLinks Toggle + Admin-Controlled CPM**
  - *Chosen Approach*: Ensure `api-sharedisklinks-3` (`ShareDiskLinks`) is seeded and kept synced with token `271c129bc7585bddfe6a026a2536116403e057ac` and QuickLink endpoint `https://sharedisklinks.com/st?api=271c129bc7585bddfe6a026a2536116403e057ac&url=...`. Provide a toggle on the ELITE plan that enables/disables `api-sharedisklinks-3` and updates `elite.shortenerIds` between `["api-shortxlinks-1", "api-softurl-2"]` and `["api-shortxlinks-1", "api-softurl-2", "api-sharedisklinks-3"]` without overriding `elite.cpm`. The admin can freely edit `elite.cpm` via the Plan Editor.
  - *Why*: Gives the admin full flexibility to set any CPM rate for the ELITE plan whether ShareDiskLinks is enabled or disabled.
- **Decision 2: Direct QuickLink Format for ShareDiskLinks**
  - *Chosen Approach*: Use the direct QuickLink redirect URL `https://sharedisklinks.com/st?api=271c129bc7585bddfe6a026a2536116403e057ac&url={destination}` in `getSingleExternalShortenedUrl` and allow `sharedisklinks` in `getEnabledApisForPlan`.
  - *Why*: Matches ShareDiskLinks' official QuickLink specification provided by the user, ensuring instant and reliable redirects.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Admin Panel (Publisher Plans)                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ELITE Plan Card (Admin-Configured CPM Rate)                        │  │
│  │  • Chain: #1 ShortXLinks → #2 SoftURL [→ #3 ShareDiskLinks]        │  │
│  │  • Quick Action: [ Enable / Disable ShareDiskLinks ]  [ Edit CPM ] │  │
│  └───────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────┼───────────────────────────────────────┘
                                   │ POST /api/admin/plans/elite/toggle-sharedisklinks
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Express Backend & Pipeline Engine                    │
│  • Updates ShareDiskLinks API (token: 271c129bc7585bddfe6a026a2536116403e057ac) │
│  • Updates ELITE Plan shortenerIds (preserves admin-configured CPM)      │
│  • getEnabledApisForPlan() resolves active chain:                        │
│      Step 0: ShortXLinks                                                 │
│      Step 1: SoftURL                                                     │
│      Step 2: ShareDiskLinks (when enabled)                               │
│      Final : /go-final/:code?vtok=... (credits view at plan's CPM)       │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `adFlyShorteners`: Entry `id: "api-sharedisklinks-3"`, `name: "ShareDiskLinks"`, `apiUrl: "https://sharedisklinks.com/api"`, `apiToken: "271c129bc7585bddfe6a026a2536116403e057ac"`, `enabled: false` (by default).
  - `plans` (`id: "elite"`): `shortenerIds: ["api-shortxlinks-1", "api-softurl-2"]` when ShareDiskLinks is disabled; `shortenerIds: ["api-shortxlinks-1", "api-softurl-2", "api-sharedisklinks-3"]` when ShareDiskLinks is enabled; `cpm` remains fully configurable by the admin.
- **Interactive Component & State Mapping**:
  - **ELITE ShareDiskLinks Toggle Button**: Calls `POST /api/admin/plans/elite/toggle-sharedisklinks` (or updates via the Plan Editor checkboxes), immediately refreshes `adminPlansList` and `externalApis`, and keeps the admin's chosen CPM intact.
  - **FaucetPay Live Balances & Withdrawals**: Filters live balance entries on both backend and frontend to coins with `cryptoAmount > 0`, displays `$` USD value next to each coin balance, formats legacy withdrawal timestamps safely, and provides a one-click bulk completion action if any approved withdrawals remain.
