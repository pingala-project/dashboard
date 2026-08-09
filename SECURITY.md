# Security policy

Please do not publish credentials, private data, or an exploitable vulnerability in a public issue.

Until a private security contact is configured for the organization, contact the repository owner through GitHub and include only the minimum reproducible details. Remove secrets from logs and rotate anything that may have been exposed.

The dashboard API never accepts GitHub access tokens from the browser. OAuth secrets and Cloudflare credentials belong in platform secrets, never in the repository or pull-request workflows.
