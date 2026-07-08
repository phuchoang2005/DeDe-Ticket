# Frontend Conventions

Quick reference for the Next.js frontend. Authoritative style lives in
[`docs/engineering/coding-standards.md`](../docs/engineering/coding-standards.md) §3.

## Folder layout

```
app/                 Next.js App Router routes (one folder per URL segment)
  <route>/page.tsx   the route's assembly component — data hook + layout only
  <route>/_hooks/    page-local hooks (data loading, form state)
  <route>/_components/  page-local presentational components
  _components/, _hooks/  home-page-local pieces (app root)
components/ui/        shared, cross-page primitives (KpiCard, Badge, Alert, Stepper…)
components/layout/    app chrome (Header, DesktopNav, MobileDrawer, Footer, NavLink)
components/icons/     inline SVG icons
hooks/               shared hooks (useAsync, usePolling, usePagination)
services/            API layer: apiClient + http + one file per domain; api.ts is a barrel
store/               React context (AuthContext)
types/               shared domain types mirroring backend DTOs
utils/               pure helpers (format, chart, chartColors, datetime)
```

`_`-prefixed folders are ignored by the App Router, so page-local hooks/components
colocate next to the `page.tsx` that uses them.

## Rules of thumb

- **Keep files small and single-purpose.** Target ~30–60 lines for logic files; JSX
  components may run longer but should render one cohesive thing. The ESLint
  `max-lines` rule warns past 120 (blank lines/comments excluded) as a safety net.
- **Pages assemble, they don't compute.** A `page.tsx` wires a data hook to
  presentational components. Push fetch/`setInterval`/form state into a `_hooks/` hook
  (or the shared `hooks/`); push repeated markup into a component.
- **Reuse the primitives.** Before writing an inline card/badge/stepper/alert, check
  `components/ui/`. Before writing `.then().catch().finally()`, check `hooks/useAsync`.
- **API calls go through `services/`.** Import call functions from `@/services/api`
  (or a specific domain module). Never call axios/`fetch` from a component, and never
  hardcode the API URL — it resolves via `apiClient`.
- **Types come from `@/types`.** Don't redeclare domain shapes inline.

## Tooling

```bash
npm run lint          # next lint + max-lines guardrail
npm run format        # prettier --write
npm run format:check  # verify formatting (CI)
npm test              # vitest
npm run build         # production build (also type-checks)
```

Prettier config: `.prettierrc` (single quotes, semicolons, width 120, trailing commas).
Run `npm run format` before committing.
