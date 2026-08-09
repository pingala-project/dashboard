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
7. Configure GitHub OAuth with callback `/auth/github/callback` and store the client ID/secret as Cloudflare secrets.
8. Create a D1 database, replace the placeholder ID in `wrangler.jsonc`, then run the migration workflow.
9. Add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` only as deployment/runtime secrets.

The `.github` files in this repository can seed the organization-level community-health repository. Subject repositories should reuse the same content workflow and carry their own CODEOWNERS file.

The dashboard is pushed to `pingala-project/dashboard`; curriculum is pinned in `content-lock.json` to the reviewed `ai-ml` commit and its checksum. The organization profile and reusable workflows live in `pingala-project/.github`, and the static landing page lives in `pingala-project/landing`.

## Remaining account credentials

GitHub OAuth App registration and Cloudflare API-token creation are intentionally interactive account actions. Create a GitHub OAuth App with:

```text
Homepage URL: https://pingala-dashboard.pages.dev
Authorization callback URL: https://pingala-dashboard.pages.dev/auth/github/callback
```

Then configure these dashboard repository secrets without committing them:

```sh
gh secret set GITHUB_CLIENT_ID --repo pingala-project/dashboard
gh secret set GITHUB_CLIENT_SECRET --repo pingala-project/dashboard
gh secret set SESSION_SECRET --repo pingala-project/dashboard
gh secret set CLOUDFLARE_ACCOUNT_ID --repo pingala-project/dashboard
gh secret set CLOUDFLARE_API_TOKEN --repo pingala-project/dashboard
```

The first three prompts accept the OAuth client values and a freshly generated random session secret. The Cloudflare token should be limited to the Pingala account's Pages deployment and D1 migration permissions.
