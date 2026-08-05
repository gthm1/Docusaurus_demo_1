---
title: API Reference
customer: acme
visibility: public
sidebar_position: 2
---

# API Reference — Acme Corp

## Authentication

All requests require your Acme-issued API key in the `X-API-Key` header.

## Endpoints

### `GET /v1/devices`

Returns the list of Xmesh gateways and XVision cameras registered to your account.

### `GET /v1/telemetry/{device_id}`

Returns recent telemetry for a given device.

### `POST /v1/alerts/subscribe`

Subscribe a webhook URL to receive alert notifications.

## User Login & Activity History

### Endpoint

```
GET /v1/users/activity
```

### Authentication

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ----------------------------------- |
| `token`   | string | Yes      | Your account's API key               |

### Parameters

| Parameter     | Type    | Required | Default | Description                                                  |
| ------------- | ------- | -------- | ------- | -------------------------------------------------------------- |
| `includeLogs` | boolean | No       | 0       | Set to `1` to include activity logs                            |
| `logLimit`    | integer | No       | 100     | Number of logs per user (maximum: 1000)                        |
| `startTime`   | integer | No       | —       | Start of time range (Unix timestamp, 10 digits, UTC)            |
| `endTime`     | integer | No       | —       | End of time range (Unix timestamp, 10 digits, UTC)               |

### Behavior

**1. Default mode (latest login only)**

If `includeLogs` is not provided or set to `0`, the API returns all users on your account and their latest successful login time.

**2. Logs mode (`includeLogs=1`)**

The API returns all users on your account, their latest successful login time, and a list of activity logs per user.

Log behavior:
- Sorted by latest first
- Limited by `logLimit` (default 100, max 1000)
- Filtered by `startTime` and/or `endTime` if provided

:::info Scoped to your account
This endpoint only returns users belonging to your own AlphaX Cloud workspace. You cannot query users from another account.
:::

### Response structure

**User object (always returned)**

| Field             | Type            | Description                                                                 |
| ----------------- | --------------- | ----------------------------------------------------------------------------- |
| `userID`          | string          | Unique identifier of the user                                                 |
| `name`            | string          | User's display name                                                           |
| `email`           | string          | User's email address                                                          |
| `latestLogin_UTC` | string / null   | Latest successful login time in UTC (`YYYY-MM-DD HH:mm:ss`). Returns `null` if the user has never logged in |

**Logs field (only when `includeLogs = 1`)**

| Field  | Type  | Description                          |
| ------ | ----- | --------------------------------------- |
| `logs` | array | List of activity logs for the user       |

**Log object**

| Field           | Type            | Description                                     |
| --------------- | --------------- | -------------------------------------------------- |
| `timestamp_UTC` | string / null   | Log timestamp in UTC (`YYYY-MM-DD HH:mm:ss`)        |
| `description`   | string / null   | Description of the activity                        |

### Examples

**1. Get users with latest login**

```
?token=YOUR_TOKEN
```

**2. Get users with logs (default 100 per user)**

```
?token=YOUR_TOKEN&includeLogs=1
```

**3. Filter logs by date range**

```
?token=YOUR_TOKEN&includeLogs=1&startTime=1751328000&endTime=1754006399
```

### Sample response (with logs)

```json
[
  {
    "userID": "65114c4d304864ec0e0312ec",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "latestLogin_UTC": "2026-07-22 05:34:10",
    "logs": [
      {
        "timestamp_UTC": "2026-07-22 05:34:10",
        "description": "People: User: Login Succeeded: Jane Smith"
      }
    ]
  }
]
```

### Important notes

- All timestamps are returned in **UTC**
- The API only returns users on your own account
- Maximum `logLimit` is 1000 — unlimited log retrieval is not supported
- If a user has never logged in: `"latestLogin_UTC": null`
