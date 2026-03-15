# SaaS V1 Implementation Plan

## Product Split

We are building two separate surfaces:

- `workspace app`: the actual company product for sign-in, onboarding, templates, issuers, issuance, records, revocation, and verification management
- `demo site`: a public-facing marketing and demo experience that can live in a separate repository and deployment

This repository should now become the `workspace app` repository.

## What Stays Here

- company workspace frontend
- login and onboarding flow
- issuer dashboard
- credential issuing pipeline
- public verification endpoint and verifier page
- backend API and persistence

## What Moves Out

- marketing homepage
- explainer/demo pages
- demo storytelling around seeded sample data
- any blockchain-first experience that is not required for the SaaS workflow

## Workspace V1 Definition Of Done

V1 is complete when a company can:

1. create an account and sign in
2. create its organization workspace
3. add issuer/team members
4. create credential templates
5. issue credentials to recipients
6. search and review issued credentials
7. revoke a credential with a reason
8. share a public verification link that shows issuer, organization, issue date, and status

## Current Reusable Pieces

We can reuse:

- dashboard layout and most CRUD UI patterns
- verifier page
- credential/template/issuer service structure in the API

We should replace or heavily refactor:

- demo-first routing
- localStorage-only issuer session
- single-organization flat JSON database model
- advanced registry / contract tooling in the main app path

## Implementation Order

### Phase 1: Repo Split

- make `/` the workspace entry point
- keep `/verify/:code` in this repo
- remove marketing/demo from the live app flow
- update README and product copy so this repo is clearly the workspace product

### Phase 2: Real Auth

- add users and sessions
- protect workspace routes
- connect users to organizations and roles

### Phase 3: Real Workspace Data Model

- support organizations, memberships, templates, issuers, credentials, and credential events
- move away from the single seeded organization model

### Phase 4: Credential Pipeline

- template-driven issuance
- company-scoped credential records
- revocation audit trail
- public verification lookup

### Phase 5: Cleanup And Launch Readiness

- remove legacy blockchain-first surfaces from the main product
- improve tests
- finalize deployment configuration

## Immediate Next Steps

1. make this repo workspace-first
2. extract the demo site into its own repo later from the existing marketing/verifier assets
3. implement real auth and tenant-aware persistence next
