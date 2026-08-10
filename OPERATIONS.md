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
