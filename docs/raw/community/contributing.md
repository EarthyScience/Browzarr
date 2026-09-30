# Contributing

> How to contribute to Browzarr.

## Where things live

- Main application: [EarthyScience/Browzarr](https://github.com/EarthyScience/Browzarr) (Next.js + TypeScript, rendering with Three.js/R3F and WebGPU)
- Julia launcher: [EarthyScience/Browzarr.jl](https://github.com/EarthyScience/Browzarr.jl)
- This documentation site: `docs/` in the main repo, built with [Docus](https://docus.dev)

## Setting up the docs site

```bash
cd docs
npm install
npm run dev
```

The site runs at `http://localhost:3000`. Pages are Markdown (MDC) under `docs/content/`; the sidebar order is controlled by file numbering and each section's `.navigation.yml`.

## Reporting issues

When reporting a bug, please include:

- Browser and OS version
- The store URL (or a minimal local reproducer)
- Console/network errors, especially CORS failures

## Submitting changes

1. Fork and create a feature branch
2. Run linting and the test suite (`vitest`)
3. Open a PR with a short description and, for UI changes, screenshots

## Contributing datasets

To add a curated catalog entry, open a PR editing `src/assets/catalogs/` (`ZarrCatalog.ts` / `IcechunkCatalog.ts`) with a `key`, `label`, `subtitle`, and `store` URL. Verify the store allows CORS from the app origin.
