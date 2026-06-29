# infra — Pulumi (Vercel)

Infrastructure-as-code for the blog's Vercel resources, using the
[`@pulumiverse/vercel`](https://www.pulumi.com/registry/packages/vercel/) provider.
This is **isolated** from the app (its own `package.json`/`tsconfig.json`) and is
optional — the site deploys fine without it.

It currently manages one thing: the `NEXT_PUBLIC_CONVEX_URL` environment variable
on the existing Vercel project, so the talks audience activity can reach Convex.
It looks the project up by name (via a data source) rather than declaring it, so
running Pulumi can never destroy the live project.

> The **Convex** backend (schema, functions, and the `MODERATION_KEY` secret) is
> managed by the Convex CLI, not Pulumi — see below.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/). State can live on the free
  Pulumi Cloud individual tier, or locally with `pulumi login --local`.
- A Vercel API token: <https://vercel.com/account/tokens>.

## Usage

```bash
cd infra
pnpm install

pulumi stack init dev            # first time only

# Auth + inputs
export VERCEL_API_TOKEN=…        # or: pulumi config set vercel:apiToken … --secret
pulumi config set projectName blog
pulumi config set convexUrl https://<your-deployment>.convex.cloud

pulumi preview                   # review
pulumi up                        # apply
```

## Convex (managed separately, by its CLI)

```bash
# from the repo root
npx convex deploy                                  # provisions/updates the backend
npx convex env set MODERATION_KEY <your-secret>    # moderation gate for /activity/manage
```

`npx convex deploy` prints the deployment URL — feed that to `convex config` above
(and to `.env` locally as `NEXT_PUBLIC_CONVEX_URL`).

## Removing IaC

This whole directory is self-contained. To drop Pulumi, `pulumi stack rm` and
delete `infra/` — nothing in the app imports from it.
