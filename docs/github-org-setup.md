# GitHub organization bootstrap

The public organization and repositories are now provisioned:

```text
pingala-project/.github
pingala-project/landing
pingala-project/dashboard
pingala-project/ai-ml
```

Recommended organization settings:

1. Keep the default member permission at **Read**.
2. Restrict repository creation to owners.
3. Require two-factor authentication for members.
4. Create `maintainers`, `curriculum-reviewers`, and `ai-ml-reviewers` teams.
5. Give reviewer teams write access only where CODEOWNERS requires them; contributors use forks.
6. Protect `main` with required CI checks, required CODEOWNER approval, stale-review dismissal, resolved conversations, and no force pushes.
7. Configure GitHub OAuth with callback `/auth/github/callback` and store the client ID/secret as **Cloudflare Pages project secrets**.
8. Create a D1 database, replace the placeholder ID in `wrangler.jsonc`, then run the migration workflow.
9. Add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_D1_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions repository secrets. Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` as Cloudflare Pages project secrets.

The `.github` files in this repository can seed the organization-level community-health repository. Subject repositories should reuse the same content workflow and carry their own CODEOWNERS file.

The dashboard is pushed to `pingala-project/dashboard`; curriculum is pinned in `content-lock.json` to the reviewed `ai-ml` commit and its checksum. The organization profile and reusable workflows live in `pingala-project/.github`, and the static landing page lives in `pingala-project/landing`.

## Remaining account credentials

GitHub OAuth App registration and Cloudflare API-token creation are intentionally interactive account actions. Create a GitHub OAuth App with:

```text
Homepage URL: https://pingala-dashboard.pages.dev
Authorization callback URL: https://pingala-dashboard.pages.dev/auth/github/callback
```

Then configure the GitHub Actions repository secrets used only by trusted deployment workflows:

```sh
gh secret set CLOUDFLARE_ACCOUNT_ID --repo pingala-project/dashboard
gh secret set CLOUDFLARE_API_TOKEN --repo pingala-project/dashboard
gh secret set CLOUDFLARE_D1_API_TOKEN --repo pingala-project/dashboard
```

Configure the OAuth values in the Pages project with Wrangler instead; repository secrets are not available to Pages Functions at runtime:

```sh
printf '%s' "$GITHUB_CLIENT_ID" | npx wrangler pages secret put GITHUB_CLIENT_ID --project-name=pingala-dashboard
printf '%s' "$GITHUB_CLIENT_SECRET" | npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=pingala-dashboard
printf '%s' "$SESSION_SECRET" | npx wrangler pages secret put SESSION_SECRET --project-name=pingala-dashboard
```

Use separate least-privilege Cloudflare tokens: `CLOUDFLARE_API_TOKEN` needs Account → Cloudflare Pages → Edit; `CLOUDFLARE_D1_API_TOKEN` needs Account → D1 → Edit. Both must be scoped to the account identified by `CLOUDFLARE_ACCOUNT_ID`.
