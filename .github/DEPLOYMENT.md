# Deployment

Workflow `deploy.yml` has two automatic paths:

- a push to `dev` builds and deploys only `ghcr.io/<owner>/<repository>:dev` through the GitHub Environment `dev`;
- publishing a GitHub Release with a semver tag such as `v1.2.3` deploys through `production` and publishes the tags `1.2.3`, `1.2`, and `latest`. The server deploy always uses the exact `1.2.3` tag.

Every image tag is published as a multi-platform manifest for `linux/amd64` and `linux/arm64`.

Create both GitHub Environments in the repository settings. Add an approval rule to `production` if production deploys must be confirmed manually.

## Environment secrets

Define these secrets separately in `dev` and `production`:

- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `SSH_PORT`
- `GHCR_USER`
- `GHCR_TOKEN` — a token with permission to read the private GHCR package

## Environment variables

Define these variables separately in `dev` and `production`:

- `CONTAINER_NAME` — for example `film-front-dev` or `film-front`
- `APP_PORT` — host port forwarded to container port `3000`
- `API_URL`
- `SOCKET_URL`
- `GOOGLE_CLIENT_ID`
- `COOKIE_ACCESS_TOKEN_EXP`
- `COOKIE_REFRESH_TOKEN_EXP`
- `SITE_URL`
- `LEGAL_EMAIL`
- `YANDEX_METRIKA_ID`

The workflow supplies `NUXT_PUBLIC_DEPLOYMENT_ENVIRONMENT` automatically:
`dev` for the pre-production deployment and `production` for a release. Search
indexing is enabled only for the exact `production` value. Every other value
returns a global `X-Robots-Tag`, blocks all crawling in `robots.txt`, and does
not publish a sitemap.

The host must have Docker installed, and the SSH user must be allowed to run Docker commands. TLS and routing to `APP_PORT` remain the responsibility of the host reverse proxy. [`nginx.example.conf`](../nginx.example.conf) contains a ready-to-adapt Nginx server block; its upstream port must match `APP_PORT`.

The frontend quality job runs the SSR SEO check after the production build. It
verifies the public route allowlist, canonical and OpenGraph URLs, JSON-LD,
private-route `X-Robots-Tag`, `robots.txt`, and both production and dev sitemap
behavior.

A manual production run requires `environment=production` and an existing `release_tag`. It rebuilds and deploys that tag; normal production deployments should be started by publishing a GitHub Release.
