# Pingala Dashboard

The Pingala dashboard is a Vite/React learning interface for the open AI and machine-learning curriculum. Curriculum text is stored as Markdown/YAML under `content/` during the bootstrap phase and is validated into a generated runtime bundle before the app builds.

## Development

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run content:validate
npm run typecheck
npm run typecheck:worker
npm run worker:check
npm run build
npm run lint
```

The local Vite server stays anonymous because Pages Functions are not mounted by Vite. Use `npx wrangler pages dev dist` to exercise the local API and D1 emulator.

## Content workflow

Lesson text lives in `content/courses/<course>/modules/<module>/topics/<topic>/`. Each topic has:

- `metadata.yml` for typed metadata, sources, license, and author attestation;
- `content.md` for safe Markdown, math, code, and callouts;
- `checkpoints.yml` for typed quiz questions.

Run `npm run content:migrate` only when intentionally regenerating the bootstrap content from the legacy TypeScript dataset. Run `npm run content:sync` to materialize the immutable commit configured in `content-lock.json` after the subject repository is split out.

## Backend configuration

The Pages Functions API is in `functions/[[path]].ts` and uses the D1 migration in `migrations/0001_initial.sql`.

Required runtime secrets:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
SESSION_SECRET
```

Before deployment, register the GitHub OAuth callback at `/auth/github/callback`, apply every D1 migration, and configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` in the **Cloudflare Pages project**. GitHub Actions repository secrets are only for the Cloudflare deployment token and account ID; they do not become Pages Functions runtime secrets. See [OPERATIONS.md](OPERATIONS.md).

## Contribution policy

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing curriculum. All content changes are reviewed through GitHub pull requests, with automated schema/security checks and human review for correctness, citations, originality, and author understanding.
