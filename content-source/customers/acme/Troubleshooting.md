---
title: Troubleshooting
visibility: public
customer: acme
sidebar_position: 4
---



# Troubleshooting — Acme Corp

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
    { "id": "gw-0192", "type": "xmesh_gateway", "status": "online" },
    { "id": "cam-0044", "type": "xvision_camera", "status": "online" }
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

## Gateway showing offline

1. Check the physical status LED — solid blue means connected, blinking amber means it's searching for a network
2. Confirm the gateway has line-of-sight to nearby end devices (see diagram below)
3. Re-run the diagnostic request above and check the `status` field for that device

![Gateway placement diagram](/img/undraw_docusaurus_mountain.svg)

:::tip Still stuck?
If the gateway still shows offline after a power cycle, check the **Installation Guide** page for mounting requirements, or reach out via your account contact.
:::

## Rate limits by plan tier

Your request allowance depends on your AlphaX Cloud plan:

* **Starter** — 60 requests/minute
* **Growth** — 300 requests/minute
* **Enterprise** — custom, contact your account manager

> Rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included on every response — check these before implementing your own retry logic.
