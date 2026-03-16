# Credential Foundry Workspace

The company workspace for issuing trusted digital certificates, managing issuer teams, and sharing public verification links.

## What is in the repo

- `apps/web/`: workspace frontend for company onboarding, issuer operations, and public verification
- `apps/api/`: Express API for organization settings, issuer access, templates, credential records, revocation, and verification lookup
- `docs/`: product direction notes and implementation plans

## Current product surfaces

- `/`: workspace entry point for company sign-in and onboarding
- `/app`: workspace dashboard alias
- `/verify/:code`: public verification portal

## Local development

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

### API

```bash
cd apps/api
npm install
npm run dev
```

The Vite frontend proxies `/api` and `/health` to `http://localhost:4000` during local development.

## Environment variables

Copy the example files if you want a local starting point:

```bash
copy apps\web\.env.example apps\web\.env.local
copy apps\api\.env.example apps\api\.env
```

Set these frontend environment variables for `apps/web`:

- `VITE_API_BASE_URL`: absolute URL for the deployed API, such as `https://api.yourdomain.com`
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID for Google sign-in

Set these API environment variables for `apps/api`:

- `DATABASE_URL`: Neon Postgres connection string for Prisma
- `GOOGLE_CLIENT_ID`: the same Google OAuth client ID accepted by the backend for ID token verification
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins allowed to call the API in production
- `SESSION_COOKIE_SAME_SITE`: optional cookie policy override, such as `lax` or `none`
- `SESSION_COOKIE_SECURE`: optional `true` or `false` override for the session cookie secure flag
- `PUBLIC_APP_URL`: optional canonical frontend URL used in password reset emails
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`: optional email delivery config for invitation and password reset emails

## Neon + Prisma

The API now supports two persistence modes:

- `file`: local fallback when `DATABASE_URL` is not set
- `database`: Prisma-backed Postgres when `DATABASE_URL` is set

Recommended setup:

1. Create a Neon database.
2. Put the Neon connection string into `apps/api` as `DATABASE_URL`.
3. Run Prisma migrations from `apps/api`:

```bash
cd apps/api
npm run prisma:migrate:dev -- --name init
```

4. Deploy the API with that same `DATABASE_URL`.

The `/health` endpoint now reports the active storage mode.

## Vercel deployment

Deploy this repo as two separate Vercel projects:

1. Web project
   Root directory: `apps/web`
2. API project
   Root directory: `apps/api`

Frontend project env vars:

- `VITE_API_BASE_URL=https://your-api-project.vercel.app`
- `VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com`

API project env vars:

- `DATABASE_URL=postgresql://...`
- `GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com`
- `CORS_ALLOWED_ORIGINS=https://your-web-project.vercel.app`
- `PUBLIC_APP_URL=https://your-web-project.vercel.app`
- `SESSION_COOKIE_SAME_SITE=none`
- `SESSION_COOKIE_SECURE=true`

The API project includes a Vercel serverless entrypoint in `apps/api/api/index.js`.

## Tests

### Frontend tests

```bash
cd apps/web
npm test
```

### API tests

```bash
cd apps/api
npm test
```

## Product notes

- The current product direction is a workspace SaaS for companies, not a blockchain-first demo.
- The seeded Northstar/demo workspace has been removed from the live product path.
- The app now uses real API-backed authentication with users, memberships, and secure sessions.
- Google sign-in can now create or access a workspace account when the Google OAuth client ID is configured on both the frontend and API.
- The API now persists organizations, users, memberships, sessions, issuers, templates, credentials, and credential events.
- Team access now supports invitation links, invite acceptance, and multi-workspace sessions with workspace switching.
- Templates and issuers now have lifecycle controls, and the workspace dashboard shows a recent activity feed for audit visibility.
- Templates can now define credential-specific fields, issuance is driven by that schema, and issued credentials have a detail view with field snapshots and audit timeline.
- The credential records screen now supports search, status/template/issuer/date filters, sorting, and richer field previews.
- The public verifier now shows issuer identity, organization trust context, issued field snapshots, and revocation-aware audit details.
- Workspace permissions are now enforced in the API: managers handle settings and access, and credential issuance/revocation runs through the signed-in approved issuer identity.
- Invitations now support resend/revoke management, and password reset is available with optional email delivery plus a local preview URL when SMTP is not configured.
- Prisma and Neon-ready Postgres support are now wired into the API while preserving local file-mode development.
- Legacy blockchain-first UI and repo residue has been removed from the live product path.

## License

MIT
