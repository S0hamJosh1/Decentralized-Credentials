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

The old marketing/demo experience should be split into its own repository and deployment.

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
- The API currently persists organization settings plus credential revocation metadata.
- The public verifier shows issuer identity, status, and revocation details.
- The next major milestone is replacing demo/local auth with real user accounts and organization membership.

## License

MIT
