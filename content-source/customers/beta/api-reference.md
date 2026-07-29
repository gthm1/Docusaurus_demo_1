---
title: API Reference
customer: beta
visibility: public
sidebar_position: 2
---

# API Reference — Beta Industries

## Authentication

All requests require your Beta-issued API key in the `X-API-Key` header.

## Endpoints

### `GET /v1/devices`

Returns the list of Xmesh gateways and XVision cameras registered to your account.

### `GET /v1/telemetry/{device_id}`

Returns recent telemetry for a given device.

### `POST /v1/alerts/subscribe`

Subscribe a webhook URL to receive alert notifications.
