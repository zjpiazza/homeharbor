<!--
*** Best-README-Template structure (https://github.com/othneildrew/Best-README-Template).
*** Roadmap section intentionally omitted until the initial migration completes; the
*** migration itself is tracked in PLAN.md, not here.
-->

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<!-- PROJECT BANNER -->
![Cover](.github/assets/cover.png)

<br />
<div align="center">
  <h3 align="center">HomeHarbor</h3>

  <p align="center">
    Self-hosted property management platform &mdash; tenants, devices, work orders, anomaly detection, all in one place.
    <br />
    <a href="./PLAN.md"><strong>Migration plan &raquo;</strong></a>
    <br />
    <br />
    <a href="https://homeharbor.cloud">Live site</a>
    &middot;
    <a href="https://github.com/zjpiazza/homeharbor/issues/new?labels=bug">Report bug</a>
    &middot;
    <a href="https://github.com/zjpiazza/homeharbor/issues/new?labels=enhancement">Request feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

HomeHarbor is a property management platform: track properties, tenants, reservations, devices, work orders, and AI-driven anomaly detection across a portfolio of homes.

This repository is a greenfield rewrite of the original [`homeharbor2`](https://github.com/zjpiazza/homeharbor2) (Next.js / Vercel / Supabase / Clerk / Inngest Cloud) onto a fully self-hostable stack running in a homelab Kubernetes cluster behind Cloudflare's free tier.

The full migration plan is documented in [PLAN.md](./PLAN.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

**Frontend**
- [Vite](https://vitejs.dev/)
- [React 19](https://react.dev/)
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)

**Backend**
- [Hono](https://hono.dev/)
- [tRPC v11](https://trpc.io/)
- [Prisma](https://www.prisma.io/)
- [better-auth](https://www.better-auth.com/)

**Background jobs**
- [Inngest](https://www.inngest.com/) (self-hosted)

**Authorization**
- [Permit.io](https://www.permit.io/) (PDP self-hosted, policies in Terraform + Rego)

**Data plane**
- [PostgreSQL](https://www.postgresql.org/) via [CloudNativePG](https://cloudnative-pg.io/)
- [Ceph RGW](https://docs.ceph.com/en/latest/radosgw/) S3-compatible object storage via [Rook](https://rook.io/) `ObjectBucketClaim`

**Infrastructure**
- [Talos Linux](https://www.talos.dev/) Kubernetes
- [Flux v2](https://fluxcd.io/) GitOps
- [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) via [`adyanth/cloudflare-operator`](https://github.com/adyanth/cloudflare-operator)
- [Cloudflare Pages](https://pages.cloudflare.com/) (frontend hosting)
- [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age) for in-repo secrets

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local Postgres + dev container builds)

### Installation

```sh
git clone git@github.com:zjpiazza/homeharbor.git
cd homeharbor
pnpm install
cp .env.example .env   # fill in local values
pnpm dev
```

> Detailed local-dev and deployment instructions land here once the Phase 1 scaffold is in place. See [PLAN.md](./PLAN.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

_TBD &mdash; populated once the application is running._

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

This is a personal homelab project; external contributions are not expected. If you find this useful as a reference architecture and want to suggest a fix or improvement, open an issue first to discuss.

1. Fork the project
2. Create your feature branch (`git checkout -b descriptive-branch-name`)
3. Commit your changes &mdash; sentence-case messages, no Conventional Commits prefix
4. Push to the branch (`git push origin descriptive-branch-name`)
5. Open a pull request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Zachary Piazza &mdash; [@zjpiazza](https://github.com/zjpiazza) &mdash; zjpiazza@gmail.com

Project Link: [https://github.com/zjpiazza/homeharbor](https://github.com/zjpiazza/homeharbor)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
- [adyanth/cloudflare-operator](https://github.com/adyanth/cloudflare-operator)
- [CloudNativePG](https://cloudnative-pg.io/)
- [Stefan Prodan's flux2-kustomize-helm-example](https://github.com/fluxcd/flux2-kustomize-helm-example)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/zjpiazza/homeharbor.svg?style=for-the-badge
[contributors-url]: https://github.com/zjpiazza/homeharbor/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/zjpiazza/homeharbor.svg?style=for-the-badge
[forks-url]: https://github.com/zjpiazza/homeharbor/network/members
[stars-shield]: https://img.shields.io/github/stars/zjpiazza/homeharbor.svg?style=for-the-badge
[stars-url]: https://github.com/zjpiazza/homeharbor/stargazers
[issues-shield]: https://img.shields.io/github/issues/zjpiazza/homeharbor.svg?style=for-the-badge
[issues-url]: https://github.com/zjpiazza/homeharbor/issues
[license-shield]: https://img.shields.io/github/license/zjpiazza/homeharbor.svg?style=for-the-badge
[license-url]: https://github.com/zjpiazza/homeharbor/blob/main/LICENSE
