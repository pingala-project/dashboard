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

The API token is never stored in the repository, `.env`, workflow YAML, or browser. D1 migrations run only from a trusted `main` deployment workflow.
