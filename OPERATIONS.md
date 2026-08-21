# Pingala operations runbook

The dashboard deploys from `main`. Pull requests run content and application checks without deployment secrets. Cloudflare credentials are only used by trusted GitHub Actions workflows.

## Authenticate GitHub without a browser

Create a GitHub token with the minimum repository and organization permissions needed for the owner account, save it in a protected local file, then run these commands separately:

```sh
gh auth login --hostname github.com --git-protocol https --with-token < /absolute/path/to/github-pat.txt
gh auth status --hostname github.com
```

Never commit the token file or paste its contents into a command, issue, or pull request.

## Authenticate Wrangler without a browser

`wrangler login` is not required for CI. Use a replacement Cloudflare API token interactively in a local shell:

```sh
read -s CLOUDFLARE_API_TOKEN
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID="<cloudflare-account-id>"
npx wrangler whoami
```

The token should be scoped to the Pingala account with Cloudflare Pages edit access. Revoke any token that has been exposed in chat before creating the replacement.

## Configure GitHub Actions secrets

```sh
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo pingala-project/dashboard
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo pingala-project/landing
gh secret set CLOUDFLARE_ACCOUNT_ID --repo pingala-project/dashboard --body "$CLOUDFLARE_ACCOUNT_ID"
gh secret set CLOUDFLARE_ACCOUNT_ID --repo pingala-project/landing --body "$CLOUDFLARE_ACCOUNT_ID"
```

`CLOUDFLARE_API_TOKEN` needs only **Account → Cloudflare Pages → Edit** for the Pingala account. The API token is never stored in the repository, `.env`, workflow YAML, or browser.

## Configure the D1 migration credential

Use a separate token with only **Account → D1 → Edit**, scoped to the same Cloudflare account. This secret is used exclusively by the trusted dashboard migration workflow.

```sh
read -s CLOUDFLARE_D1_API_TOKEN
export CLOUDFLARE_D1_API_TOKEN
printf '%s' "$CLOUDFLARE_D1_API_TOKEN" | gh secret set CLOUDFLARE_D1_API_TOKEN --repo pingala-project/dashboard
```

D1 migrations run only from a trusted `main` workflow.

## Configure the Pages runtime for GitHub login

The following values must be stored in the Cloudflare Pages project itself; GitHub Actions repository secrets cannot be read by Pages Functions. Set the GitHub OAuth App callback URL to `https://pingala-dashboard.pages.dev/auth/github/callback` (or update `PUBLIC_APP_ORIGIN` and the OAuth App together if using a custom domain).

```sh
export GITHUB_CLIENT_ID="<oauth-client-id>"
read -s GITHUB_CLIENT_SECRET
export GITHUB_CLIENT_SECRET
SESSION_SECRET="$(openssl rand -hex 32)"

printf '%s' "$GITHUB_CLIENT_ID" | npx wrangler pages secret put GITHUB_CLIENT_ID --project-name=pingala-dashboard
printf '%s' "$GITHUB_CLIENT_SECRET" | npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=pingala-dashboard
printf '%s' "$SESSION_SECRET" | npx wrangler pages secret put SESSION_SECRET --project-name=pingala-dashboard
```

After setting the replacement deployment token as the two GitHub Actions secrets above, run `Apply D1 migrations` and then `Deploy dashboard to Cloudflare Pages` from `main`.

## Harden branch protection (owner, one-time)

Apply these to **both** `pingala-project/dashboard` and the subject repository (`pingala-project/ai-ml`). The required status checks below match the workflows in `.github/workflows/`.

```sh
gh api repos/pingala-project/dashboard/rulesets 2>/dev/null || true
# Classic branch protection for main (idempotent PUT):
gh api -X PUT repos/pingala-project/dashboard/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Dashboard CI / validate", "Security checks / CodeQL", "Content review gate / New lesson approvals"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true,
    "require_last_push_approval": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Key settings and why they matter:

- `enforce_admins: true` — without it, admins bypass every rule above.
- `require_last_push_approval: true` — the exact commit that merges was reviewed by a person.
- `Content review gate / New lesson approvals` — machine-enforces the two-approval policy for new lessons (see `content-review-gate.yml`).

Enable secret scanning and push protection org-wide (**Settings → Code security**), so credentials can never be pushed to any Pingala repository.

## PR preview deployments

Every pull request automatically gets a live preview:

1. `PR build` builds the bundle in an unprivileged run (no secrets available to forks).
2. `Deploy PR preview` runs via `workflow_run` in the base repository, downloads the artifact, and deploys it with `wrangler pages deploy --branch=preview-pr-<number>`.
3. A bot comment posts the preview URL (`https://preview-pr-<number>.pingala-dashboard.pages.dev`) and updates it on every push.

Reviewers should check rendered lessons, embeds, and media on the preview before approving. Previews expire with their artifacts (7 days).

## Rate limiting

The Pages Function enforces fixed-window limits backed by D1 (`rate_limits` table, migration `0004_rate_limits.sql`):

- Auth endpoints (`/auth/github`, `/auth/github/callback`): 10 requests/min per IP → HTTP 429.
- Authenticated mutations (notes, progress sync, profile/settings): 60 requests/min per user → HTTP 429.

The limiter fails open if the table is missing; apply migrations before deploying.
