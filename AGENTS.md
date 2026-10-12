# AGENTS.md — Working Rules

[SPEC.md](./SPEC.md) is the single source of truth for this project (a general booking & queue platform; Phase 1 = salons only).

## Project layout

| Path | Stack |
|---|---|
| `/mobile` | Expo (latest SDK), React Navigation, TypeScript, TanStack Query + Zustand |
| `/backend` | Node.js / Express, PostgreSQL, WebSockets |

## Rules

1. **Read SPEC.md first.** Read the whole file before every task or plan.
   - Do not build anything under **Phase 2**, **Later phases** or **Out of Scope**.
   - Anything marked **[OPEN]** is undecided — ask before implementing it.
   - Work one milestone at a time (SPEC §14) and commit after each.
2. **Expo packages:** install with `npx expo install <package>` (never plain `npm install`) so versions match the SDK.
3. **No hard-coded strings:** all UI text goes through i18n (`src/i18n/en.ts`, `si.ts`, `ta.ts`). `en.ts` is the source of truth; `si.ts`/`ta.ts` must have identical keys. Words like "Salon"/"Barber" also come from i18n.
4. **No hard-coded colours:** use semantic theme tokens from `src/theme/colors.ts` only. Raw colours live solely in `src/theme/palette.ts`. Must work in light and dark themes.
5. **Ask before adding new dependencies** — in `/mobile` or `/backend`. State the package and why it's needed, then wait for approval.
6. **Never commit secrets** (API keys, `.env` files, notify.lk credentials, DB passwords, tokens). Secrets live only in backend env vars, are gitignored, and are never shipped in the app. Provide a `.env.example` with placeholder values instead.
7. **Keep salon logic in the salon module:** `modules/salon/*` on the backend and `features/salon/*` on mobile (barber queues, walk-in tokens, commissions, shifts).
   - Generic code uses `Business` / `Branch`, not `Salon`.
   - Don't add salon-specific assumptions to shared code.

## Related conventions from SPEC.md

- App name/slug/support contact come only from `src/config/app.ts` (backend: env/config) — never hard-code them.
- SMS goes through a backend `SmsService` interface (provider: notify.lk).
- Currency is LKR, displayed as `Rs. 500`.
