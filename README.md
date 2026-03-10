# Credential Foundry

A business credential platform for issuing trusted digital certificates, sharing proof links, and verifying authenticity without requiring a wallet from the verifier.

## What is in the repo

- `Credentials_FE/`: single frontend surface with routed marketing pages, public verifier, and issuer workspace
- `services/api/`: Express API for organization settings, issuer access, templates, credential records, revocation, and verification lookup
- `cd_var/`: legacy Hardhat contract prototype and registry tooling
- `docs/`: product direction notes and repurposing writeup

## Current product surfaces

- `/`: marketing homepage
- `/how-it-works`: product workflow page
- `/use-cases`: target use cases and customer framing
- `/trust`: trust and verification model page
- `/verify/:code`: public verification portal
- `/app`: issuer dashboard

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

- The API is now organization-aware and persists organization settings plus credential revocation metadata.
- The public verifier shows issuer identity, status, and revocation details.
- The legacy registry tools still exist in the issuer app as advanced utilities while the business workflow matures.

## License

MIT
