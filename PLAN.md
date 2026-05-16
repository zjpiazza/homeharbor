# HomeHarbor Migration Plan

> Full specification for migrating `homeharbor2` (Next.js / Vercel / Supabase / Clerk / Inngest Cloud) to a self-hosted Kubernetes deployment behind Cloudflare's free tier. This document is the source of truth for the migration; revise as decisions change.

---

## Table of contents

1. [Goal](#goal)
2. [Constraints and conventions](#constraints-and-conventions)
3. [Target architecture](#target-architecture)
4. [Source inventory (what we are migrating from)](#source-inventory-what-we-are-migrating-from)
5. [Locked decisions](#locked-decisions)
6. [Repositories and their boundaries](#repositories-and-their-boundaries)
7. [Phase 0 &mdash; Homelab infrastructure PRs](#phase-0--homelab-infrastructure-prs)
8. [Phase 1 &mdash; HomeHarbor monorepo bootstrap](#phase-1--homeharbor-monorepo-bootstrap)
9. [Phase 2 &mdash; Feature ports](#phase-2--feature-ports)
10. [Phase 3 &mdash; Frontend hosting and DNS](#phase-3--frontend-hosting-and-dns)
11. [Phase 4 &mdash; Cutover and decommission](#phase-4--cutover-and-decommission)
12. [Secrets management](#secrets-management)
13. [Environment variables reference](#environment-variables-reference)
14. [Risks and watch items](#risks-and-watch-items)
15. [Open items (not blockers)](#open-items-not-blockers)
16. [Glossary](#glossary)

---

## Goal

Greenfield rewrite of HomeHarbor (a property management / device monitoring / anomaly detection app) that:

- Runs entirely on a self-hosted homelab Kubernetes cluster.
- Costs $0/month in recurring services (Cloudflare free tier only on the public side).
- Decouples from vendor-locked services (Vercel hosting, Supabase DB+Storage+Auth, Clerk auth, Inngest Cloud).
- Preserves full feature parity with `homeharbor2`.
- Uses GitOps (Flux v2) for everything in-cluster.

---

## Constraints and conventions

### Process

- One PR per logical unit (one operator, one feature port, one chart change).
- Sentence-case commit messages. **No** Conventional Commits prefix (no `feat:`, `fix:`, etc).
- Branch names are descriptive: `add-permit-pdp`, `port-anomaly-reports`, `swap-image-model`. No prefix taxonomy.
- Server-side dry-run all CRDs and HelmReleases against the live cluster before opening PRs.

### Secrets

- All secrets are SOPS-encrypted in repo. `path_regex: .+\.sops\.yaml$`; only `data` and `stringData` fields encrypted.
- age recipient: `age105q796d973wvg0p3t4m0yfdqwzpztvvhj6v9gyllfywd3cdcvd5q9vwu2n`.
- age private key on the operator's machine at `~/.config/sops/age/keys.txt` (mode 600). **Must be backed up.**
- Cluster decryption Secret `sops-age` lives in `flux-system` namespace.
- **Never** `cat`/`grep`/`echo` plaintext secret files. Pipe directly into `sops -e`. Mask values when validating.

### Code style

- Linter/formatter: Biome (single tool, fast).
- Type checking: `tsc --build` across the workspace.
- Testing: Vitest.
- Package manager: pnpm with workspaces.

### Repo boundaries

- Cluster-wide infrastructure manifests live in [`zjpiazza/homelab`](https://github.com/zjpiazza/homelab).
- App code, app-specific manifests (CNPG `Cluster`, `ObjectBucketClaim`, `Tunnel`, `TunnelBinding`s) live in this repo's `chart/` directory.
- Mixed-style apps in homelab: some manifests in `apps/base/<app>/`, others reference external charts via `OCIRepository` + `HelmRelease`. HomeHarbor uses the OCI chart pattern.

---

## Target architecture

```
                                ┌──────────────────────┐
                Internet ──────►│ Cloudflare (free)    │
                                │ ─ DNS                │
                                │ ─ Pages (web SPA)    │
                                │ ─ Tunnel ingress     │
                                └──────────┬───────────┘
                                           │ cloudflared
                                           ▼
   ┌──────────────────────────────────────────────────────────────┐
   │                Talos K8s cluster (homelab)                   │
   │                                                              │
   │  ┌────────────────────────┐    ┌────────────────────────┐    │
   │  │ cloudflare-operator    │    │ cert-manager           │    │
   │  │ (PR #7)                │    │ (PR #6)                │    │
   │  └────────────────────────┘    └────────────────────────┘    │
   │                                                              │
   │  ┌──────────────────────── homeharbor namespace ──────────┐  │
   │  │                                                        │  │
   │  │   Tunnel ─┬─► TunnelBinding ─► api Service ─► api pods │  │
   │  │           │                                            │  │
   │  │   CNPG Cluster (homeharbor-pg) ──────────► Postgres    │  │
   │  │                                                        │  │
   │  │   ObjectBucketClaim (homeharbor-storage) ──► Ceph RGW  │  │
   │  │                                                        │  │
   │  │   Worker Deployment ─────────────► Inngest fn registry │  │
   │  │                                                        │  │
   │  └────────────────────────────────────────────────────────┘  │
   │                                                              │
   │  ┌────────────────────────┐    ┌────────────────────────┐    │
   │  │ inngest namespace      │    │ permit-pdp namespace   │    │
   │  │  ─ inngest server      │    │  ─ pdp Deployment      │    │
   │  │  ─ inngest-pg CNPG     │    │  ─ Secret w/ API key   │    │
   │  └────────────────────────┘    └────────────────────────┘    │
   │                                                              │
   │  ┌────────────────────────┐    ┌────────────────────────┐    │
   │  │ rook-ceph (S3 + RBD)   │    │ cnpg-operator          │    │
   │  └────────────────────────┘    └────────────────────────┘    │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

**Hostname plan** (single Cloudflare zone `homeharbor.cloud`):
- `homeharbor.cloud` &mdash; static SPA on Cloudflare Pages (apex)
- `api.homeharbor.cloud` &mdash; api Service via Cloudflare Tunnel
- `inngest.homelab.internal` &mdash; internal-only, no public DNS

Each app gets its own namespaced `Tunnel` CR (one CF tunnel per app per zone). Per the multi-domain policy: future apps will own their own zones and tunnels.

---

## Source inventory (what we are migrating from)

### `homeharbor2` repo at `/home/d3adb0y/code/homeharbor2`

**Stack**
- Next.js 15 (App Router) on Vercel
- Clerk (auth)
- Supabase (Postgres + Storage + auth-adjacent)
- Inngest Cloud (background jobs + realtime SSE)
- Permit.io Cloud (authorization)
- Prisma + Postgres (10 models)
- tRPC v11 + TanStack Query
- Tailwind 4 + shadcn/ui (Radix)
- React Three Fiber (3D house animation feature)

**Prisma models** (`prisma/schema.prisma`, 536 lines, 10 models)
1. `Property`
2. `Device`
3. `Event`
4. `Reservation`
5. `WorkOrder`
6. `DeviceReading`
7. `AnomalyDetectionJob`
8. `AnomalyReport`
9. `AnomalyReportFinding`
10. `Tenant`

**Feature areas** (each is a directory under `src/features/`)
- `anomaly-reports` &mdash; tRPC router, jobs (`detect-anomalies`, `resolve-anomaly`, `schedule-detection`)
- `auth` &mdash; Clerk wiring
- `dashboards`
- `devices` &mdash; tRPC router, anomaly detection trigger
- `events` &mdash; tRPC router
- `house-animation` &mdash; 3D React Three Fiber components
- `properties` &mdash; tRPC router
- `reservations` &mdash; tRPC router
- `roles` &mdash; tRPC router
- `storage` &mdash; tRPC router (Supabase Storage abstraction)
- `tenants` &mdash; tRPC router, `create-tenant` job pipeline (4+ steps), realtime SSE for creation status
- `users` &mdash; tRPC router
- `work-orders` &mdash; tRPC router

**Inngest functions** (5 distinct)
1. `src/inngest/functions/anomalyResolution.ts` &mdash; `resolveAnomalyFn`
2. `src/features/anomaly-reports/jobs/detect-anomalies/detectAnomaliesForProperty.ts` &mdash; `detectAnomaliesForPropertyFn`
3. `src/features/anomaly-reports/jobs/resolve-anomaly/resolveAnomalyFinding.ts` &mdash; `resolveAnomalyFindingFn`
4. `src/features/anomaly-reports/jobs/schedule-detection/scheduleAnomalyDetection.ts` &mdash; `scheduleAnomalyDetectionFn` (cron)
5. `src/features/tenants/jobs/create-tenant/index.ts` &mdash; `createTenantAndSeedFn` (multi-step: tenant-setup → user-setup → role-setup → finalization, with property image generation via OpenAI)

**Realtime** &mdash; `useTenantCreationState` hook subscribes via `@inngest/realtime/hooks`, gets a token from a tRPC procedure (`getSubscriptionToken`).

**App router pages** (`src/app/`)
- `/` (dashboard)
- `/anomaly-reports` and `/anomaly-reports/[id]`
- `/devices` and `/devices/[id]`
- `/events`
- `/house` (3D animation)
- `/properties` and `/properties/[id]`
- `/reservations` and `/reservations/[id]`
- `/users`
- `/work-orders`
- `/api/inngest` (Inngest's webhook-style serve handler)

**Env vars referenced in code**
- `CLERK_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `PERMIT_API_KEY`
- `PERMIT_PDP_URL`
- `INTERNAL_REQUEST_SECRET`
- `AGENT_IDENTITY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_URL`, `PORT`, `NODE_ENV`

**Permit policies**
- `terraform/permit/` &mdash; resources, roles, relations, derivations (TF-managed in Permit Cloud)
- External repo: [`zjpiazza/homeharbor-policies`](https://github.com/zjpiazza/homeharbor-policies) &mdash; Rego policies for OPA-style fine-grained logic

---

## Locked decisions

| Topic | Decision | Notes |
|---|---|---|
| Hosting | Self-hosted homelab K8s + Cloudflare free tier | $0/month |
| Frontend | Vite + React 19 + TanStack Router (pure SPA on Pages) | No Next.js |
| Backend | Hono + tRPC v11 in K8s | Behind Cloudflare Tunnel |
| Auth | better-auth, fresh start | No Clerk user migration |
| DB | CloudNativePG `Cluster` per app (own one for HomeHarbor, separate one for Inngest) | No Supabase data migration |
| Storage | Rook-Ceph RGW via `ObjectBucketClaim` | S3-compatible; no Supabase storage migration |
| Background jobs | Self-hosted Inngest (`inngest/inngest` OSS) | Zero job code rewrite; preserves SSE realtime |
| Authorization | Permit.io with self-hosted PDP in cluster | Terraform + Rego policies port as-is |
| AI image gen | `gpt-image-1` (replaces `dall-e-3`) | Already verified key has access |
| AI text analysis | `gpt-4o` via `@ai-sdk/openai` | Unchanged |
| Frontend hosting | Cloudflare Pages | apex `homeharbor.cloud` |
| Backend hostname | `api.homeharbor.cloud` via CF Tunnel | Per-app namespaced `Tunnel` CR |
| Tunnel topology | Namespaced `Tunnel` per app, not `ClusterTunnel` | Each app owns its own zone |
| Environments | Prod only initially | Staging deferred |
| Helm chart | Lives in `chart/` here, published to `oci://ghcr.io/zjpiazza/charts/homeharbor` on tag, consumed by Flux via `OCIRepository` + `HelmRelease.chartRef` | |
| Multi-env values | Stefan Prodan pattern: base `HelmRelease` + per-env Kustomize overlay generates ConfigMap + Secret from `values.yaml` + SOPS `values-secrets.sops.yaml` (`spec.valuesFrom`) | Deferred until staging is added |
| Monorepo tooling | pnpm workspaces, Biome, Vitest, tsc | |
| Image automation | Flux image-reflector + image-automation controllers | Phase 0a |
| Old repo fate | Delete `homeharbor2` after cutover verified | |

---

## Repositories and their boundaries

### `zjpiazza/homelab` (cluster-wide infra)
- Flux entrypoint, all operators, cluster-wide config
- All `infrastructure/controllers/*` (cilium, rook-ceph, cnpg-operator, cert-manager, cloudflare-operator, etc)
- Per-app glue: `apps/base/homeharbor/` and `apps/envs/prod/homeharbor/` (just the `OCIRepository` + `HelmRelease` + env-specific values + SOPS values secret)
- The shared CF API token Secret in `cloudflare-operator-system`

### `zjpiazza/homeharbor` (this repo)
- Application code: `apps/web` (SPA), `apps/api` (Hono+tRPC), `apps/worker` (Inngest fn registry)
- Shared code: `packages/shared`
- Helm chart: `chart/` &mdash; templates for `Deployment`(s), `Service`, CNPG `Cluster`, `ObjectBucketClaim`, `Tunnel`, `TunnelBinding`(s), generated `Secret`/`ConfigMap`
- Schema: `prisma/`
- Permit authority: `terraform/permit/` (and reference to `zjpiazza/homeharbor-policies` for Rego)
- GitHub Actions: chart publish, image builds, Pages deploy

### `zjpiazza/homeharbor-policies` (external)
- Rego policies for Permit.io (synced to Permit Cloud independently)

---

## Phase 0 &mdash; Homelab infrastructure PRs

Order matters: each builds on the previous. All in `zjpiazza/homelab`.

### PR 0a &mdash; Add Flux image automation

**Branch**: `add-flux-image-automation`
**Path**: `infrastructure/controllers/flux-image-automation/`
**Files**:
- `kustomization.yaml` &mdash; references the official Flux components manifest pinned to a Flux release tag, scopes to `flux-system` namespace
- (Possibly nothing else; the components manifest is self-contained)

**What it installs**:
- `image-reflector-controller` Deployment
- `image-automation-controller` Deployment
- Their CRDs: `ImageRepository`, `ImagePolicy`, `ImageUpdateAutomation`

**What it does NOT do**: no per-app `ImageRepository` / `ImagePolicy` / `ImageUpdateAutomation` resources. Those land per-app in `apps/`.

**Validation**:
- `kubectl kustomize` against rendered output (server-side via mrfreeze)
- `kubectl apply --dry-run=server` of rendered manifests
- Post-merge: confirm both controller pods Ready in `flux-system`

**Risk**: Zero. Controllers idle until app-side resources reference them.

---

### PR 0b &mdash; Add Permit PDP

**Branch**: `add-permit-pdp`
**Path**: `infrastructure/controllers/permit-pdp/`
**Files**:
- `namespace.yaml` &mdash; `permit-pdp` namespace
- `permit-pdp-secret.sops.yaml` &mdash; SOPS-encrypted Secret with `PERMIT_API_KEY`
- `permit-pdp-deployment.yaml` &mdash; runs `permitio/pdp:latest` (or pinned tag), reads `PDP_API_KEY` from Secret, exposes 7000
- `permit-pdp-service.yaml` &mdash; ClusterIP Service `permit-pdp.permit-pdp.svc.cluster.local:7000`
- `kustomization.yaml`

**Token**: `PERMIT_TOKEN` from `~/code/homeharbor2/.env` (validated 2026-05-15: HTTP 200 from `/v2/api-key/scope`, environment-scoped key with org_id / project_id / environment_id).

**Apps consume it via** the env var `PERMIT_PDP_URL=http://permit-pdp.permit-pdp.svc.cluster.local:7000` injected into the api Deployment.

**Validation**:
- Server-side dry-run before push
- Post-merge: `kubectl logs deploy/permit-pdp -n permit-pdp` shows policy sync from Permit Cloud succeeded

**Risk**: Low. New namespace, new Deployment. No existing workloads touched.

---

### PR 0c &mdash; Add self-hosted Inngest

**Branch**: `add-inngest`
**Path**: `infrastructure/controllers/inngest/`
**Files**:
- `namespace.yaml` &mdash; `inngest` namespace
- `inngest-pg-cluster.yaml` &mdash; CNPG `Cluster` named `inngest-pg` (1 instance, 5Gi `ceph-block` PVC, dedicated to Inngest)
- `inngest-secret.sops.yaml` &mdash; SOPS-encrypted Secret with:
  - `INNGEST_EVENT_KEY` (random 32-byte hex; generated locally)
  - `INNGEST_SIGNING_KEY` (random 32-byte hex; generated locally)
  - `POSTGRES_URI` &mdash; sourced from CNPG-generated `inngest-pg-app` Secret via Kustomize generator? Or hard-wired? **Decision**: use a separate `valueFrom: secretKeyRef` on the Inngest Deployment instead of duplicating it in this Secret.
- `inngest-deployment.yaml` &mdash; runs `inngest/inngest:v1.19.4` in `start` mode against the CNPG cluster
- `inngest-service.yaml` &mdash; ClusterIP `inngest.inngest.svc.cluster.local:8288`
- `kustomization.yaml`

**Verify before merging**: that `@inngest/realtime` SSE token API works against the OSS server. The OSS server claims feature parity but realtime is a newer feature; if it fails, fallback is the `@inngest/realtime` polling mode (small UX degradation, no code rewrite).

**Apps consume it via**:
- `INNGEST_BASE_URL=http://inngest.inngest.svc.cluster.local:8288`
- `INNGEST_EVENT_KEY` from the Inngest secret (or app-side mirror)
- `INNGEST_SIGNING_KEY` from the Inngest secret (or app-side mirror)

**Validation**:
- Server-side dry-run
- Post-merge: Inngest pod Ready, dashboard reachable via `kubectl port-forward`, register a test app from local dev pointed at this URL

**Risk**: Medium. Realtime SSE feature parity is the open question. Roll-forward path is documented above.

---

## Phase 1 &mdash; HomeHarbor monorepo bootstrap

All in `zjpiazza/homeharbor` unless noted.

### PR 1a &mdash; Repo skeleton

**Branch**: `add-repo-skeleton`
**Files**:
```
package.json                      # root, workspaces only
pnpm-workspace.yaml
pnpm-lock.yaml
tsconfig.base.json
biome.json
.gitignore
.nvmrc                            # node 20
.env.example
apps/
  web/                            # placeholder package.json + src/main.tsx
  api/                            # placeholder package.json + src/index.ts
  worker/                         # placeholder package.json + src/index.ts
packages/
  shared/                         # placeholder package.json + src/index.ts
.github/
  workflows/
    ci.yml                        # type-check + lint + test on PR
    image-api.yml                 # build+push api image to ghcr on main
    image-worker.yml              # build+push worker image to ghcr on main
    chart-publish.yml             # publish chart on tag v* to ghcr OCI
    pages-deploy.yml              # build apps/web, deploy to CF Pages on main
LICENSE                           # MIT
```

**Notes**:
- `apps/web` initialised with Vite + React 19 + TanStack Router minimal config
- `apps/api` initialised with Hono + tRPC v11 hello-world handler
- `apps/worker` initialised with Inngest serve handler hosting zero functions (yet)
- `packages/shared` initialised with placeholder export of an empty Zod schema and tRPC router type stub
- All apps wire up tsconfig project references; root `tsc -b` succeeds

**Validation**: `pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm test` all pass locally and in CI.

---

### PR 1b &mdash; Helm chart skeleton

**Branch**: `add-helm-chart`
**Path**: `chart/`
**Files**:
```
chart/
  Chart.yaml
  values.yaml
  templates/
    _helpers.tpl
    api-deployment.yaml
    api-service.yaml
    worker-deployment.yaml
    cluster.yaml                  # CNPG Cluster
    objectbucketclaim.yaml        # OBC for Ceph RGW
    tunnel.yaml                   # cloudflare-operator Tunnel CR
    tunnelbinding.yaml            # one or more TunnelBindings
    secret.yaml                   # generated from Helm valuesFrom (values-secrets via Flux)
    configmap.yaml                # non-secret env
```

**`values.yaml` shape** (top-level keys):
- `image.api`, `image.worker` &mdash; `repository`, `tag`, `pullPolicy`
- `domain` &mdash; e.g. `homeharbor.cloud`
- `apiHost` &mdash; e.g. `api.homeharbor.cloud`
- `cloudflare.accountId`, `cloudflare.email`, `cloudflare.secretRef` (default `cloudflare-secrets` in `cloudflare-operator-system`)
- `database.size`, `database.instances`
- `storage.bucketName`
- `inngest.baseUrl` &mdash; default `http://inngest.inngest.svc.cluster.local:8288`
- `permit.pdpUrl` &mdash; default `http://permit-pdp.permit-pdp.svc.cluster.local:7000`
- `secrets` &mdash; `{}` (filled by env-specific SOPS values-secrets in homelab repo)

**Validation**:
- `helm template` against `values.yaml` produces clean output
- `helm lint`
- Server-side dry-run of rendered output against live cluster (will fail on missing CRDs locally; succeeds via mrfreeze)

---

### PR 1c &mdash; Port Prisma schema

**Branch**: `add-prisma-schema`
**Path**: `prisma/`
**Files**:
- `schema.prisma` &mdash; copied verbatim from `homeharbor2/prisma/schema.prisma`
- `migrations/` &mdash; **fresh** initial migration generated against the new CNPG cluster (no migration history from the old repo)
- `seed.ts` &mdash; minimal seed for local dev

**Notes**:
- The 10 models (Property, Device, Event, Reservation, WorkOrder, DeviceReading, AnomalyDetectionJob, AnomalyReport, AnomalyReportFinding, Tenant) port as-is.
- Drop any Supabase-specific `@@schema` directives if present.
- Drop the `prisma-erd-generator` and `prisma-markdown` generators unless we want them in the new repo (decision: keep ERD generator, drop markdown for now).
- `@permitio/permit-prisma` and `@permitio/prisma-permit` extensions: keep, they wire row-level Permit checks into Prisma.

---

### PR 1d &mdash; apps/api skeleton

**Branch**: `add-api-skeleton`
**Files** (all under `apps/api/`):
```
src/
  index.ts                        # Hono app, mount tRPC at /trpc, mount Inngest serve at /api/inngest
  trpc.ts                         # tRPC init: createContext, t.procedure, etc
  context.ts                      # auth + Permit + db context
  routers/
    index.ts                      # appRouter with hello-world only
  auth/
    better-auth.ts                # better-auth instance, prisma adapter
    middleware.ts                 # session middleware
  db.ts                           # prisma client singleton
  inngest/
    client.ts                     # Inngest client pointing at INNGEST_BASE_URL
    functions/
      index.ts                    # empty array, populated as features port
  permit/
    client.ts                     # permitio client pointing at PERMIT_PDP_URL
  storage/
    s3.ts                         # @aws-sdk/client-s3 against OBC-provided creds
  env.ts                          # zod-validated env loader
package.json
tsconfig.json
Dockerfile                        # multi-stage, distroless final
```

**Routes mounted**:
- `POST /trpc/*` &mdash; tRPC handler
- `GET|POST|PUT /api/inngest` &mdash; Inngest serve
- `GET /healthz` &mdash; liveness
- `GET /readyz` &mdash; readiness (db ping + permit ping)

---

### PR 1e &mdash; apps/web skeleton

**Branch**: `add-web-skeleton`
**Files** (all under `apps/web/`):
```
src/
  main.tsx                        # createRouter, RouterProvider, QueryClientProvider, AuthProvider
  router.tsx                      # TanStack Router config
  routes/
    __root.tsx                    # layout: nav, theme provider
    index.tsx                     # landing/dashboard
    sign-in.tsx
    sign-up.tsx
  trpc/
    client.ts                     # @trpc/react-query setup
  auth/
    client.ts                     # better-auth React client
    hooks.ts
  components/                     # shadcn/ui base components ported as-needed
  styles/
    globals.css
  env.ts                          # vite env (VITE_API_URL, etc)
index.html
vite.config.ts
package.json
tsconfig.json
```

**Built artifact**: a static SPA in `apps/web/dist/` deployed to Cloudflare Pages.

---

### PR 1f &mdash; Register HomeHarbor in homelab repo

**Repo**: `zjpiazza/homelab`
**Branch**: `add-homeharbor-app`
**Files**:
```
apps/base/homeharbor/
  namespace.yaml
  ocirepository.yaml              # source.toolkit.fluxcd.io/v1 OCIRepository pointing at ghcr.io/zjpiazza/charts/homeharbor
  helmrelease.yaml                # base HelmRelease (ref: latest semver)
  kustomization.yaml
apps/envs/prod/homeharbor/
  kustomization.yaml              # patches HelmRelease via patchesStrategicMerge
  values.yaml                     # prod-specific non-secrets
  values-secrets.sops.yaml        # SOPS Secret with OPENAI_API_KEY, INTERNAL_REQUEST_SECRET, BETTER_AUTH_SECRET, etc
  kustomizeconfig.yaml            # if needed for Secret name reference
clusters/homelab/apps.yaml        # add homeharbor Kustomization
```

**Secrets that land here** (in `values-secrets.sops.yaml`):
- `OPENAI_API_KEY` &mdash; from `~/code/homeharbor2/.env` `OPENAI_TOKEN` (validated 2026-05-15: HTTP 200 `/v1/models`, gpt-image-1 + gpt-4o accessible)
- `BETTER_AUTH_SECRET` &mdash; generated `openssl rand -hex 32`
- `INTERNAL_REQUEST_SECRET` &mdash; generated `openssl rand -hex 32`
- `INNGEST_EVENT_KEY` &mdash; mirror of the value in PR 0c
- `INNGEST_SIGNING_KEY` &mdash; mirror of the value in PR 0c
- `PERMIT_API_KEY` &mdash; mirror of PR 0b's value (apps need their own copy for SDK init even when calling the local PDP)

**At end of Phase 1**: empty shell of HomeHarbor running in cluster. Reachable at `api.homeharbor.cloud/healthz` returning 200. SPA returns "Hello world" at `homeharbor.cloud`.

---

## Phase 2 &mdash; Feature ports

Each PR is one feature area, scoped to: tRPC router(s), pages, components, jobs, schemas. All in `zjpiazza/homeharbor`.

### Porting matrix

For each feature: what's ported, what's reused, what changes.

| PR | Feature | tRPC routers | Pages | Inngest jobs | Notable swaps |
|---|---|---|---|---|---|
| 2a | **auth** | n/a (better-auth handles) | sign-in, sign-up, password-reset, profile | none | Clerk → better-auth |
| 2b | **tenants** | `tenants/api/router.ts` | (no top-level page; embedded) | `createTenantAndSeedFn` (4 steps + property image gen sub-step) | Clerk SDK → better-auth, Inngest cloud → self-hosted, `dall-e-3` → `gpt-image-1`, Supabase Storage → Ceph RGW |
| 2c | **devices** | `devices/api/router.ts` | `/devices`, `/devices/[id]` | trigger from `triggerAnomalyDetection` procedure | Supabase storage swaps |
| 2d | **anomaly-reports** | `anomaly-reports/api/router.ts` | `/anomaly-reports`, `/anomaly-reports/[id]` | `detectAnomaliesForPropertyFn`, `resolveAnomalyFindingFn`, `scheduleAnomalyDetectionFn` (cron), `resolveAnomalyFn` | `@ai-sdk/openai` against gpt-4o (unchanged), Inngest endpoint swap |
| 2e | **storage** | `storage/api/router.ts` | n/a | n/a | Supabase Storage SDK → `@aws-sdk/client-s3` against Ceph RGW, presigned URLs via S3 SDK |
| 2f | **properties** | `properties/api/router.ts` | `/properties`, `/properties/[id]` | none | Supabase storage swaps |
| 2g | **reservations** | `reservations/api/router.ts` | `/reservations`, `/reservations/[id]` | none | |
| 2h | **work-orders** | `work-orders/api/router.ts` | `/work-orders` | none | |
| 2i | **events** | `events/api/router.ts` | `/events` | none | |
| 2j | **users** | `users/api/router.ts` | `/users` | none | Clerk user listing → better-auth user listing |
| 2k | **roles** | `roles/api/router.ts` | n/a | none | |
| 2l | **dashboards** | n/a | `/` (landing dashboard) | none | |
| 2m | **house-animation** | n/a | `/house` | none | React Three Fiber components port as-is; assets in `public/` move to `apps/web/public/` |
| 2n | **Permit policies** | n/a | n/a | n/a | Port `terraform/permit/` as-is. Re-link `homeharbor-policies` repo. |

### Per-PR template

For each Phase 2 PR:

1. **Branch**: `port-<feature>`
2. **Pre-port checklist**:
   - Read all files under `homeharbor2/src/features/<feature>/`
   - Read corresponding `src/app/<feature>/` pages
   - Identify all env vars used; ensure they're in PR 1f's secret set
   - Identify all Permit calls; verify resource/role exists in `terraform/permit/`
3. **Port steps**:
   - Move tRPC router into `apps/api/src/routers/<feature>.ts`, register in `routers/index.ts`
   - Move Inngest functions into `apps/worker/src/functions/<feature>/`, register in worker's serve handler
   - Move React components into `apps/web/src/features/<feature>/`
   - Move pages to `apps/web/src/routes/<feature>/`
   - Replace Clerk imports with better-auth equivalents
   - Replace Supabase Storage with our `s3.ts` client
   - Replace `@clerk/nextjs/server` `auth()` calls with better-auth session reads
4. **Validation**:
   - `pnpm typecheck` clean
   - `pnpm test` passes (including any new feature tests)
   - Manual smoke test: hit each tRPC procedure via the SPA's UI in local dev (api in docker-compose, web at `pnpm dev`)
5. **Bump chart version** in `chart/Chart.yaml` (patch version).
6. **Tag chart release** via GH Action: `git tag chart-v0.0.X && git push --tags` triggers `chart-publish.yml`.

---

## Phase 3 &mdash; Frontend hosting and DNS

### PR 3a &mdash; Cloudflare Pages deploy action

**Repo**: `zjpiazza/homeharbor`
**Branch**: `add-pages-deploy`
**Files**:
- `.github/workflows/pages-deploy.yml` &mdash; on push to `main`, build `apps/web`, `wrangler pages deploy apps/web/dist --project-name=homeharbor`
- Pages project created via dashboard or `wrangler pages project create homeharbor` (one-time)
- Pages custom domain bound: `homeharbor.cloud` (apex)

**Secrets needed in repo**: `CLOUDFLARE_API_TOKEN` (the same `cfut_` token), `CLOUDFLARE_ACCOUNT_ID`.

### PR 3b &mdash; Bind api.homeharbor.cloud

**Repo**: `zjpiazza/homeharbor` (chart)
**Branch**: `bind-api-hostname`
**Files**:
- Verify `chart/templates/tunnel.yaml` produces a `Tunnel` CR for zone `homeharbor.cloud`
- Verify `chart/templates/tunnelbinding.yaml` binds `api.homeharbor.cloud` → `api Service:80`
- Bump chart version, tag, publish

After Flux reconciles, the tunnel registers with CF, DNS automatically populated by cloudflare-operator, traffic routes.

---

## Phase 4 &mdash; Cutover and decommission

1. Smoke test prod end-to-end on `homeharbor.cloud`:
   - Sign up a new user
   - Create a tenant (verifies Inngest pipeline + realtime SSE)
   - Add a property + device
   - Trigger anomaly detection
   - Resolve an anomaly
   - Upload an image (verifies Ceph RGW)
2. Delete `homeharbor2` repo (per locked decision).
3. Cancel paid services:
   - Vercel project (if on paid plan)
   - Supabase project (if it still exists)
   - Clerk org (if exists)
   - Inngest Cloud account
4. Confirm $0/month billing.

---

## Secrets management

### Where secrets live (final state)

| Secret | Repo | File | K8s Secret name | Namespace |
|---|---|---|---|---|
| Cloudflare API token | homelab | `infrastructure/controllers/cloudflare-operator/cloudflare-secrets.sops.yaml` | `cloudflare-secrets` | `cloudflare-operator-system` |
| age key (private) | none (machine only) | `~/.config/sops/age/keys.txt` | n/a | n/a |
| age decryption | homelab | manually created out-of-band | `sops-age` | `flux-system` |
| Permit API key (operator) | homelab | `infrastructure/controllers/permit-pdp/permit-pdp-secret.sops.yaml` | `permit-pdp` | `permit-pdp` |
| Inngest event/signing keys | homelab | `infrastructure/controllers/inngest/inngest-secret.sops.yaml` | `inngest` | `inngest` |
| HomeHarbor app secrets | homelab | `apps/envs/prod/homeharbor/values-secrets.sops.yaml` | `homeharbor-secrets` (generated by HelmRelease `valuesFrom`) | `homeharbor` |
| CNPG generated DB creds | n/a | n/a (CNPG generates) | `homeharbor-pg-app`, `homeharbor-pg-superuser` | `homeharbor` |
| OBC generated S3 creds | n/a | n/a (Rook generates from OBC) | `homeharbor-storage` | `homeharbor` |

### Validation procedure

Each new secret token must be validated against the provider's auth-check endpoint before encryption. Pattern:

```bash
set -a; source ~/code/homeharbor2/.env; set +a
curl -sS -o /tmp/check.json -w 'http=%{http_code}\n' \
  -H "Authorization: Bearer $TOKEN_VAR" \
  https://provider.example.com/v1/whoami
# Inspect with python -c 'json.load(...)' to see structure WITHOUT printing secrets
```

Encryption:
```bash
sops -e -i path/to/secret.sops.yaml
```

`sops` honors `.sops.yaml` recipient + path regex automatically.

---

## Environment variables reference

Final consolidated list of env vars the app expects, where they come from, and which Phase introduces them.

| Var | Source | Phase | Notes |
|---|---|---|---|
| `DATABASE_URL` | CNPG `homeharbor-pg-app` Secret | 1f | injected via `valueFrom` |
| `BETTER_AUTH_SECRET` | values-secrets | 1f | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | values | 1f | `https://api.homeharbor.cloud` |
| `INTERNAL_REQUEST_SECRET` | values-secrets | 1f | `openssl rand -hex 32` |
| `PERMIT_API_KEY` | values-secrets | 1f | from `homeharbor2/.env` `PERMIT_TOKEN` |
| `PERMIT_PDP_URL` | values | 1f | `http://permit-pdp.permit-pdp.svc.cluster.local:7000` |
| `INNGEST_BASE_URL` | values | 1f | `http://inngest.inngest.svc.cluster.local:8288` |
| `INNGEST_EVENT_KEY` | values-secrets | 1f | mirror of PR 0c |
| `INNGEST_SIGNING_KEY` | values-secrets | 1f | mirror of PR 0c |
| `OPENAI_API_KEY` | values-secrets | 1f | from `homeharbor2/.env` `OPENAI_TOKEN`; `gpt-image-1` + `gpt-4o` |
| `S3_ENDPOINT` | values | 1f | `http://rook-ceph-rgw-ceph-objectstore.rook-ceph.svc:80` |
| `S3_BUCKET` | OBC-generated ConfigMap | 1f | injected via `valueFrom` |
| `S3_ACCESS_KEY_ID` | OBC-generated Secret | 1f | injected via `valueFrom` |
| `S3_SECRET_ACCESS_KEY` | OBC-generated Secret | 1f | injected via `valueFrom` |
| `S3_REGION` | values | 1f | `us-east-1` (irrelevant for Ceph but SDK requires it) |
| `S3_FORCE_PATH_STYLE` | values | 1f | `true` (Ceph requires path-style) |
| `AGENT_IDENTITY` | values | 1f | retain pattern from old repo for Permit checks |
| `NODE_ENV` | values | 1f | `production` |
| `PORT` | values | 1f | `3000` |

**Removed** vs `homeharbor2`: `CLERK_*`, `NEXT_PUBLIC_SUPABASE_*`, `VERCEL_URL`.

---

## Risks and watch items

| # | Risk | Mitigation |
|---|---|---|
| R1 | `@inngest/realtime` SSE token API may not work against OSS Inngest server | Verify in PR 0c. Fallback: switch to polling mode (no code changes, slight UX latency). |
| R2 | Ceph RGW S3 quirks with `aws-sdk-js v3` (multipart, ACL handling) | Smoke test in Phase 2e. Set `S3_FORCE_PATH_STYLE=true`. |
| R3 | `@permitio/permit-prisma` extension may not work with Prisma 6.x | Verify in PR 1c. Fallback: drop the extension, do explicit Permit checks at the tRPC procedure level. |
| R4 | Cloudflare Pages free-tier limits (500 builds/mo, 100k requests/day, 25 MB asset size) | Monitor via CF dashboard. Path B if exceeded: switch SPA hosting to in-cluster nginx behind a Tunnel. |
| R5 | Better-auth's Prisma adapter may not match the exact schema we want for users/sessions | Audit better-auth's expected schema vs ours in PR 1d. May need migration. |
| R6 | CNPG WAL storage on `ceph-block` may have IOPS cliffs under load | Monitor; bump CNPG `storage.size` and request guarantees if needed. |
| R7 | Per-app Tunnel topology means N apps = N cloudflared pods (overhead) | Acceptable for now (we have one app). Revisit if many apps share one zone in future. |
| R8 | Cutover requires DNS apex for `homeharbor.cloud` to point at Pages, not Tunnel; Tunnel only handles `api.*` | Document in Phase 3. CF Pages auto-binds to apex when configured. |
| R9 | The age key is the universal decryption key for all in-cluster secrets. Loss = total re-encryption burden. | Backup procedure: explicit user TODO. |

---

## Open items (not blockers)

- **Cluster observability** &mdash; deferred. Plan to add Prometheus + Grafana + Loki post-migration.
- **Backups** &mdash; CNPG `Backup` to S3 (Ceph RGW) once everything's in. Defer until post-Phase-4.
- **Staging environment** &mdash; deferred per locked decision. The Stefan Prodan multi-env pattern is laid out so adding `apps/envs/staging/homeharbor/` later is mechanical.
- **Preview environments per PR** &mdash; deferred. Future portfolio project: `flux-preview-controller` (notes at `~/projects/flux-preview-controller/NOTES.md`).
- **Sentry / error tracking** &mdash; deferred.
- **CDN for user-uploaded images** &mdash; defer; serve via signed S3 URLs through API initially.
- **better-auth providers beyond email/password** &mdash; decide later (Google OAuth?).

---

## Glossary

- **Flux v2** &mdash; GitOps controller. Watches a Git repo, reconciles cluster state to match.
- **Kustomization** &mdash; either the in-Flux CR (`kustomize.toolkit.fluxcd.io/v1`) or the kustomize.io concept (`kustomization.yaml` file).
- **HelmRelease** &mdash; Flux CR for declaratively managing Helm chart installs.
- **OCIRepository** &mdash; Flux source pointing at an OCI artifact registry (we publish charts as OCI artifacts to ghcr.io).
- **CNPG** &mdash; CloudNativePG, the operator that manages Postgres clusters in K8s.
- **OBC** &mdash; ObjectBucketClaim, Rook CR that provisions an S3 bucket and creds.
- **PDP** &mdash; Permit's Policy Decision Point; the in-cluster service that evaluates authorization checks.
- **SOPS** &mdash; Mozilla's secrets management tool; encrypts/decrypts YAML/JSON with one of several KMSes (we use age).
- **age** &mdash; modern public-key encryption, used as the SOPS backend.
- **Tunnel / TunnelBinding** &mdash; `adyanth/cloudflare-operator` CRDs. `Tunnel` registers a CF tunnel + runs a `cloudflared` pod; `TunnelBinding` maps a hostname → in-cluster Service.
- **CR** &mdash; Custom Resource (instance of a CRD).
- **CRD** &mdash; CustomResourceDefinition.
