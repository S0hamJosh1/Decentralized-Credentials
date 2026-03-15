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

We still need to remove or heavily refactor:

- advanced registry / contract tooling in the main app path
- remaining single-workspace assumptions inside the product model
- invite/team lifecycle beyond the initial owner account

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

1. expand the workspace data model beyond the initial owner/company bootstrap
2. finish the production credential pipeline and issuer/team workflows
3. remove the remaining blockchain-first UI from the main workspace experience
