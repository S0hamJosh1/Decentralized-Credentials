# SaaS V1 Implementation Plan

## Product Direction

This repository is the actual company workspace product. We are not maintaining a seeded demo path inside the live app.

## What Stays Here

- company workspace frontend
- login and onboarding flow
- issuer dashboard
- credential issuing pipeline
- public verification endpoint and verifier page
- backend API and persistence

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

We have already replaced:

- demo-first routing
- localStorage-only issuer session
- seeded single-company sample data

We still need to improve over time:

- deeper production persistence and deployment hardening
- more advanced audit/reporting workflows
- post-v1 operational polish around recovery, exports, and analytics

## Implementation Order

### Phase 1: Remove Seeded Demo Residue

- remove Northstar/sample records from frontend and API
- make the app start from a real company onboarding state
- keep `/verify/:code` public without any demo fallback

Status: completed

### Phase 2: Real Auth

- add users and sessions
- protect workspace routes
- connect users to organizations and roles
- support Google sign-in on top of the same server-backed session model

Status: completed

### Phase 3: Real Workspace Data Model

- support organizations, memberships, templates, issuers, credentials, and credential events
- remove remaining assumptions that one user only ever touches one workspace
- define the next persistence shape for production use

Status: completed

### Phase 4: Credential Pipeline

- template-driven issuance
- company-scoped credential records
- revocation audit trail
- public verification lookup

Status: completed

Completed in phase 4:
- template field schemas and dynamic issue forms
- credential detail views with audit timeline
- public verifier trust context with issued field snapshots
- richer credential filtering and browsing inside the workspace

### Phase 5: Cleanup And Launch Readiness

- remove legacy blockchain-first surfaces from the main product
- improve tests
- finalize deployment configuration

Status: completed

Completed in phase 5:
- removed legacy blockchain-first frontend and repo residue from the live product path
- enforced workspace role checks and signed-in issuer identity on protected mutations
- tightened validation and deployment config with origin allowlists and configurable session cookie behavior
- expanded API coverage for permissions and issuer identity rules

## Immediate Next Steps

1. run the first Prisma migration against Neon and verify the API boots in `database` mode
2. connect real SMTP/email delivery for invitations and password reset
3. add export/reporting and operational admin workflows on top of the hardened core

## Phase 6: Production Persistence And Recovery

- Prisma schema for the live workspace entities is added
- the API can run in file mode locally or Postgres mode with `DATABASE_URL`
- invitation resend/revoke management is implemented
- password reset and auth rate limiting are implemented
- frontend tests now cover route parsing, password reset entry, and manager-only invite controls

Status: in progress
