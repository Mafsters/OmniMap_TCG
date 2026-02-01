# Follow-up and n8n Workflow

This document describes how to use the follow-up API with n8n and Slack so that owners of roadmap items receive periodic DMs (e.g. “Hey John, you said you’d set up Shopify for the merch store – has that been done?”) and their replies are captured as ItemUpdates in OmniMap.

## Prerequisites

- **Google Apps Script** updated with the follow-up endpoints (see [APPS_SCRIPT_FOLLOW_UP.md](./APPS_SCRIPT_FOLLOW_UP.md)).
- **Slack app** with:
  - **OAuth scopes:** `chat:write`, `users:read.email`, `im:history` (if you need to read DMs).
  - **Events API** (optional): subscribe to `message.im` or use n8n’s Slack trigger to receive replies.
- **n8n** instance (cloud or self-hosted) with Slack and HTTP Request nodes.

## API contract

### 1. GET – List items due for follow-up

**URL:** Your Apps Script deployment URL (same as OmniMap’s script URL).

**Method:** GET  

**Query parameters:**

| Parameter     | Required | Description |
|--------------|----------|-------------|
| `action`     | Yes      | `list_follow_ups` |
| `cadenceDays`| No       | Include items with no update or last update older than this many days (default: 7). |
| `goalId`     | No       | Filter by strategic goal id. |
| `token`      | No*      | Shared secret; recommended so only n8n can call the endpoint. |

**Response (JSON):**

```json
{
  "items": [
    {
      "itemId": "proj-abc123",
      "title": "Set up Shopify for merch store",
      "ownerName": "John Doe",
      "ownerEmail": "john@company.com",
      "lastUpdate": "Still in progress",
      "lastUpdateDate": "2026-01-15T10:00:00.000Z"
    }
  ]
}
```

- `lastUpdate` and `lastUpdateDate` may be omitted if there is no prior update.

### 2. POST – Record update from external source (e.g. Slack)

**URL:** Same Apps Script deployment URL.

**Method:** POST  

**Body (JSON):**

```json
{
  "action": "RECORD_UPDATE_FROM_EXTERNAL",
  "itemUpdate": {
    "itemId": "proj-abc123",
    "content": "Done. Moving on to next task.",
    "health": "green",
    "source": "slack",
    "month": "Feb",
    "year": 2026
  }
}
```

- `month` and `year` are optional; if omitted, the backend uses the current period.
- `health` must be one of: `green`, `amber`, `red`.
- `source` is optional; typical values: `app`, `slack`, `n8n`.

## n8n workflow (conceptual)

1. **Schedule**  
   - Trigger: Cron (e.g. every Monday 9:00).

2. **HTTP Request – Get follow-ups**  
   - Method: GET  
   - URL: `YOUR_SCRIPT_URL?action=list_follow_ups&cadenceDays=7&token=YOUR_SECRET`  
   - Parse response JSON.

3. **Loop over items**  
   - For each item in `items`:
     - **Slack – Look up user by email** (or use stored `slackUserId` on Employee if you have it):  
       - Slack node: `users.lookupByEmail` with `ownerEmail`.
     - **Slack – Send DM**  
       - Open DM with the user id; send message, e.g.:  
         “Hey {ownerName}, for ‘{title}’: have you made progress? Reply here with Done / Blocked / In progress and a short note.”

4. **Capture replies**  
   - **Option A – Slack Events API**  
     - Slack sends `message` events to a webhook (e.g. n8n “Respond to Webhook” or a small middleware that forwards to n8n).  
     - Parse the message; map “Done” → green, “Blocked” → red, “In progress” → amber; extract itemId (e.g. from context or from a button value if you use Block Kit).
   - **Option B – Slack Block Kit with buttons**  
     - In the DM, include buttons with `value` containing `itemId` (e.g. `itemId:proj-abc123`) and label “Done” / “Blocked” / “In progress”.  
     - When the user clicks, Slack sends an interaction payload to your webhook; parse `itemId` and the chosen status, then call “Record update”.

5. **HTTP Request – Record update**  
   - Method: POST  
   - URL: Your script URL  
   - Body:  
     `{ "action": "RECORD_UPDATE_FROM_EXTERNAL", "itemUpdate": { "itemId": "...", "content": "...", "health": "green" | "amber" | "red", "source": "slack" } }`

## Frontend (OmniMap app)

The app already supports:

- **Types:** `ItemUpdate.source`, `ItemUpdate.requestedAt`, `Employee.slackUserId` (optional).
- **Service:** `sheetsService.listFollowUps(options)` and `sheetsService.recordUpdateFromExternal(payload)` for testing or admin tools.

You can add an optional “Test follow-ups” button in Sync or Admin that calls `listFollowUps({ cadenceDays: 7 })` and displays the result, without sending Slack messages.

## Security

- Use a shared **token** (query param or header) for `list_follow_ups` and `record_update_from_external`; validate it in Apps Script and reject requests without it.
- Store the token in n8n credentials or environment variables, not in the repo.
