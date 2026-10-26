# Implementation Plan: Add "Plan 2" with Dedicated SoftURL Pipeline

Add a new publisher plan named **Plan 2** configured with **SoftURL** as its single integrated shortener ($5.00 CPM), operating with the exact same direct 1-step flow as Default Plan (ShortXLinks): direct HTTP 302 redirect to SoftURL upon visiting `/go/:code`, followed by returning directly to the TG Links completion screen with the "Open Destination" button.

---

## User Specifications & Decisions
> - **Plan Name**: `Plan 2`
> - **Assigned Shortener**: `SoftURL` (`https://softurl.in/api`, token: `609c875b96d61f0592bfe5ae036b2db1df673680`)
> - **CPM Rate**: `$5.00 CPM` (matching Default Plan)
> - **Redirection Behavior**: Immediate 302 redirect straight to SoftURL (no `thunder-appz` blog page), returning to `https://tglinks.tech/go-final/:code?vtok=...` to display the TG Links completion page with the "Open Destination" button.
> - **URL Encoding Rule**: Strict preservation of unencoded `://` in the `url=` parameter (`https://softurl.in/st?api=TOKEN&url=https://...`) to prevent AdLinkFly rejection errors.

---

## Architecture & Flow

```
[ Visitor opens /go/:code ]
            │
            ▼ (Inspect Link Creator's Plan)
  ┌─────────────────────────┴─────────────────────────┐
  ▼                                                   ▼
[ Default Plan ]                                  [ Plan 2 ]
Shortener: ShortXLinks                            Shortener: SoftURL
  │                                                   │
  ▼ (302 Direct Redirect)                             ▼ (302 Direct Redirect)
https://shortxlinks.com/st?api=...&url=...        https://softurl.in/st?api=...&url=...
  │                                                   │
  └─────────────────────────┬─────────────────────────┘
                            │ (Visitor solves shortlink)
                            ▼
              [ Arrives at /go-final/:code ]
             (Verifies token & logs $5.00 CPM)
                            │
                            ▼
     [ Renders TG Links "Your Destination is Ready!" Page ]
                            │
                 [ Click "Open Destination" ]
                            │
                            ▼
                   [ Target Website ]
```

---

## Proposed Changes

### 1. Database & Defaults (`data.json` & `server.ts`)
- **Enable SoftURL**:
  - In `db.adFlyShorteners`, set `api-softurl-2` (`SoftURL`) to `enabled: true`.
- **Add Plan 2**:
  - Insert new plan into `db.plans`:
    ```json
    {
      "id": "plan-2",
      "name": "Plan 2",
      "cpm": 5.0,
      "shortenerIds": ["api-softurl-2"],
      "blogPageUrl": "https://thunder-appz.eu.org",
      "description": "Single-step high conversion plan using SoftURL with direct redirection.",
      "isDefault": false,
      "enabled": true,
      "isFaucetPlan": false,
      "requirements": "All traffic allowed. 100% completed view counting."
    }
    ```
- Update initial database seeding logic in `server.ts` so `Plan 2` is automatically present if the database is reset or initialized.

### 2. Pipeline Shortener Selection (`server.ts`)
- In `getEnabledApisForPlan`:
  - Allow `SoftURL` (`api-softurl-2`) to be selected when assigned to a non-faucet plan (remove the skip filter for `softurl`).
- In Direct Non-Faucet Redirection (`/go/:code` handler, line ~3007):
  - Dynamically select the assigned shortener for the link creator's active plan:
    - If plan uses `SoftURL`, route via `https://softurl.in/st?api=${token}&url=${completionUrl}`.
    - If plan uses `ShortXLinks`, route via `https://shortxlinks.com/st?api=${token}&url=${completionUrl}`.
  - Maintain the raw `://` formatting in `url=` for all AdLinkFly QuickLinks.

### 3. Build & Verification
- Compile and build with `npm run build` (`vite build && esbuild server.ts`).
- Verify `compile_applet` and `lint_applet` succeed.
- Test `/go/:code` for links assigned to `Plan 2` via `curl -i` to verify immediate 302 to `softurl.in/st?api=...&url=https://.../go-final/...`.
- Test completion page access to confirm view counting, $5.00 CPM rate crediting, and "Open Destination" button rendering.
