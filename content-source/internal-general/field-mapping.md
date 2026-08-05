---
title: Xmesh Data Field Mapping
visibility: internal
sidebar_position: 3
---

# Xmesh Data Field Mapping

Reference for how Xmesh sensor and device data is structured across AlphaX Cloud's data collections. Use this when writing queries, debugging a customer's data pipeline, or building integrations.

## enterprise collection

Use this for the organization/site hierarchy.

- `_id` — entity ID
- `type` — record type, usually `entity`
- `name` — entity name
- `parent` — parent entity ID
- `prefix` — entity prefix/code
- `assetClass` — asset class ID

**How to use it**

To find the entity for a sensor/device, read `sources.siteid`, then match that to `enterprise._id`.

## sources collection

For the sensor, the important record types are:

- `device`
- `gateway`
- `virtualV2`

### A. Main source fields

- `_id` — source ID
- `type` — `device`, `gateway`, or `virtualV2`
- `name` — source name
- `siteid` — owning entity ID
- `tag` — asset tag
- `networkID` — network key used for data and lookups
- `channel` — channel object keyed by channel number

### B. Channel fields

Each `channel.<chid>` entry can contain:

- `channelID` — channel number
- `description` — channel description
- `type` — sensor type ID
- `calibration` — calibration factor
- `offset` — calibration offset

**How to use it**

- Get the entity a sensor/device belongs to: `sources.siteid` → `enterprise._id`
- Get the channel description: `sources.channel.<chid>.description`
- Get the sensor type: `sources.channel.<chid>.type`
- Get calibrated value: `raw_value * calibration + offset`

## timeseries collection

This is where the readings live.

- `netId` — device `networkID`
- `chId` — channel number
- `date` — time bucket
- `data` — array of readings

Each `data[]` item contains:

- `val` — raw reading
- `ts` — timestamp for the reading

**How to use it**

- Get sensor data using: `timeseries.netId = sources.networkID` and `timeseries.chId = channel number`
- The newest reading is the latest `data.ts`

## Sensor type lookup

If you have a channel's type ID:

1. Read `sources.channel.<chid>.type`
2. Use that ID to fetch the matching lookup document in `sources`
3. Use the returned record for the sensor type name and unit

## Common lookups

- **Entity for a sensor/device**: `sources.siteid` → `enterprise._id`
- **Sensor data by device and channel**: `timeseries.netId` + `timeseries.chId`
- **Sensor type from channel**: `sources.channel.<chid>.type` → `sources._id`
- **Channel name**: `sources.channel.<chid>.description`
- **Latest reading**: most recent `timeseries.data.ts`
