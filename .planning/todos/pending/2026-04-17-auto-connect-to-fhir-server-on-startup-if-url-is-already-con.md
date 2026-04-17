---
created: 2026-04-17T08:07:13.458Z
title: Auto-connect to FHIR server on startup if URL is already configured in settings
area: general
files: []
---

## Problem

When a FHIR server URL is already saved in settings (e.g. `http://localhost:8080/fhir`), the user still has to manually trigger the connection every time the app starts. This is friction for a local-first tool where the server is typically always the same.

## Solution

On app startup, read the configured server URL from settings. If one is present, attempt to connect automatically (e.g. fire the same connect flow that the manual button triggers). Show a subtle status indicator (connecting → connected / failed) so the user can see what happened. Fall back gracefully if the server is unreachable.
