---
created: 2026-04-17T08:07:13.458Z
title: Find a way to import MII Synthea example data into a running Blaze FHIR server
area: tooling
files: []
---

## Problem

UAT and manual testing require a Blaze instance with realistic FHIR data. Currently there is no documented or scripted way to seed a local Blaze server with MII-conformant example data, making it hard to reproduce UAT conditions or onboard new contributors.

The MII Kerndatensatz community publishes Synthea-based example datasets (sometimes called "syntea" or MII Synthea) that conform to MII profiles — these are the right test data for this project's use case.

## Solution

Research and document (or script) the steps to:

1. Locate the MII Synthea example dataset (likely https://github.com/medizininformatik-initiative/mii-synthea or similar).
2. Download the FHIR Bundle files.
3. Import them into a running Blaze server via its FHIR REST API (`POST /fhir` with `Content-Type: application/fhir+json` or batch Bundle upload, or Blaze's bulk-import endpoint if available).
4. Verify the import worked (patient count, resource type coverage).

Ideal output: a single shell script or `npm run seed` command that seeds a fresh Blaze instance reproducibly. Document in README or a `docs/seeding.md`.
