---
title: Internal API Reference
visibility: internal
sidebar_position: 4
---

# Internal API Reference

Staff-only AlphaX Cloud API endpoints used for support, debugging, and account administration. These are not exposed in any customer-facing API Reference page.

## User Last Login & Activity Logs

### Endpoint

```
GET /custom/minnovation/getUserLastLoginAndLogs.php
```

### Authentication

| Parameter | Type   | Required | Description       |
| --------- | ------ | -------- | ------------------ |
| `token`   | string | Yes      | API access token   |

### Parameters

| Parameter     | Type    | Required | Default | Description                                                  |
| ------------- | ------- | -------- | ------- | -------------------------------------------------------------- |
| `includeLogs` | boolean | No       | 0       | Set to `1` to include user activity logs                       |
| `logLimit`    | integer | No       | 100     | Number of logs per user (maximum: 1000)                        |
| `startTime`   | integer | No       | —       | Start of time range (Unix timestamp, 10 digits, UTC)            |
| `endTime`     | integer | No       | —       | End of time range (Unix timestamp, 10 digits, UTC)               |

### Behavior

**1. Default mode (latest login only)**

If `includeLogs` is not provided or set to `0`, the API returns all active users and their latest successful login time.

**2. Logs mode (`includeLogs=1`)**

The API returns all active users, their latest successful login time, and a list of activity logs per user.

Log behavior:
- Sorted by latest first
- Limited by `logLimit` (default 100, max 1000)
- Filtered by `startTime` and/or `endTime` if provided

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

**3. Limit logs per user**

```
?token=YOUR_TOKEN&includeLogs=1&logLimit=200
```

**4. Filter logs by date range**

```
?token=YOUR_TOKEN&includeLogs=1&startTime=1751328000&endTime=1754006399
```

**5. Combined example**

```
?token=YOUR_TOKEN&includeLogs=1&logLimit=100&startTime=1751328000&endTime=1754006399
```

### Sample responses

**Without logs**

```json
[
  {
    "userID": "65114c4d304864ec0e0312ec",
    "name": "John Doe",
    "email": "john@example.com",
    "latestLogin_UTC": "2026-07-22 05:34:10"
  },
  {
    "userID": "65114c4d304864ec0e0312ed",
    "name": "New User",
    "email": "new@example.com",
    "latestLogin_UTC": null
  }
]
```

**With logs**

```json
[
  {
    "userID": "65114c4d304864ec0e0312ec",
    "name": "John Doe",
    "email": "john@example.com",
    "latestLogin_UTC": "2026-07-22 05:34:10",
    "logs": [
      {
        "timestamp_UTC": "2026-07-22 05:34:10",
        "description": "People: User: Login Succeeded: John Doe"
      },
      {
        "timestamp_UTC": "2026-07-21 10:12:01",
        "description": "People: User: Role Updated"
      }
    ]
  },
  {
    "userID": "65114c4d304864ec0e0312ed",
    "name": "New User",
    "email": "new@example.com",
    "latestLogin_UTC": null,
    "logs": []
  }
]
```

### Important notes

- All timestamps are returned in **UTC**
- Only logs with `type = systemlog` are included
- Deleted records are excluded
- The API always returns **all active users**
- If a user has no logs (or none within the selected time range): `"logs": []`
- If a user has never logged in: `"latestLogin_UTC": null`

### Log limit design

To ensure stable performance and prevent excessive resource usage, this API enforces limits on the number of logs returned per user:

- Default `logLimit` = 100
- Maximum `logLimit` = 1000
- Unlimited log retrieval is **not supported**

This is because the system contains a large volume of log data. Allowing unrestricted queries could result in excessive memory usage, long response times, or request timeouts. This API is designed to return only the most recent activity logs for each user — for broader analysis, use smaller limits combined with time range filters (`startTime` / `endTime`).

### Performance notes

- Latest login is calculated using aggregation
- Logs are retrieved using indexed per-user queries
- Designed to handle large datasets efficiently without memory issues
