---
title: Troubleshooting
visibility: public
customer: gamma
sidebar_position: 2
---


# Troubleshooting — Gamma Corp

If your API requests are failing or your Xmesh devices appear offline, work through the checks below before contacting support.

## Quick diagnostic request

Run this against the devices endpoint to confirm your API key is valid and your account can see its registered devices:

```bash
curl -X GET https://api.minnovation.com.au/v1/devices \
  -H "X-API-Key: your-api-key-here"
```

A healthy response looks like this:

```json
{
  "devices": [
    { "id": "gw-0001", "type": "xmesh_gateway", "status": "online" }
  ]
}
```

:::danger Never share your API key
Do not paste your API key into client-side code, public repositories, or support tickets. If a key is exposed, rotate it immediately from your AlphaX Cloud workspace under **Settings → API Keys**.
:::

## Common error codes

| Code  | Meaning                    | What to do                                                            |
| ----- | -------------------------- | --------------------------------------------------------------------- |
| `401` | Invalid or missing API key | Confirm the `X-API-Key` header is set and the key hasn't been rotated |
| `404` | Device ID not found        | Double-check the device ID against your AlphaX Cloud dashboard        |
| `429` | Rate limit exceeded        | Back off and retry; default limit is 60 requests/minute               |
| `500` | Internal server error      | Retry with exponential backoff; contact support if it persists        |
