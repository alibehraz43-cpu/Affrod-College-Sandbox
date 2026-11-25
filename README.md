# Afford College: Bridge Handoff (Sandbox)

Proof of concept for the ScoreApp to GHL personalized bridge page.
Sandbox only. Nothing here touches the live funnel.

## How it works

1. Family finishes the ScoreApp quiz.
2. ScoreApp's native GHL connector writes Total Score and Score Tier onto the GHL contact.
3. ScoreApp's **Quiz Finished webhook** hits a GHL Inbound Webhook workflow, which saves
   Concern, Timeline and the ScoreApp ID onto the same contact.
4. ScoreApp's External Redirect sends the family to the GHL bridge page with the ScoreApp ID: `?rid=<ScoreApp ID>`
5. The bridge page calls this service: `GET /api/bridge?rid=...`
6. This service (holding the GHL token) finds the contact by `ScoreApp-AC-Response-ID`, reads the four fields,
   converts them to approved codes, and returns only display values
   (first name, score, band, concern, timeline). No email, phone or financial data.
7. The page shows exactly one concern, one band and one timeline block, or a safe fallback.
8. If GHL hasn't finished writing yet, the service retries (5 x 1.5s by default).

## 1. GitHub setup

1. In the Lampert Educational Resources GitHub org: **New repository**
   - Name: `ac-bridge-handoff`, **Private**, no README (this repo has one).
2. On your computer, inside this folder:
   ```bash
   git init
   git add .
   git commit -m "Sandbox bridge handoff v0.1"
   git branch -M main
   git remote add origin https://github.com/<LER-ORG>/ac-bridge-handoff.git
   git push -u origin main
   ```
3. Check that `.env` is NOT in the repo (only `.env.example`). Secrets never go in GitHub.

## 2. Railway setup

1. Railway (LER account) > **New Project** > **Deploy from GitHub repo** > pick `ac-bridge-handoff`.
   Railway detects Node and runs `npm start`.
2. Service > **Variables** > add every key from `.env.example`:

   | Variable | Sandbox value |
   |---|---|
   | `GHL_API_TOKEN` | Private Integration token (scopes: contacts.readonly, locations/customFields.readonly) |
   | `GHL_LOCATION_ID` | Sandbox sub-account Location ID |
   | `LOOKUP_MODE` | `field` |
   | `LOOKUP_FIELD_NAME` | `ScoreApp-AC-Response-ID` |
   | `FIELD_SCORE` | `ScoreApp-AC-Total-Score` |
   | `FIELD_BAND` | `ScoreApp-AC-Category-Score-Tier` |
   | `FIELD_CONCERN` | `ScoreApp-AC-Concern-Code` |
   | `FIELD_TIMELINE` | `ScoreApp-AC-Timeline-Code` |
   | `ALLOWED_ORIGINS` | Your GHL funnel domain(s), comma-separated, with `https://` |
   | `ADMIN_KEY` | Long random string |

3. Service > **Settings** > **Networking** > **Generate Domain**. Copy the URL
   (e.g. `https://ac-bridge-handoff-production.up.railway.app`).
4. Test: open `<url>/health`. You should see `"configured": true`.
5. Confirm field names:
   ```bash
   curl -H "x-admin-key: <ADMIN_KEY>" <url>/admin/fields
   ```
   Field names are matched loosely (case, spaces and dashes ignored), so
   "ScoreApp AC Total Score" and "ScoreApp-AC-Total-Score" both work.

## 3. GHL setup (sandbox sub-account)

1. Create three contact custom fields in the **ScoreApp** group (single line text for the sandbox):
   - `ScoreApp-AC-Concern-Code`
   - `ScoreApp-AC-Timeline-Code`
   - `ScoreApp-AC-Response-ID`
   Then in the Inbound Webhook workflow, an **Update Contact Field** action fills all three from the payload.
   (Workbook rows first, per the order. Proposed rows are in the hand-off notes.)
2. New funnel step (blank page) named e.g. `bridge-v2-sandbox`.
3. Add a full-width section > **Custom JS/HTML** element > paste all of `ghl/bridge-page.html`.
4. Edit the `CONFIG` block at the top of the script:
   - `API_BASE` = your Railway URL
   - `REGISTER_URL` = your sandbox workshop registration page
5. Save and preview.

## 4. ScoreApp setup (sandbox scorecard copy)

1. Integrate > Webhooks: URL = the GHL Inbound Webhook URL, **Quiz Finished = send**, Save, Test.
2. Results Pages > **Create Result Page** > **External Redirect**:
   `https://<your-domain>/<bridge-page>?rid=` + the ScoreApp ID merge tag.

## Which id goes in the URL (`LOOKUP_MODE`)

| Mode | URL carries | Use |
|---|---|---|
| `contact_id` | GHL contact id | Demo now: open the page with a real contact's id. ScoreApp doesn't know this id, so it can't be used from the redirect. |
| `field` | ScoreApp lead/response id | Target design. Needs the same id mapped into a GHL field (`LOOKUP_FIELD_NAME`) AND available as a redirect merge tag. |
| `email` | Email | Sandbox fallback only. Breaks the "no email in URLs" rule (section 17.1). Requires `ALLOW_EMAIL_LOOKUP=true`. |

## Testing

- **All 64 combinations, no backend needed:** `<bridge-page-url>?demo=1`
  Pick concern, band, timeline, name and score from the yellow bar. Tick "Force fallback" to see the safe version.
- **Real contact:** `<bridge-page-url>?rid=<ScoreApp ID saved on that contact>`.
- **Fallback:** `<bridge-page-url>` with no id, or a contact missing concern/timeline.
- Label rules: `npm test`.

Before any live use: set `ALLOW_DEMO: false` in the page and `LOOKUP_MODE=field`.

## Label to code rules

`src/normalize.js` converts what ScoreApp writes into codes. Current band labels
(from the GHL record) already map: Crisis Mode, At Risk, Good Position, Excellent Position.
Concern and timeline rules are keyword-based until we have ScoreApp's exact answer wording.

## API

`GET /api/bridge?rid=<id>` returns:
```json
{ "status": "ok", "missing": [], "firstName": "Peter", "score": 46,
  "band": "AT_RISK", "concern": "RETIREMENT_RISK", "timeline": "JUNIOR",
  "segmentKey": "RETIREMENT_RISK-AT_RISK-JUNIOR" }
```
`status` is `ok`, `partial` (page shows fallback), `not_found`, `bad_id` or `upstream_error`.

## Not in this sandbox (comes with the work order)

Signed short-lived tokens, one-click workshop registration, engagement tags
(`30_ACT_BridgeViewed`, video thresholds, CTA click), audit history for retakes.
