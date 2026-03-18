# SaaS V1 Implementation Plan

## Product Direction

Credential Foundry remains a modern company workspace for onboarding, templates, issuer operations, and public verification.

The product direction has now expanded from "SaaS issuance workspace" to:

- SaaS workspace for credential operations
- Sepolia-anchored verification layer for credential authenticity
- MetaMask-based issuer wallet authorization for issuance and revocation

This means the UI and backend stay important, but the database is no longer the only source of trust.

## Trust Model

### What stays off-chain

- full credential payload
- recipient details
- template field values
- workspace/team/admin data
- search, filtering, and audit UX

### What goes on-chain for v1

- credential identifier
- credential hash
- issuer wallet
- issue timestamp or block reference
- template reference
- revocation status

### Verification rule

A credential should only be treated as authentic when:

1. the stored credential payload hashes to the anchored on-chain value
2. the anchor was written by an approved issuer wallet
3. the credential has not been revoked on-chain
4. the verification page can display the on-chain proof details

## What Stays Here

- company workspace frontend
- login and onboarding flow
- issuer dashboard
- template management
- backend API and persistence
- public verification endpoint and verifier page
- blockchain proof presentation

## Blockchain-Anchored V1 Definition Of Done

V1 is complete when a company can:

1. create an account and sign in
2. create its organization workspace
3. add issuer/team members
4. create credential templates
5. connect an issuer wallet with MetaMask
6. approve which wallet is allowed to issue for an issuer profile
7. issue a credential and anchor its proof on Sepolia
8. revoke a credential and update on-chain status
9. share a public verification link that shows both human-readable credential details and Sepolia proof details
10. detect tampering when the off-chain payload no longer matches the on-chain hash

## Current Reusable Pieces

We can reuse:

- dashboard layout and most CRUD UI patterns
- verifier page shell
- credential/template/issuer service structure in the API
- session and workspace permission model

We have already replaced:

- demo-first routing
- localStorage-only issuer session
- seeded single-company sample data

We still need to improve over time:

- smart contract deployment and wallet authorization flow
- proof-first verification UX
- deeper production persistence and deployment hardening
- post-v1 batching, exports, analytics, and L2 migration

## Status So Far

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

### Phase 5: Launch-Ready SaaS Core

- remove legacy blockchain-first surfaces from the main product
- improve tests
- finalize deployment configuration

Status: completed

Completed in phase 5:

- removed legacy blockchain-first frontend and repo residue from the live product path
- enforced workspace role checks and signed-in issuer identity on protected mutations
- tightened validation and deployment config with origin allowlists and configurable session cookie behavior
- expanded API coverage for permissions and issuer identity rules

### Phase 6: Persistence And Recovery

- Prisma schema for the live workspace entities is added
- the API can run in file mode locally or Postgres mode with `DATABASE_URL`
- invitation resend/revoke management is implemented
- password reset and auth rate limiting are implemented
- frontend tests cover route parsing, password reset entry, and manager-only invite controls

Status: foundation complete, production migration hardening still pending

## New Build Plan: Sepolia Anchor Foundations

### Phase 7: Proof Model And Contract Interface

- freeze the canonical credential payload shape
- define exactly which fields are hashed
- define the Sepolia contract interface for issue and revoke
- define issuer wallet authorization rules
- define the verification response shape used by the public verifier

Status: completed

Deliverables:

- shared trust model documented in code and docs
- contract method/event list agreed
- acceptance criteria for issue, revoke, and verify agreed

### Phase 8: Wallet And Data Model Foundations

- add issuer wallet linkage to the workspace data model
- add on-chain metadata fields to credential records
- add wallet validation and wallet-linking API surface
- add MetaMask connection state in the dashboard
- show issuer wallet status, wrong-network state, and proof readiness in the UI

Status: completed

### Phase 9: Sepolia Issuance And Revocation Flow

- deploy the v1 contract to Sepolia
- issue credentials only after a successful MetaMask-confirmed transaction
- store tx hash, block number, contract address, chain id, and credential hash
- revoke credentials through an on-chain transaction
- sync UI status around pending, confirmed, failed, and revoked anchors

Status: in progress

### Phase 10: Proof-First Verification Experience

- rebuild the verifier around blockchain proof, not database trust alone
- compare off-chain credential payload hash to the on-chain hash
- show issuer wallet, transaction hash, block, network, and contract info
- expose explorer links for Sepolia
- detect and surface tampered or mismatched payloads

Status: pending

### Phase 11: Demo Hardening

- test unauthorized wallet attempts
- test tamper mismatches
- test wrong-network handling
- test revoked credential verification
- prepare a polished demo workspace for walkthroughs and interviews

Status: pending

## Build Checklist

### Milestone A: Foundations

- update docs and definitions of done
- add wallet and proof fields to the data model
- expose wallet metadata in API responses
- render wallet/proof placeholders in the workspace and verifier

### Milestone B: Wallet Flow

- connect MetaMask in the workspace
- link the connected wallet to the signed-in issuer profile
- enforce Sepolia network checks
- display explorer-ready issuer wallet info

### Milestone C: Contract Flow

- deploy contract
- write issue transaction flow
- store anchor metadata after confirmation
- write revoke transaction flow

### Milestone D: Verification

- compute and compare canonical hashes
- fetch on-chain status for the credential
- show proof state and mismatch warnings
- remove any remaining "database alone is truth" messaging

## Explicit Non-Goals For V1

- mainnet deployment
- production L2 deployment
- gas abstraction
- recipient wallet custody
- IPFS-only architecture
- Merkle batching
- zero-knowledge proofs

Those can come later after the Sepolia-backed proof flow is working cleanly.

## Immediate Next Steps

1. deploy the first Sepolia contract from the root Hardhat workspace
2. approve the issuer wallet that will issue credentials in the workspace
3. place the deployed contract address into `apps/web/.env.local` and `apps/api/.env`
4. run a real MetaMask-backed issue and revoke flow on Sepolia
5. tighten the verifier so live on-chain reads become the primary trust signal
