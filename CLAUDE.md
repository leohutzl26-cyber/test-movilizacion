# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Sistema de Gestión de Transporte Hospitalario" (Movilización) — manages hospital patient/staff transport: trip requests, driver/vehicle assignment, live tracking, and clinical bed-management coordination. UI and domain language are in Spanish (statuses, roles, field names) — keep new code consistent with that.

## Commands

Root (backend/proxy):
```
npm install                 # install root deps
npm run dev                 # nodemon server.js (Express, http://localhost:10000)
npm start                   # node server.js
npm run build                # installs + builds frontend (used by Vercel)
```

Frontend (`frontend/`):
```
cd frontend
npm install
npm start                                       # craco start, http://localhost:3000
CI=true npm run build                           # craco build -> frontend/build
CI=true npm test -- --watchAll=false            # Jest suite (frontend/src/lib/*.test.js)
CI=true npm test -- --watchAll=false api.trips  # a single test file, by name
```

Always check `CI=true npm run build` before pushing: Create React App turns ESLint warnings (unused imports/variables, hook deps) into build errors when `CI=true`, so a build that passes locally without it can still fail on a CI build. Many source files use CRLF line endings; keep them when patching files with scripts.

The only automated tests are the Jest files in `frontend/src/lib/`; the backend has no test runner. The `test-*.js` files in the repo root and in `supabase/` (e.g. `test-login.js`, `supabase/comprehensive-test.js`) are standalone manual scripts run with `node <file>.js` against a real Supabase project, not part of any runner. `tests/` (Python, root) and `tmp/*.py` are leftovers from a prior FastAPI+MongoDB backend and are not part of the current stack.

## Environment

Copy `.env.example` to `.env` at the repo root for the Express server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (required in production; `server.js` throws without it), `FRONTEND_URL`. The frontend needs its own `.env` inside `frontend/` with `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, and optionally `REACT_APP_API_URL` (base URL of the Express proxy; empty means same-origin). The anon key ships in the bundle, so treat it as public.

## Architecture

### The browser does not touch sensitive tables

The anon-key client in `frontend/src/lib/supabase.js` is only allowed to read the public catalogs (`vehicles`, `origins`, `destinations`, `origin_services`) and never writes anything. **`profiles`, `trips`, `audit_logs` and `clinical_staff` are never read or written from the browser** — those tables hold password hashes, personal data, patient data (RUT, diagnosis, bed) and staff RUTs. Everything else goes through the Express app:

`callSupabaseFunction(name, body)` in `frontend/src/lib/supabase-api.js` POSTs to `${REACT_APP_API_URL}/api/<name>` with `Authorization: Bearer <custom JWT>`. `server.js` verifies the JWT into `req.context.user`, then calls `exports.handler(event, context)` of the matching module in `supabase/functions/<name>/index.js` (Lambda-style `(event, context) => {statusCode, body}`; originally Supabase Edge Functions, now plain Node modules). The handler runs with the **service-role key**. A new function must be registered in the `functions` map in `server.js`.

| Function | Purpose |
|---|---|
| `auth-login`, `auth-register`, `auth-change-password` | Custom auth (see below) |
| `profiles` | `me` (own profile + ids of same-department users), `directory` (minimal conductor/personal_clinico list; phone only for admin/coordinador/gestion_camas), `list` (admin) |
| `trips-read` | `list` / `get` / `active`, role-scoped (see Trip visibility) |
| `trips-create`, `trips-assign`, `trips-update-status` | Trip mutations; `trips-update-status` validates the transition map and also saves notes without a status |
| `trips-delete` | Admin only, one trip at a time, audited |
| `clinical-staff` | `list` of the clinical staff catalog for dropdowns (any authenticated role; no RUT column) |
| `audit-logs` | `list` and `create` (browser may only create 4 trip actions; identity comes from the JWT, never the body) |
| `admin-users` | Admin: `create`, `update`, `reset_password`, `set_role`, `set_license`, `delete` |
| `users-approve`, `manage-catalogs`, `stats-dashboard` | Approval, generic catalog CRUD (trips delete is admin-only there too), dashboard stats |

`server.js` also defines two explicit routes: `POST /api/drivers/status` (own shift only; admin/coordinador may change someone else's) and `GET /api/drivers/active` (admin/coordinador/gestion_camas). Rate limits on `/api`: 1500 requests / 15 min per authenticated user (keyed by JWT user id), 200 per IP for anonymous callers, 30 per IP on login/register/change-password.

`frontend/src/lib/api.js` is a legacy REST-shaped shim (`api.get('/trips/...')`, `api.put(...)`) used by most pages. It does not call Express itself: each route string dispatches to `supabaseApi` functions (which call the backend) and some routes still filter client-side after the server's role scoping. To find where a path resolves, read its switch statements.

### Rules that are easy to break

- **Do not add `supabase.from('profiles' | 'trips' | 'audit_logs' | 'clinical_staff')` in `frontend/`.** `no-direct-profiles-access.test.js` fails the test suite if you do (it also bans Realtime subscriptions). Add a read action to a function or reuse `profilesApi` / `tripsApi` / `auditLogsApi` / `clinicalStaffApi`.
- **Never return or log `encrypted_password`.** Pass profile rows through `sinSecretos()` (`supabase/functions/_shared/sanitize.js`) before putting them in a response or in `audit_logs.old_values/new_values`.
- **Authorization lives in the functions, not in RLS.** The browser never sends the custom JWT to PostgREST, so `get_auth_uid()` is NULL there and any RLS policy that depends on it denies everything: a direct browser write to a protected table affects 0 rows **with no error**, and the UI shows success. Never add a "fallback to a direct update" when a backend call fails; let the error reach the screen.
- **Trip visibility is defined once** in `supabase/functions/_shared/trip-scope.js` (`alcanceDe`). Reuse it for any endpoint that returns trips or data derived from them (the per-trip history in `audit-logs` does).

### Auth

Custom, not Supabase Auth: `auth-login`/`auth-register` check/hash passwords with `bcryptjs` against `profiles`, then sign a JWT (`JWT_SECRET`) with `userId/email/role/...`. The frontend keeps it in `localStorage['supabase.auth.token']` (`AuthContext.js`) and decodes it client-side to restore the session. New accounts are created by an admin (`admin-users` `create`) with the default password `123456` and `must_change_password = true`, which forces `ChangePasswordForceScreen`.

### Roles, routing and trip visibility

Roles: `admin`, `coordinador`, `conductor`, `solicitante`, `gestion_camas`, `personal_clinico`, `panel`. `frontend/src/App.js` maps each to a dashboard behind `ProtectedRoute`; sub-pages live in `frontend/src/pages/<area>/*Section.js`.

- `/admin` → `AdminDashboard` · `/manager` → `ShiftManagerDashboard` (coordinador, admin) · `/driver` → `DriverDashboard` · `/requester` → `RequesterDashboard` (also coordinador, admin) · `/gestion-camas` → `GestionCamasDashboard` · `/clinical` → `ClinicalStaffDashboard` (personal_clinico, admin) · `/panel` → `PanelDashboard` (read-only display board)

Which trips `trips-read` returns to each role: admin, coordinador, gestion_camas → all; conductor → own trips plus the pool (`pendiente`/`asignado` without a driver); solicitante → trips of users in their department; personal_clinico → clinical trips assigned to them plus the clinical pool (no confirmed escort); panel → only the `active` action. `get` on a trip outside the scope answers 404.

### Trip & user state machines

Trips: `pendiente → asignado → en_curso → completado`, with `cancelado` and clinical-only `revision_gestor` (gestor de camas visación gate before a clinical trip becomes `pendiente`; a coordinador can return a trip to it). Vehicles: `disponible → en_curso → en_mantenimiento/en_limpieza → disponible`, plus `no_disponible` (production data also contains `fuera_de_servicio`). Users: `pending → approved/rejected`, enforced in `auth-login`. Status changes, edits, user changes and deletions are recorded in `audit_logs` by the backend — when adding a mutation, add the matching audit entry in the function.

### Database

`supabase/schema.sql` is the base schema; `add-*.sql` and `fix-*.sql` are incremental migrations run by hand in the Supabase SQL editor (no migration runner; `supabase/migrate.js` is a one-off data migration). Production is the Supabase project `Movilizacion-HCU` and does not exactly match `schema.sql`: there are no CHECK constraints on `trips.status` / `profiles.status`, `trips.scheduled_date` is `timestamptz` (all values at midnight UTC, queried with `.eq('scheduled_date', 'YYYY-MM-DD')`), and `profiles.role` also allows `personal_clinico`.

Security scripts, each documented in its own header (including rollback); check `pg_policies` to see which ones are applied in production:
- `restrict-profiles-column-select.sql` hides `encrypted_password` from `anon`/`authenticated`; `restrict-profiles-all-access.sql` drops the public read policies on `profiles` (no table-wide REVOKE: 15 policies on other tables subquery `profiles`).
- `restrict-audit-logs-access.sql` drops the public policies on `audit_logs` and revokes `anon`/`authenticated` access; `restrict-trips-read-access.sql` drops the public read policy on `trips`; `restrict-clinical-staff-read-access.sql` drops the public read policy on `clinical_staff`; `scrub-audit-logs-password-hashes.sql` removed password hashes that older code had logged.

**Order matters:** deploy the code that stops using a table from the browser first, then run its SQL. The reverse breaks the live app.

### Deployment

Vercel (`vercel.json`): builds root + `frontend/`, serves `frontend/build`, and rewrites `/api/*` to `api/index.js`, which re-exports the Express `app` from `server.js` (a long-lived server locally, one serverless function per request on Vercel). Production deploys from `main`; branch previews use the **production** database and variables.
