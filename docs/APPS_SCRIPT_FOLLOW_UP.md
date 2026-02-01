# Follow-up API: Apps Script Snippet

Add these handlers to your existing Google Apps Script that serves OmniMap so that n8n (or another scheduler) can:

1. **GET** items due for follow-up (to send Slack DMs to owners).
2. **POST** record an update from an external source (e.g. Slack reply).

Secure both with a shared `token` query param or header; reject requests without it.

---

## 1. In `doGet(e)` – handle `action=list_follow_ups`

When the script receives a GET with `?action=list_follow_ups&cadenceDays=7&token=YOUR_SECRET`, return JSON:

```json
{ "items": [ { "itemId", "title", "ownerName", "ownerEmail", "lastUpdate", "lastUpdateDate" }, ... ] }
```

**Logic (pseudocode):**

- Read your existing Sheets: Items (roadmap items), Employees, ItemUpdates.
- Optional: validate `e.parameter.token` against a script property (e.g. `FOLLOW_UP_API_TOKEN`).
- Filter items where `status !== 'Done'`.
- For each item, find the last ItemUpdate (by `updatedAt` or month/year). If no update, or last update older than `cadenceDays` (default 7), include the item.
- Resolve owner email: match item `owner` (name) to Employees and take `email`; if no email, skip or use empty string.
- Return `{ items: [ { itemId, title, ownerName: item.owner, ownerEmail, lastUpdate: last?.content, lastUpdateDate: last?.updatedAt } ] }`.
- Set `ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)` and return it.

**Query params:**

- `action=list_follow_ups` (required)
- `cadenceDays=7` (optional, default 7)
- `goalId=...` (optional, filter by goal)
- `token=...` (recommended, validate and reject if missing/wrong)

---

## 2. In `doPost(e)` – handle `RECORD_UPDATE_FROM_EXTERNAL`

When the script receives a POST with body:

```json
{ "action": "RECORD_UPDATE_FROM_EXTERNAL", "itemUpdate": { "itemId", "content", "health", "source", "month", "year" } }
```

**Logic:**

- Parse `e.postData.contents` as JSON.
- If `parsed.action !== 'RECORD_UPDATE_FROM_EXTERNAL'`, continue to your existing POST handling.
- Optional: validate a `token` in the body or a custom header.
- Generate an `id` for the new update (e.g. UUID or timestamp-based).
- Set `updatedAt` to current ISO string if not provided.
- Append a row to your ItemUpdates sheet (or use the same logic you use for `UPSERT_ITEM_UPDATE`), including optional columns for `source` and `requestedAt` if you store them.
- Return 200 with a simple JSON `{ "success": true }` or your existing success response.

---

## 3. Example integration in your existing script

- In **doGet**: after reading `e.parameter.action`, if `action === 'list_follow_ups'` call a function `handleListFollowUps(e.parameter)` that implements the logic above and return its output.
- In **doPost**: after parsing the body, if `parsed.action === 'RECORD_UPDATE_FROM_EXTERNAL'` call a function that writes `parsed.itemUpdate` to the ItemUpdates sheet (reuse your existing upsert logic for item updates), then return success.

This keeps all data in G-Sheets and allows n8n to poll for follow-ups and post updates without changing the frontend app’s main flow.
