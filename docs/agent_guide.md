# Agent Guide

Use this guide when changing `gustavonline`.

## Working Order

1. Read `README.md`.
2. Read `docs/architecture.md`.
3. Read `docs/delivery.md`.
4. Inspect the relevant feature, service, shared contract, and Worker adapter files.
5. Add tests first when changing contracts, service logic, adapters, or bug fixes.
6. Keep the app deployable by running the merge gate before finishing.

## Implementation Rules

- Keep route files thin.
- Put landing page UI in `src/features/landing/components/`.
- Put landing page hooks in `src/features/landing/hooks/`.
- Put browser env reads in `src/config/`.
- Put frontend HTTP details in `src/adapters/http/`.
- Put product workflows in `src/services/`.
- Put shared request and response contracts in `shared/contracts/`.
- Put Worker integrations in `worker/adapters/`.
- Do not add SaaS-only code unless the landing page has a real need for it.

## Test Expectations

Run this before handing work back:

```bash
npm run typecheck
npm run test
npm run build
```

Use focused tests for:

- shared contracts
- email validation and payload normalization
- service behavior
- Worker adapter mapping
- bugs and regressions

Visual-only copy/layout changes do not need TDD, but they still need typecheck and build.

## Review Checklist

- Routes are thin.
- Components do not import infrastructure adapters.
- Worker endpoints validate inputs before external calls.
- Shared contracts have no framework or platform imports.
- New env vars are documented.
- CI still runs `typecheck`, `test`, and `build`.
- Branch target is correct: feature work merges to `dev`; releases merge `dev` to `main`.
