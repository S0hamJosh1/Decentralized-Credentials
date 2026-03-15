# Credential Foundry Workspace

The company workspace for issuing trusted digital certificates, managing issuer teams, and sharing public verification links.

## What is in the repo

- `Credentials_FE/`: workspace frontend for company onboarding, issuer operations, and public verification
- `services/api/`: Express API for organization settings, issuer access, templates, credential records, revocation, and verification lookup
- `cd_var/`: legacy Hardhat contract prototype and registry tooling slated for removal from the core product path
- `docs/`: product direction notes and implementation plans

## Current product surfaces

- `/`: workspace entry point for company sign-in and onboarding
- `/app`: workspace dashboard alias
- `/verify/:code`: public verification portal

## Local development

### Frontend

```bash
cd Credentials_FE
npm install
npm run dev
```

### API

```bash
cd services/api
npm install
npm run dev
```

The Vite frontend proxies `/api` and `/health` to `http://localhost:4000` during local development.

Set these frontend environment variables when you deploy the workspace:

- `VITE_API_BASE_URL`: absolute URL for the deployed API, such as `https://api.yourdomain.com`
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID for Google sign-in

Set this API environment variable when you want Google sign-in enabled:

- `GOOGLE_CLIENT_ID`: the same Google OAuth client ID accepted by the backend for ID token verification

## Tests

### Frontend route helper tests

```bash
cd Credentials_FE
npm test
```

### API tests

```bash
cd services/api
npm test
```

### Contract tests

```bash
cd cd_var
npm install
npm test
```

If `hardhat` is missing, install the contract dependencies in `cd_var/` first.

## Product notes

- The current product direction is a workspace SaaS for companies, not a blockchain-first demo.
- The seeded Northstar/demo workspace has been removed from the live product path.
- The app now uses real API-backed authentication with users, memberships, and secure sessions.
- Google sign-in can now create or access a workspace account when the Google OAuth client ID is configured on both the frontend and API.
- The API now persists organizations, users, memberships, sessions, issuers, templates, credentials, and credential events.
- Team access now supports invitation links, invite acceptance, and multi-workspace sessions with workspace switching.
- Templates and issuers now have lifecycle controls, and the workspace dashboard shows a recent activity feed for audit visibility.
- The public verifier shows issuer identity, status, and revocation details.
- The next major milestone is expanding the tenant-aware data model and finishing the production credential pipeline.

## License

MIT
