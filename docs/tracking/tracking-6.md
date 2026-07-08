# Tracking Sheet — Iteration 6

> Date: 2026-07-08
> Scope: frontend-only "clean code" refactor. No behaviour, UX, API, or
> backend changes — a pure restructuring of the Next.js app to split
> large page files into small, single-responsibility components, hooks
> and services, plus formatting/size guardrails.
> Baseline: [`tracking-5.md`](./tracking-5.md). This sheet only covers
> deltas since that document.

---

## 1. What this iteration delivered

| # | Change | Doc touched | Status |
|---|---|---|---|
| 1 | Extracted shared UI primitives into `components/ui/` (`KpiCard`, `Pill`, `Badge`, `Alert`, `FormField`, `FilterChip`, `Stepper`) + `components/icons/` (Bell/Menu/Close) | `coding-standards.md` §3 | ✅ |
| 2 | Added shared hooks in `hooks/` (`useAsync`, `usePolling`, `usePagination`) to remove repeated fetch/poll/pagination boilerplate | `coding-standards.md` §3 | ✅ |
| 3 | Split every large page (`admin/analytics`, `events/[id]`, `admin/events/[id]`, `AppLayout`, `admin/feedback`, `venue`, `notifications`, home, events browse, tickets, checkout, feedback form) into page-local `_hooks/` + `_components/` | `frontend/CONVENTIONS.md` | ✅ |
| 4 | Split `services/api.ts` into per-domain modules (`auth`, `users`, `events`, `orders`, `tickets`, `admin`, `analytics`, `notifications`, `feedback`) behind a shared `http` helper; `api.ts` kept as a barrel so call sites are unchanged | `coding-standards.md` §3.3 | ✅ |
| 5 | Guardrails: ESLint `max-lines` (warn > 120), Prettier config + `format`/`format:check` scripts, `next lint` broadened to all source dirs | `coding-standards.md` §7 | ✅ |
| 6 | New docs: `frontend/CONVENTIONS.md`; refreshed `coding-standards.md` §3 from "React + Vite" to the current Next.js + TypeScript reality | — | ✅ |

## 2. Impact

- **File sizes.** The five largest pages dropped from 290–358 lines to ~40–60-line
  assembly components. Every source file is now under the `max-lines` guardrail
  (effective count, blanks/comments excluded).
- **New files.** ~46 small focused files added (components/hooks/services/utils);
  ~106 TS/TSX source files total.
- **Deduplication.** `KpiCard`, `Step`/`StepLine`, the `{kind,text}` alert banner,
  status pills, the close icon and the nav-link list are each defined once now.
- **Two intentional visual unifications** (not behaviour changes): the two `KpiCard`
  variants (analytics vs. feedback) now share one style, and the checkout/event-detail
  step indicators share one `Stepper`.

## 3. Verification

| Check | Result |
|---|---|
| `npm run build` | ✅ compiles, 17 routes, types valid |
| `npm test` | ✅ 534 passing (added 10 for `utils/chart`, `utils/datetime`) |
| `npm run lint` | ✅ no warnings or errors |
| `npm run format:check` | ✅ clean |

## 4. Notes / follow-ups

- `max-lines` is a **warning** (not an error) so it never fails CI; it nudges toward
  the ~30–60-line target. Test files are exempt via an ESLint override.
- `max-lines-per-function` was intentionally **not** enabled — JSX render functions are
  legitimately long and it would spam warnings across valid components.
- Prettier normalized formatting across the whole frontend in one pass; expect a large
  formatting-only diff on files outside the refactor scope.
