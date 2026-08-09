# GitHub organization bootstrap

This workspace is the dashboard repository bootstrap. Create the public organization and repositories interactively after signing in to GitHub:

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

After interactive authentication, publish this initialized dashboard repository with:

```sh
gh auth login -h github.com
git add .
git commit -m "Bootstrap Pingala dashboard backend and contribution system"
gh repo create pingala-project/dashboard --public --source=. --remote=origin --push
```

Create the remaining public repositories from GitHub's organization UI, then copy the content tree into `pingala-project/ai-ml` and change `content-lock.json` to the resulting immutable commit SHA. The organization itself must be created and owned interactively; this workspace cannot create it while the GitHub CLI token is expired.
